//! `veyonix-core` — agent lifecycle and shared runtime context.
//!
//! This crate owns the long-lived [`AgentContext`] that is threaded through
//! every subsystem.  It also drives the top-level run-loop, waiting for either
//! Ctrl-C or an explicit [`AgentContext::shutdown`] call before performing an
//! orderly teardown.

use std::sync::Arc;

use anyhow::{Context, Result};
use tokio::sync::{broadcast, RwLock};
use tracing::{error, info, warn};
use veyonix_config::AgentConfig;

// ─── State machine ────────────────────────────────────────────────────────────

/// Observable state of the agent process.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AgentState {
    /// The agent is in the process of loading its subsystems.
    Initializing,
    /// All subsystems are active and the agent is healthy.
    Running,
    /// A shutdown signal has been received; subsystems are stopping.
    ShuttingDown,
    /// All subsystems have stopped; the process may exit safely.
    Stopped,
}

// ─── Context ──────────────────────────────────────────────────────────────────

/// Shared, cheaply-cloneable agent context.
///
/// Holds the resolved configuration, current runtime state, and the channel
/// used to broadcast shutdown signals to all subsystem tasks.
#[derive(Clone)]
pub struct AgentContext {
    /// Resolved, validated agent configuration.
    pub config: Arc<AgentConfig>,
    /// Current lifecycle state, readable by any subsystem.
    pub state: Arc<RwLock<AgentState>>,
    /// Sending half of the shutdown broadcast.  Call [`AgentContext::shutdown`]
    /// for the safe, logged wrapper.
    pub shutdown_tx: broadcast::Sender<()>,
}

impl AgentContext {
    /// Create a new [`AgentContext`] from a validated [`AgentConfig`].
    ///
    /// The initial state is [`AgentState::Initializing`].
    pub fn new(config: AgentConfig) -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);

        Self {
            config: Arc::new(config),
            state: Arc::new(RwLock::new(AgentState::Initializing)),
            shutdown_tx,
        }
    }

    /// Subscribe to the shutdown broadcast channel.
    ///
    /// Subsystem tasks should select on the returned receiver and begin their
    /// own orderly teardown when a message arrives.
    pub fn shutdown_receiver(&self) -> broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    /// Send a shutdown signal to all subsystems and mark the state as
    /// [`AgentState::ShuttingDown`].
    ///
    /// This is idempotent; subsequent calls are safe and produce a log warning.
    pub fn shutdown(&self) {
        match self.shutdown_tx.send(()) {
            Ok(n) => info!(receivers = n, "shutdown signal broadcast"),
            Err(_) => warn!("shutdown signal sent but no subsystems were listening"),
        }
    }

    /// Transition the agent state, logging the change.
    async fn set_state(&self, next: AgentState) {
        let mut guard = self.state.write().await;
        info!(previous = ?*guard, next = ?next, "agent state transition");
        *guard = next;
    }

    /// Main run-loop.
    ///
    /// 1. Transitions to [`AgentState::Running`].
    /// 2. Waits for either Ctrl-C or an inbound shutdown signal.
    /// 3. Transitions through [`AgentState::ShuttingDown`] → [`AgentState::Stopped`].
    ///
    /// Returns `Ok(())` on a clean shutdown, or an error if the signal handler
    /// could not be installed.
    pub async fn run(&self) -> Result<()> {
        self.set_state(AgentState::Running).await;
        info!("agent is running — waiting for shutdown signal");

        let mut shutdown_rx = self.shutdown_receiver();

        tokio::select! {
            result = tokio::signal::ctrl_c() => {
                match result {
                    Ok(()) => info!("received Ctrl-C, initiating shutdown"),
                    Err(e) => error!(error = %e, "failed to listen for Ctrl-C"),
                }
            }
            result = shutdown_rx.recv() => {
                match result {
                    Ok(()) => info!("received internal shutdown signal"),
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        warn!(skipped = n, "shutdown receiver lagged; treating as shutdown");
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        info!("shutdown channel closed, exiting");
                    }
                }
            }
        }

        self.set_state(AgentState::ShuttingDown).await;
        info!("performing orderly shutdown");

        // ── Subsystem teardown hooks (extend here as subsystems are added) ──
        self.teardown()
            .await
            .context("error during subsystem teardown")?;

        self.set_state(AgentState::Stopped).await;
        info!("agent stopped cleanly");

        Ok(())
    }

    /// Placeholder for subsystem teardown.
    ///
    /// Add `await`-able teardown calls for each subsystem here as they are
    /// implemented.
    async fn teardown(&self) -> Result<()> {
        // TODO: flush telemetry, close WebSocket, checkpoint policy cache, etc.
        Ok(())
    }
}

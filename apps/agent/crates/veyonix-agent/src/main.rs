//! Veyonix Agent — process entry-point.
//!
//! ```text
//! USAGE:
//!     veyonix-agent <SUBCOMMAND>
//!
//! SUBCOMMANDS:
//!     run        Start the agent daemon
//!     install    Install the agent as a system service
//!     uninstall  Remove the agent system service
//! ```

use std::path::PathBuf;

pub mod service;
pub mod orchestrator;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use tracing::{error, info};

use veyonix_config as config;
use veyonix_core::AgentContext;
use veyonix_logging as logging;
use veyonix_enforcement::EnforcementEngine;
use veyonix_enforcement_website::WebsiteFilterEnforcer;
use veyonix_enforcement_app::AppBlockEnforcer;
use veyonix_enforcement_usb::UsbBlockEnforcer;
use veyonix_enforcement_focus::FocusModeEnforcer;

// ─── Version ─────────────────────────────────────────────────────────────────

/// Compile-time version string sourced from `Cargo.toml`.
const VERSION: &str = env!("CARGO_PKG_VERSION");

// ─── CLI definition ───────────────────────────────────────────────────────────

/// Veyonix native desktop agent.
#[derive(Debug, Parser)]
#[command(
    name = "veyonix-agent",
    version = VERSION,
    about = "Veyonix native desktop agent",
    long_about = None,
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Start the agent daemon (foreground).
    Run(RunArgs),
    /// Install the agent as an OS service (not yet implemented).
    Install,
    /// Remove the agent OS service registration (not yet implemented).
    Uninstall,
}

/// Arguments for the `run` subcommand.
#[derive(Debug, clap::Args)]
pub struct RunArgs {
    /// Path to the agent configuration file.
    ///
    /// If omitted, defaults are loaded from the built-in `agent.default.toml`
    /// and `VEYONIX_*` environment variables.
    #[arg(short, long, value_name = "FILE")]
    pub config: Option<PathBuf>,

    /// Run as a Windows Service.
    #[arg(long)]
    pub service: bool,
}

// ─── Entry-point ─────────────────────────────────────────────────────────────

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Run(args) => cmd_run(args).await,
        Commands::Install => cmd_install(),
        Commands::Uninstall => cmd_uninstall(),
    }
}

// ─── Subcommand handlers ─────────────────────────────────────────────────────

/// `run` subcommand — full agent lifecycle.
async fn cmd_run(args: RunArgs) -> Result<()> {
    if args.service {
        return service::run_as_service(args);
    }

    // 1. Load configuration.
    let cfg = config::load(args.config.as_deref())
        .context("failed to load agent configuration")?;

    // 2. Initialise logging.
    let log_config = logging::LogConfig {
        level: cfg.logging.level.clone(),
        log_dir: cfg.logging.log_dir.clone().into(),
        max_file_size_mb: cfg.logging.max_file_size_mb,
        json_output: cfg.logging.json_output,
    };
    let _log_guard = logging::init(&log_config)
        .context("failed to initialise logging")?;

    // 3. Startup banner.
    info!(version = VERSION, "Veyonix Agent v{VERSION} starting...");
    info!(
        server_url = %cfg.server.base_url,
        log_level   = %cfg.logging.level,
        json_output = cfg.logging.json_output,
        "configuration loaded successfully"
    );

    // 4. Build and register all enforcement modules.
    let mut engine = EnforcementEngine::new();
    engine.register(std::sync::Arc::new(WebsiteFilterEnforcer::new()));
    engine.register(std::sync::Arc::new(AppBlockEnforcer::new()));
    engine.register(std::sync::Arc::new(UsbBlockEnforcer::new()));
    engine.register(std::sync::Arc::new(FocusModeEnforcer::new()));
    let engine = std::sync::Arc::new(engine);
    info!("enforcement engine ready: website_filter | app_block | usb_block | focus_mode");

    // 5. Initialize Storage Engine
    let data_dir = std::path::Path::new(&cfg.storage.data_dir);
    std::fs::create_dir_all(data_dir).context("failed to create storage data_dir")?;
    let enc_key = get_or_create_storage_key(data_dir)?;
    let storage = std::sync::Arc::new(
        veyonix_storage::StorageEngine::open(&data_dir.join("veyonix_db"), enc_key)
            .context("failed to open storage engine")?,
    );
    info!(data_dir = %data_dir.display(), "encrypted storage engine loaded");

    // 6. Build the shared agent context.
    let ctx = AgentContext::new(cfg.clone());

    // 7. Spawn a task that rolls back all enforcers on clean shutdown.
    let engine_clone = engine.clone();
    let mut shutdown_rx = ctx.shutdown_receiver();
    tokio::spawn(async move {
        let _ = shutdown_rx.recv().await;
        info!("enforcement engine: rolling back all active restrictions");
        engine_clone.rollback_all().await;
    });

    // 8. Spawn the Agent Orchestrator to run all background sync/web socket loops
    let orchestrator = orchestrator::AgentOrchestrator::new(cfg, storage, engine)?;
    let shutdown_rx_orchestrator = ctx.shutdown_receiver();
    tokio::spawn(async move {
        if let Err(e) = orchestrator.run(shutdown_rx_orchestrator).await {
            error!(error = %e, "agent orchestrator loop exited with error");
        }
    });

    // 9. Run the main agent loop (blocks until Ctrl-C or shutdown signal).
    ctx.run()
        .await
        .context("agent run-loop exited with an error")?;

    info!("veyonix-agent exiting");
    Ok(())
}

/// Helper to get or generate the database encryption key.
fn get_or_create_storage_key(data_dir: &std::path::Path) -> Result<[u8; 32]> {
    let key_path = data_dir.join("storage.key");
    if key_path.exists() {
        let key_bytes = std::fs::read(&key_path)
            .context("failed to read storage encryption key")?;
        if key_bytes.len() != 32 {
            anyhow::bail!("invalid storage key length: expected 32 bytes");
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(key)
    } else {
        use rand::RngCore;
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        std::fs::write(&key_path, &key)
            .context("failed to write storage encryption key")?;
        Ok(key)
    }
}

/// `install` subcommand — service installation (stub).
fn cmd_install() -> Result<()> {
    println!("install not yet implemented");
    Ok(())
}

/// `uninstall` subcommand — service removal (stub).
fn cmd_uninstall() -> Result<()> {
    println!("uninstall not yet implemented");
    Ok(())
}

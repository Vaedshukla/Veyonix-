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

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use tracing::info;

use veyonix_config as config;
use veyonix_core::AgentContext;
use veyonix_logging as logging;
use veyonix_enforcement::EnforcementEngine;
use veyonix_enforcement_website::WebsiteFilterEnforcer;
use veyonix_enforcement_app::AppBlockEnforcer;
use veyonix_enforcement_usb::UsbBlockEnforcer;

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
    //
    //    ┌────────────────────────────────────────────────┐
    //    │  EnforcementEngine                              │
    //    │  ├── WebsiteFilterEnforcer  (hosts file)        │
    //    │  ├── AppBlockEnforcer       (process monitor)   │
    //    │  └── UsbBlockEnforcer       (registry USBSTOR)  │
    //    └────────────────────────────────────────────────┘
    let mut engine = EnforcementEngine::new();
    engine.register(std::sync::Arc::new(WebsiteFilterEnforcer::new()));
    engine.register(std::sync::Arc::new(AppBlockEnforcer::new()));
    engine.register(std::sync::Arc::new(UsbBlockEnforcer::new()));
    info!("enforcement engine ready: website_filter | app_block | usb_block");

    // 5. Build the shared agent context.
    let ctx = AgentContext::new(cfg);

    // 6. Spawn a task that rolls back all enforcers on clean shutdown.
    let mut shutdown_rx = ctx.shutdown_receiver();
    tokio::spawn(async move {
        let _ = shutdown_rx.recv().await;
        info!("enforcement engine: rolling back all active restrictions");
        engine.rollback_all().await;
    });

    // 7. Run the main agent loop (blocks until Ctrl-C or shutdown signal).
    ctx.run()
        .await
        .context("agent run-loop exited with an error")?;

    info!("veyonix-agent exiting");
    Ok(())
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

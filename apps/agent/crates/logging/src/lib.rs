//! `veyonix-logging` — structured logging initialisation for the Veyonix agent.
//!
//! Call [`init`] once at process startup to configure both a non-blocking
//! rolling-file appender and a stdout layer.

use std::path::PathBuf;

use thiserror::Error;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{
    fmt::{self, time::ChronoLocal},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

// ─── Error ────────────────────────────────────────────────────────────────────

/// Errors that can occur during logging initialisation.
#[derive(Debug, Error)]
pub enum LogError {
    #[error("failed to parse log level filter: {0}")]
    InvalidFilter(#[from] tracing_subscriber::filter::ParseError),

    #[error("log directory is not valid UTF-8")]
    InvalidDirectory,

    #[error("failed to set global tracing subscriber: {0}")]
    InitFailed(#[from] tracing::subscriber::SetGlobalDefaultError),

    #[error("subscriber already initialised: {0}")]
    AlreadyInit(String),
}

// ─── Config ───────────────────────────────────────────────────────────────────

/// Runtime configuration consumed by [`init`].
#[derive(Debug, Clone)]
pub struct LogConfig {
    /// `tracing` directive string, e.g. `"veyonix=debug,info"`.
    pub level: String,
    /// Directory where rolling log files are written.
    pub log_dir: PathBuf,
    /// Maximum size (in MiB) before a new log file is rotated.
    /// Currently used for informational purposes; actual rotation is daily via
    /// `tracing_appender`'s [`RollingFileAppender`].
    pub max_file_size_mb: u64,
    /// Emit newline-delimited JSON instead of human-readable text.
    pub json_output: bool,
}

// ─── Guard ────────────────────────────────────────────────────────────────────

/// Keeps the non-blocking background writer alive.
///
/// Drop this value only when the process is shutting down; dropping it earlier
/// will cause buffered log lines to be silently discarded.
pub struct LogGuard {
    _file_guard: WorkerGuard,
    _stdout_guard: WorkerGuard,
}

// ─── Init ─────────────────────────────────────────────────────────────────────

/// Initialise the global `tracing` subscriber.
///
/// Returns a [`LogGuard`] that must be kept alive for the duration of the
/// process so that background flushing threads do not exit prematurely.
///
/// # Errors
///
/// Returns [`LogError`] if the filter directive cannot be parsed, if the log
/// directory is not valid UTF-8, or if the global subscriber has already been
/// set.
pub fn init(config: &LogConfig) -> Result<LogGuard, LogError> {
    // ── File appender (daily rotation) ──────────────────────────────────────
    let log_dir_str = config
        .log_dir
        .to_str()
        .ok_or(LogError::InvalidDirectory)?;

    let file_appender =
        tracing_appender::rolling::daily(log_dir_str, "veyonix-agent.log");
    let (non_blocking_file, file_guard) = tracing_appender::non_blocking(file_appender);

    // ── Stdout appender ──────────────────────────────────────────────────────
    let (non_blocking_stdout, stdout_guard) = tracing_appender::non_blocking(std::io::stdout());

    // ── Filter ───────────────────────────────────────────────────────────────
    let env_filter = EnvFilter::try_new(&config.level)?;

    // ── Subscriber assembly ──────────────────────────────────────────────────
    // We must branch on `json_output` at this point because the two format
    // flavours produce incompatible types and cannot be unified into a single
    // `Option<Layer<…>>` without boxing every layer.
    if config.json_output {
        let file_layer = fmt::layer()
            .json()
            .with_writer(non_blocking_file)
            .with_ansi(false);

        let stdout_layer = fmt::layer()
            .json()
            .with_writer(non_blocking_stdout)
            .with_ansi(false);

        tracing_subscriber::registry()
            .with(env_filter)
            .with(file_layer)
            .with(stdout_layer)
            .try_init()
            .map_err(|e| LogError::AlreadyInit(e.to_string()))?;
    } else {
        let timer = ChronoLocal::new("%Y-%m-%dT%H:%M:%S%.3f%z".to_owned());

        let file_layer = fmt::layer()
            .with_writer(non_blocking_file)
            .with_ansi(false)
            .with_timer(timer.clone());

        let stdout_layer = fmt::layer()
            .pretty()
            .with_writer(non_blocking_stdout)
            .with_ansi(true)
            .with_timer(timer);

        tracing_subscriber::registry()
            .with(env_filter)
            .with(file_layer)
            .with(stdout_layer)
            .try_init()
            .map_err(|e| LogError::AlreadyInit(e.to_string()))?;
    }

    Ok(LogGuard {
        _file_guard: file_guard,
        _stdout_guard: stdout_guard,
    })
}

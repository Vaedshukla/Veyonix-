//! `veyonix-config` — layered configuration loading for the Veyonix agent.
//!
//! Resolution order (later entries override earlier ones):
//!
//! 1. Compiled-in defaults (`agent.default.toml` read at runtime from the
//!    config directory next to the binary, or the path supplied by the caller).
//! 2. User-supplied config file (TOML).
//! 3. Environment variables with the `VEYONIX_` prefix.

use std::path::{Path, PathBuf};

use config::{Config, ConfigError as RawConfigError, Environment, File};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::debug;
use validator::Validate;

// ─── Error ────────────────────────────────────────────────────────────────────

/// Errors produced by [`load`].
#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("failed to build configuration: {0}")]
    Build(#[from] RawConfigError),

    #[error("configuration validation failed: {0}")]
    Validation(#[from] validator::ValidationErrors),

    #[error("default config file not found at {0}")]
    DefaultFileNotFound(PathBuf),
}

// ─── Sub-structs ──────────────────────────────────────────────────────────────

/// Connection details for the Veyonix control-plane server.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct ServerConfig {
    /// Base HTTP/HTTPS URL for REST API endpoints.
    #[validate(url)]
    pub base_url: String,
    /// WebSocket URL used for real-time event streaming.
    #[validate(url)]
    pub ws_url: String,
    /// Whether to verify the server's TLS certificate.
    pub tls_verify: bool,
}

/// Logging subsystem configuration (mirrors [`veyonix_logging::LogConfig`]).
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct LogConfig {
    /// `tracing` filter directive (e.g. `"veyonix=debug,info"`).
    #[validate(length(min = 1))]
    pub level: String,
    /// Directory where log files are stored.
    #[validate(length(min = 1))]
    pub log_dir: String,
    /// Maximum log-file size before rotation (MiB).
    #[validate(range(min = 1))]
    pub max_file_size_mb: u64,
    /// Emit JSON-structured log lines.
    pub json_output: bool,
}

/// Device enrollment settings.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct EnrollmentConfig {
    /// Pre-provisioned enrollment token (may be injected at build time or via
    /// env var `VEYONIX_ENROLLMENT__TOKEN`).
    pub token: Option<String>,
    /// Number of enrollment retry attempts before giving up.
    #[validate(range(min = 1, max = 100))]
    pub max_retries: u32,
}

/// Heartbeat / keep-alive settings.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct HeartbeatConfig {
    /// Interval between heartbeat messages (seconds).
    #[validate(range(min = 5, max = 3600))]
    pub interval_secs: u64,
}

/// Policy synchronisation settings.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct PolicyConfig {
    /// How often the agent pulls a fresh policy snapshot (seconds).
    #[validate(range(min = 10))]
    pub sync_interval_secs: u64,
    /// Maximum number of policy versions kept in the on-disk cache.
    #[validate(range(min = 1, max = 100))]
    pub max_versions_cached: u32,
}

/// Telemetry / metrics collection settings.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct TelemetryConfig {
    /// Interval between telemetry batch flushes to the server (seconds).
    #[validate(range(min = 5))]
    pub flush_interval_secs: u64,
    /// Maximum in-memory telemetry events before back-pressure is applied.
    #[validate(range(min = 100, max = 100_000))]
    pub max_queue_size: u32,
    /// How frequently metrics are sampled from the host (seconds).
    #[validate(range(min = 1))]
    pub collect_interval_secs: u64,
}

/// Local on-disk storage settings.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(deny_unknown_fields)]
pub struct StorageConfig {
    /// Root directory for all persistent agent data.
    #[validate(length(min = 1))]
    pub data_dir: String,
}

// ─── Root config ─────────────────────────────────────────────────────────────

/// Top-level configuration for the Veyonix agent.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct AgentConfig {
    #[validate(nested)]
    pub server: ServerConfig,
    #[validate(nested)]
    pub logging: LogConfig,
    #[validate(nested)]
    pub enrollment: EnrollmentConfig,
    #[validate(nested)]
    pub heartbeat: HeartbeatConfig,
    #[validate(nested)]
    pub policy: PolicyConfig,
    #[validate(nested)]
    pub telemetry: TelemetryConfig,
    #[validate(nested)]
    pub storage: StorageConfig,
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/// Load and validate the agent configuration.
///
/// Resolution order:
/// 1. `agent.default.toml` in the same directory as the executable.
/// 2. The file at `config_path` (if supplied), overriding defaults.
/// 3. Environment variables prefixed `VEYONIX_`, using `__` as the hierarchy
///    separator (e.g. `VEYONIX_LOGGING__LEVEL=debug`).
///
/// # Errors
///
/// Returns [`ConfigError`] when the config cannot be parsed or validation fails.
pub fn load(config_path: Option<&Path>) -> Result<AgentConfig, ConfigError> {
    // Resolve the default-config path relative to the running binary.
    let default_path = {
        let mut p = std::env::current_exe()
            .unwrap_or_else(|_| PathBuf::from("."))
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join("config")
            .join("agent.default.toml");

        // Fall back to a path relative to the manifest dir during development.
        if !p.exists() {
            p = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap_or_else(|| Path::new("."))
                .parent()
                .unwrap_or_else(|| Path::new("."))
                .join("config")
                .join("agent.default.toml");
        }
        p
    };

    debug!(path = %default_path.display(), "loading default configuration");

    let mut builder = Config::builder()
        // 1. Defaults
        .add_source(File::from(default_path).required(false))
        // 3. Env vars (always applied last so they take highest precedence)
        .add_source(
            Environment::with_prefix("VEYONIX")
                .separator("__")
                .try_parsing(true),
        );

    // 2. Optional user-supplied config file
    if let Some(path) = config_path {
        debug!(path = %path.display(), "layering user configuration file");
        builder = builder.add_source(File::from(path).required(true));
        // Re-add env source so it remains the highest priority layer.
        builder = builder.add_source(
            Environment::with_prefix("VEYONIX")
                .separator("__")
                .try_parsing(true),
        );
    }

    let raw = builder.build()?;
    let cfg: AgentConfig = raw.try_deserialize()?;
    cfg.validate()?;

    Ok(cfg)
}

//! Well-known storage namespace constants.
//!
//! Each constant is used as the first component of a composite sled key:
//! `<namespace>\x00<key>`.

/// Device identity keys (private key bytes, public key PEM, device ID).
pub const IDENTITY: &str = "identity";

/// Policy blobs downloaded from the management server.
pub const POLICIES: &str = "policies";

/// Telemetry events queued for upload.
pub const TELEMETRY_QUEUE: &str = "telemetry_queue";

/// Agent configuration overrides from the server.
pub const CONFIG: &str = "config";

/// Internal metadata (schema version, last-sync timestamps, etc.).
pub const META: &str = "meta";

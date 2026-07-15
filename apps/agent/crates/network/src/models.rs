//! Request / response model types for the Veyonix management API.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------------

/// Body sent to `POST /api/v1/agent/enroll`.
#[derive(Debug, Serialize)]
pub struct EnrollRequest<'a> {
    pub enroll_token: &'a str,
    pub hostname: &'a str,
    pub os: &'a str,
    pub arch: &'a str,
    pub agent_version: &'a str,
}

/// Successful response from `POST /api/v1/agent/enroll`.
#[derive(Debug, Deserialize)]
pub struct EnrollResponse {
    pub device_id: String,
    pub device_secret: String,
    pub organization_id: String,
}

// ---------------------------------------------------------------------------
// Auth — challenge
// ---------------------------------------------------------------------------

/// Body sent to `POST /api/v1/agent/auth/challenge`.
#[derive(Debug, Serialize)]
pub struct ChallengeRequest<'a> {
    pub device_id: &'a str,
}

/// Successful response from `POST /api/v1/agent/auth/challenge`.
#[derive(Debug, Deserialize)]
pub struct ChallengeResponse {
    pub challenge: String,
}

// ---------------------------------------------------------------------------
// Auth — verify
// ---------------------------------------------------------------------------

/// Body sent to `POST /api/v1/agent/auth/verify`.
#[derive(Debug, Serialize)]
pub struct VerifyRequest<'a> {
    pub device_id: &'a str,
    pub signature: &'a str,
}

/// Successful response from `POST /api/v1/agent/auth/verify`.
#[derive(Debug, Deserialize)]
pub struct AuthResponse {
    pub token: String,
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

/// Body sent to `POST /api/v1/agent/heartbeat`.
#[derive(Debug, Serialize)]
pub struct HeartbeatRequest<'a> {
    pub device_id: &'a str,
    pub status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_hash: Option<&'a str>,
}

// ---------------------------------------------------------------------------
// Policy sync
// ---------------------------------------------------------------------------

/// Result of a policy GET request.
///
/// - [`PolicySyncResult::NotModified`] — server returned 304; local cache is
///   still current.
/// - [`PolicySyncResult::Updated`] — server returned 200 with a new policy
///   payload and a fresh ETag.
#[derive(Debug)]
pub enum PolicySyncResult {
    NotModified,
    Updated {
        payload: serde_json::Value,
        etag: String,
    },
}

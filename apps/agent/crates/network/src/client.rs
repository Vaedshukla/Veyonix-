//! `ApiClient` — the main HTTP client for the Veyonix management server.

use std::sync::Arc;
use std::time::Duration;

use reqwest::{
    header::{HeaderMap, HeaderValue, AUTHORIZATION, IF_NONE_MATCH},
    StatusCode,
};
use tokio::sync::RwLock;
use tracing::{debug, instrument};

use crate::{
    error::NetworkError,
    models::{
        AuthResponse, ChallengeRequest, ChallengeResponse, EnrollRequest, EnrollResponse,
        HeartbeatRequest, PolicySyncResult, VerifyRequest,
    },
    retry::{with_retry, RetryConfig},
};

/// Default connect / read timeout applied to every request.
const DEFAULT_TIMEOUT_SECS: u64 = 30;

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

/// Async HTTP client for the Veyonix management API.
///
/// Internally holds a `reqwest::Client` (connection-pool, TLS, timeouts) and a
/// thread-safe bearer token that can be updated after authentication.
#[derive(Clone)]
pub struct ApiClient {
    client: reqwest::Client,
    base_url: String,
    /// Holds the current JWT bearer token (or `None` before authentication).
    token: Arc<RwLock<Option<String>>>,
    retry_config: Arc<RetryConfig>,
}

impl ApiClient {
    /// Construct a new `ApiClient` pointing at `base_url`.
    ///
    /// # Errors
    /// Returns [`NetworkError::ClientBuild`] if `reqwest` fails to initialise
    /// (e.g. the TLS backend cannot be loaded).
    pub fn new(base_url: &str) -> Result<ApiClient, NetworkError> {
        let client = reqwest::Client::builder()
            .use_rustls_tls()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .map_err(NetworkError::ClientBuild)?;

        Ok(ApiClient {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
            token: Arc::new(RwLock::new(None)),
            retry_config: Arc::new(RetryConfig::default()),
        })
    }

    // -----------------------------------------------------------------------
    // Token management
    // -----------------------------------------------------------------------

    /// Store a JWT bearer token so subsequent requests include it.
    pub fn set_token(&self, token: String) {
        // We use a blocking write here so callers don't need to be async.
        // The lock is uncontended in normal use.
        let token_arc = self.token.clone();
        tokio::task::block_in_place(|| {
            let rt = tokio::runtime::Handle::current();
            rt.block_on(async move {
                *token_arc.write().await = Some(token);
            });
        });
    }

    /// Build an `Authorization: Bearer <token>` header map if a token is set.
    async fn auth_headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        if let Some(tok) = self.token.read().await.as_deref() {
            if let Ok(val) = HeaderValue::from_str(&format!("Bearer {tok}")) {
                headers.insert(AUTHORIZATION, val);
            }
        }
        headers
    }

    // -----------------------------------------------------------------------
    // Internal HTTP helpers
    // -----------------------------------------------------------------------

    /// POST a serialisable body and deserialise the JSON response.
    async fn post_json<B, R>(&self, path: &str, body: &B) -> Result<R, NetworkError>
    where
        B: serde::Serialize,
        R: serde::de::DeserializeOwned,
    {
        let url = format!("{}{}", self.base_url, path);
        let headers = self.auth_headers().await;

        debug!(url = %url, "POST");

        let response = self
            .client
            .post(&url)
            .headers(headers)
            .json(body)
            .send()
            .await
            .map_err(NetworkError::Transport)?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(NetworkError::Http {
                status: status.as_u16(),
                body: body_text,
            });
        }

        response
            .json::<R>()
            .await
            .map_err(NetworkError::Deserialisation)
    }

    // -----------------------------------------------------------------------
    // Public API methods
    // -----------------------------------------------------------------------

    /// Enrol this device with the management server.
    ///
    /// `POST /api/v1/agent/enroll`
    #[instrument(skip(self, token), fields(hostname))]
    pub async fn enroll(
        &self,
        token: &str,
        hostname: &str,
        os: &str,
        arch: &str,
        agent_version: &str,
    ) -> Result<EnrollResponse, NetworkError> {
        let body = EnrollRequest {
            enroll_token: token,
            hostname,
            os,
            arch,
            agent_version,
        };
        let config = self.retry_config.clone();
        let client = self.clone();
        with_retry(&config, "enroll", || async {
            client.post_json("/api/v1/agent/enroll", &body).await
        })
        .await
    }

    /// Request an HMAC challenge for the given device.
    ///
    /// `POST /api/v1/agent/auth/challenge`
    #[instrument(skip(self), fields(device_id))]
    pub async fn auth_challenge(
        &self,
        device_id: &str,
    ) -> Result<ChallengeResponse, NetworkError> {
        let body = ChallengeRequest { device_id };
        let config = self.retry_config.clone();
        let client = self.clone();
        with_retry(&config, "auth_challenge", || async {
            client
                .post_json("/api/v1/agent/auth/challenge", &body)
                .await
        })
        .await
    }

    /// Submit an HMAC-signed challenge response and obtain a JWT.
    ///
    /// `POST /api/v1/agent/auth/verify`
    #[instrument(skip(self, signature), fields(device_id))]
    pub async fn auth_verify(
        &self,
        device_id: &str,
        signature: &str,
    ) -> Result<AuthResponse, NetworkError> {
        let body = VerifyRequest {
            device_id,
            signature,
        };
        let config = self.retry_config.clone();
        let client = self.clone();
        with_retry(&config, "auth_verify", || async {
            client
                .post_json("/api/v1/agent/auth/verify", &body)
                .await
        })
        .await
    }

    /// Send a heartbeat to the management server.
    ///
    /// `POST /api/v1/agent/heartbeat`
    #[instrument(skip(self, body))]
    pub async fn heartbeat(
        &self,
        body: &HeartbeatRequest,
    ) -> Result<(), NetworkError> {
        let url = format!("{}/api/v1/agent/heartbeat", self.base_url);
        let headers = self.auth_headers().await;
        debug!(url = %url, "POST heartbeat");

        let response = self
            .client
            .post(&url)
            .headers(headers)
            .json(body)
            .send()
            .await
            .map_err(NetworkError::Transport)?;

        let status_code = response.status();
        if !status_code.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(NetworkError::Http {
                status: status_code.as_u16(),
                body: body_text,
            });
        }
        Ok(())
    }

    /// Fetch the current policy, using `If-None-Match` for conditional GET.
    ///
    /// `GET /api/v1/agent/policy`
    ///
    /// Returns [`PolicySyncResult::NotModified`] on HTTP 304 (ETag matched) or
    /// [`PolicySyncResult::Updated`] on HTTP 200 with the new policy payload
    /// and ETag.
    #[instrument(skip(self), fields(device_id))]
    pub async fn get_policy(
        &self,
        device_id: &str,
        etag: Option<&str>,
    ) -> Result<PolicySyncResult, NetworkError> {
        let url = format!(
            "{}/api/v1/agent/policy?device_id={}",
            self.base_url, device_id
        );
        let mut headers = self.auth_headers().await;
        if let Some(tag) = etag {
            if let Ok(val) = HeaderValue::from_str(tag) {
                headers.insert(IF_NONE_MATCH, val);
            }
        }
        debug!(url = %url, etag = ?etag, "GET policy");

        let config = self.retry_config.clone();
        let client_clone = self.clone();
        let device_id = device_id.to_string();
        let etag_owned = etag.map(str::to_string);

        with_retry(&config, "get_policy", || {
            let client_clone = client_clone.clone();
            let device_id = device_id.clone();
            let etag_owned = etag_owned.clone();
            async move {
                let url = format!(
                    "{}/api/v1/agent/policy?device_id={}",
                    client_clone.base_url, device_id
                );
                let mut hdrs = client_clone.auth_headers().await;
                if let Some(ref tag) = etag_owned {
                    if let Ok(val) = HeaderValue::from_str(tag) {
                        hdrs.insert(IF_NONE_MATCH, val);
                    }
                }

                let response = client_clone
                    .client
                    .get(&url)
                    .headers(hdrs)
                    .send()
                    .await
                    .map_err(NetworkError::Transport)?;

                match response.status() {
                    StatusCode::NOT_MODIFIED => Ok(PolicySyncResult::NotModified),
                    s if s.is_success() => {
                        let new_etag = response
                            .headers()
                            .get("etag")
                            .and_then(|v| v.to_str().ok())
                            .unwrap_or("")
                            .to_string();
                        let payload: serde_json::Value = response
                            .json()
                            .await
                            .map_err(NetworkError::Deserialisation)?;
                        Ok(PolicySyncResult::Updated {
                            payload,
                            etag: new_etag,
                        })
                    }
                    s => {
                        let body = response.text().await.unwrap_or_default();
                        Err(NetworkError::Http {
                            status: s.as_u16(),
                            body,
                        })
                    }
                }
            }
        })
        .await
    }
}

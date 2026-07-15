use tokio::{sync::mpsc, time};
use tracing::{info, warn};

use crate::{connection::connect_and_run, message::WireMessage};

/// Parameters controlling the exponential back-off strategy used when
/// reconnecting after a dropped WebSocket connection.
#[derive(Debug, Clone)]
pub struct ReconnectPolicy {
    /// Delay (ms) before the first reconnection attempt.
    pub base_delay_ms: u64,
    /// Upper bound (ms) on the back-off delay.
    pub max_delay_ms: u64,
    /// Multiplicative factor applied to the delay after each failure.
    /// Values in the range `1.5`–`2.0` are typical.
    pub backoff_factor: f64,
}

impl Default for ReconnectPolicy {
    fn default() -> Self {
        Self {
            base_delay_ms: 1_000,
            max_delay_ms: 30_000,
            backoff_factor: 2.0,
        }
    }
}

/// Runs [`connect_and_run`] in an infinite loop, applying exponential
/// back-off between successive reconnection attempts.
///
/// The function never returns on its own; it is intended to be run inside a
/// Tokio task that is cancelled externally (via `JoinHandle::abort()` or a
/// `tokio::select!` guard).
///
/// # Back-off behaviour
/// After the first failure the wait is `base_delay_ms`.  Each subsequent
/// failure multiplies the delay by `backoff_factor`, capped at
/// `max_delay_ms`.  A successful connection resets the delay back to
/// `base_delay_ms`.
pub async fn run_with_reconnect(
    url: String,
    token: String,
    tx: mpsc::Sender<WireMessage>,
    policy: ReconnectPolicy,
) {
    let mut delay_ms = policy.base_delay_ms;
    let mut attempt: u32 = 0;

    loop {
        if attempt > 0 {
            warn!(
                attempt = attempt,
                delay_ms = delay_ms,
                url = %url,
                "WebSocket disconnected — reconnecting after delay"
            );
            time::sleep(time::Duration::from_millis(delay_ms)).await;
        }

        attempt += 1;
        info!(attempt = attempt, url = %url, "starting WebSocket connection attempt");

        match connect_and_run(&url, &token, tx.clone()).await {
            Ok(()) => {
                // Clean close — reset the back-off as if the connection was healthy.
                info!(url = %url, "WebSocket connection closed cleanly; will reconnect");
                delay_ms = policy.base_delay_ms;
            }
            Err(e) => {
                warn!(
                    error = %e,
                    attempt = attempt,
                    "WebSocket connection failed"
                );

                // Advance the exponential back-off, clamped to `max_delay_ms`.
                let next = (delay_ms as f64 * policy.backoff_factor) as u64;
                delay_ms = next.min(policy.max_delay_ms);
            }
        }
    }
}

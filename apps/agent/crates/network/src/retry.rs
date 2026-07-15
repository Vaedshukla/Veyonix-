//! Exponential-backoff retry helper.

use std::time::Duration;
use tokio::time::sleep;
use tracing::warn;

use crate::NetworkError;

/// Configuration for the retry policy.
pub struct RetryConfig {
    /// Maximum number of attempts (including the first).
    pub max_attempts: u32,
    /// Base delay for the first retry.
    pub base_delay: Duration,
    /// Multiplicative factor applied to the delay after each failure.
    pub backoff_factor: f64,
    /// Hard cap on the delay between retries.
    pub max_delay: Duration,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 4,
            base_delay: Duration::from_millis(500),
            backoff_factor: 2.0,
            max_delay: Duration::from_secs(30),
        }
    }
}

/// Execute an async operation with exponential backoff.
///
/// `op` is a closure that returns a `Future<Output = Result<T, NetworkError>>`.
/// The closure is retried up to `config.max_attempts` times, sleeping between
/// each attempt according to the backoff schedule.  Only errors for which
/// [`NetworkError::is_retryable`] returns `true` trigger a retry.
pub async fn with_retry<F, Fut, T>(
    config: &RetryConfig,
    op_name: &str,
    mut op: F,
) -> Result<T, NetworkError>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, NetworkError>>,
{
    let mut attempt = 0u32;
    let mut delay = config.base_delay;

    loop {
        attempt += 1;
        match op().await {
            Ok(val) => return Ok(val),
            Err(err) if attempt >= config.max_attempts || !err.is_retryable() => {
                if attempt > 1 {
                    return Err(NetworkError::RetriesExhausted {
                        attempts: attempt,
                        last_error: Box::new(err),
                    });
                }
                return Err(err);
            }
            Err(err) => {
                warn!(
                    op = op_name,
                    attempt,
                    delay_ms = delay.as_millis(),
                    error = %err,
                    "transient error — retrying"
                );
                sleep(delay).await;
                // Cap the delay.
                delay = Duration::from_millis(
                    (((delay.as_millis() as f64 * config.backoff_factor) as u128)
                        .min(config.max_delay.as_millis())) as u64,
                );
            }
        }
    }
}

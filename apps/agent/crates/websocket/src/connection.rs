use std::time::{SystemTime, UNIX_EPOCH};

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

use crate::{
    error::WsError,
    message::WireMessage,
};

/// Maximum allowed clock skew between message timestamp and local clock (milliseconds).
const MAX_TIMESTAMP_SKEW_MS: i64 = 30_000;

/// A configured WebSocket connection (url + auth token).
///
/// Use [`connect_and_run`] to actually establish the connection and start
/// pumping messages.
pub struct WsConnection {
    pub url: String,
    pub token: String,
}

impl WsConnection {
    /// Creates a new connection descriptor.
    pub fn new(url: impl Into<String>, token: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            token: token.into(),
        }
    }
}

/// Returns the current Unix epoch time in milliseconds.
fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before UNIX_EPOCH")
        .as_millis() as i64
}

/// Connects to `url` using the bearer `token`, then streams incoming
/// [`WireMessage`]s through `tx` until the connection closes.
///
/// # Replay protection
/// Messages whose `timestamp_ms` differs from the local clock by more than
/// 30 seconds are silently dropped with a warning log.
///
/// # Returns
/// - `Ok(())` when the server sends a clean close frame.
/// - `Err(WsError::Connect(...))` if the handshake fails.
/// - `Err(WsError::Parse(...))` if an unrecoverable parse error occurs.
/// - `Err(WsError::Send(...))` if the internal channel is closed.
pub async fn connect_and_run(
    url: &str,
    token: &str,
    tx: mpsc::Sender<WireMessage>,
) -> Result<(), WsError> {
    // Build the request with an Authorization header.
    let request = {
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        let mut req = url
            .into_client_request()
            .map_err(|e| WsError::Connect(e.to_string()))?;
        req.headers_mut().insert(
            "Authorization",
            format!("Bearer {token}")
                .parse()
                .map_err(|e: tokio_tungstenite::tungstenite::http::header::InvalidHeaderValue| {
                    WsError::Connect(e.to_string())
                })?,
        );
        req
    };

    info!(url = %url, "connecting to WebSocket endpoint");

    let (ws_stream, _response) = connect_async(request)
        .await
        .map_err(|e| WsError::Connect(e.to_string()))?;

    info!(url = %url, "WebSocket connection established");

    let (_write, mut read) = ws_stream.split();

    loop {
        match read.next().await {
            Some(Ok(Message::Text(text))) => {
                debug!(raw = %text, "received text frame");

                // Deserialize the wire message.
                let wire_msg: WireMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(e) => {
                        warn!(error = %e, "failed to deserialize WireMessage; dropping frame");
                        continue;
                    }
                };

                // Replay-attack protection: reject stale / future-dated messages.
                let skew = (now_ms() - wire_msg.timestamp_ms).abs();
                if skew > MAX_TIMESTAMP_SKEW_MS {
                    warn!(
                        id = %wire_msg.id,
                        timestamp_ms = wire_msg.timestamp_ms,
                        skew_ms = skew,
                        "dropping message: timestamp out of acceptable window"
                    );
                    continue;
                }

                // Forward to the consumer.
                if let Err(e) = tx.send(wire_msg).await {
                    error!(error = %e, "message channel closed; aborting connection");
                    return Err(WsError::Send(e.to_string()));
                }
            }

            Some(Ok(Message::Binary(_))) => {
                warn!("received unexpected binary frame; ignoring");
            }

            Some(Ok(Message::Ping(_))) => {
                // tungstenite auto-responds to pings; nothing to do here.
                debug!("received ping frame (auto-pong sent by tungstenite)");
            }

            Some(Ok(Message::Pong(_))) => {
                debug!("received pong frame");
            }

            Some(Ok(Message::Close(frame))) => {
                info!(frame = ?frame, "server sent close frame; closing connection");
                return Ok(());
            }

            Some(Ok(Message::Frame(_))) => {
                // Raw frame — should not appear in normal operation.
                debug!("received raw frame; ignoring");
            }

            Some(Err(e)) => {
                error!(error = %e, "WebSocket stream error");
                return Err(WsError::Connect(e.to_string()));
            }

            None => {
                info!("WebSocket stream ended (EOF)");
                return Ok(());
            }
        }
    }
}

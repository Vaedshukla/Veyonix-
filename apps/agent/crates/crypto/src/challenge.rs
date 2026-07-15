//! HMAC-SHA256 challenge signing via `ring`.

use ring::hmac;

use crate::CryptoError;

/// Compute an HMAC-SHA256 over `message` keyed with `secret` and return the
/// result as a lowercase hex-encoded string.
///
/// # Errors
/// Currently infallible in `ring`, but returns [`CryptoError::HmacError`] for
/// forward-compatibility if the underlying library adds error paths.
pub fn sign_hmac(secret: &[u8], message: &[u8]) -> Result<String, CryptoError> {
    let key = hmac::Key::new(hmac::HMAC_SHA256, secret);
    let tag = hmac::sign(&key, message);
    Ok(hex::encode(tag.as_ref()))
}

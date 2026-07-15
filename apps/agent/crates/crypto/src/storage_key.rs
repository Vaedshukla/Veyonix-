//! HKDF-SHA256 key derivation for storage encryption keys.

use hkdf::Hkdf;
use sha2::Sha256;

use crate::CryptoError;

/// Derive a 32-byte AES-256 key from `master_secret` using HKDF-SHA256.
///
/// `info` is the application-specific context string (e.g. `b"veyonix-storage-v1"`).
///
/// # Errors
/// Returns [`CryptoError::KeyDerivation`] if HKDF expand fails (output too long).
pub fn derive_key(master_secret: &[u8], info: &[u8]) -> Result<[u8; 32], CryptoError> {
    // No salt → use the zero-length salt, which HKDF treats as a block of zeros.
    let hk = Hkdf::<Sha256>::new(None, master_secret);
    let mut okm = [0u8; 32];
    hk.expand(info, &mut okm)
        .map_err(|e| CryptoError::KeyDerivation(e.to_string()))?;
    Ok(okm)
}

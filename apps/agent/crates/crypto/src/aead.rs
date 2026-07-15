//! AES-256-GCM authenticated encryption / decryption.
//!
//! The wire format is:
//!   `[ 12-byte random nonce | ciphertext + 16-byte GCM tag ]`

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};

use crate::CryptoError;

/// Nonce length for AES-256-GCM (96 bits / 12 bytes).
const NONCE_LEN: usize = 12;

/// Encrypt `plaintext` with AES-256-GCM using the provided 32-byte `key`.
///
/// A fresh random 12-byte nonce is generated for every call and prepended to
/// the returned ciphertext so the receiver can extract it before decrypting.
///
/// # Errors
/// Returns [`CryptoError::InvalidKeyLength`] if `key` is not 32 bytes, or
/// [`CryptoError::Encryption`] on cipher failure.
#[allow(deprecated)]
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| CryptoError::Encryption(e.to_string()))?;

    let mut output = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    output.extend_from_slice(&nonce);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}

/// Decrypt a blob produced by [`encrypt`].
///
/// Expects the first 12 bytes to be the nonce, followed by the ciphertext +
/// GCM authentication tag.
///
/// # Errors
/// Returns [`CryptoError::CiphertextTooShort`] if the input is shorter than
/// the nonce, or [`CryptoError::Decryption`] on authentication / padding failure.
#[allow(deprecated)]
pub fn decrypt(key: &[u8; 32], ciphertext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if ciphertext.len() < NONCE_LEN {
        return Err(CryptoError::CiphertextTooShort);
    }

    let (nonce_bytes, ct) = ciphertext.split_at(NONCE_LEN);
    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ct)
        .map_err(|e| CryptoError::Decryption(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let key = [0xABu8; 32];
        let plaintext = b"hello veyonix";
        let ct = encrypt(&key, plaintext).expect("encrypt");
        let pt = decrypt(&key, &ct).expect("decrypt");
        assert_eq!(pt, plaintext);
    }

    #[test]
    fn wrong_key_fails() {
        let key1 = [0x01u8; 32];
        let key2 = [0x02u8; 32];
        let ct = encrypt(&key1, b"secret").expect("encrypt");
        assert!(decrypt(&key2, &ct).is_err());
    }

    #[test]
    fn too_short_ciphertext() {
        let key = [0u8; 32];
        assert!(matches!(
            decrypt(&key, &[0u8; 5]),
            Err(CryptoError::CiphertextTooShort)
        ));
    }
}

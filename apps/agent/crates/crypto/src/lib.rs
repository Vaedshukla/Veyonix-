//! `veyonix-crypto` — cryptographic primitives for the Veyonix agent.
//!
//! Provides:
//! - P-256 device identity key generation
//! - HMAC-SHA256 challenge signing
//! - HKDF-SHA256 key derivation
//! - AES-256-GCM authenticated encryption / decryption

pub mod aead;
pub mod challenge;
pub mod identity;
pub mod storage_key;

pub use aead::{decrypt, encrypt};
pub use challenge::sign_hmac;
pub use identity::{generate, DeviceIdentity};
pub use storage_key::derive_key;

use thiserror::Error;

/// Unified error type for all crypto operations.
#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("key generation failed: {0}")]
    KeyGeneration(String),

    #[error("HMAC signing failed: {0}")]
    HmacError(String),

    #[error("key derivation failed: {0}")]
    KeyDerivation(String),

    #[error("encryption failed: {0}")]
    Encryption(String),

    #[error("decryption failed: {0}")]
    Decryption(String),

    #[error("invalid key length: expected {expected}, got {got}")]
    InvalidKeyLength { expected: usize, got: usize },

    #[error("ciphertext too short to contain nonce")]
    CiphertextTooShort,

    #[error("serialisation error: {0}")]
    Serialisation(String),
}

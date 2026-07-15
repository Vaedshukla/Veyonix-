//! `veyonix-storage` — encrypted key-value storage engine for the Veyonix agent.
//!
//! Built on [`sled`] with inline AES-256-GCM (nonce-prepended) encryption so
//! this crate remains independent of `veyonix-crypto`.

pub mod namespaces;

use std::path::Path;

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use zeroize::Zeroizing;

/// Well-known namespace constants — import from [`namespaces`].
pub use namespaces::*;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Errors that can be produced by the storage engine.
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("sled database error: {0}")]
    Sled(#[from] sled::Error),

    #[error("serialisation error: {0}")]
    Serialisation(#[from] serde_json::Error),

    #[error("encryption failed: {0}")]
    Encryption(String),

    #[error("decryption failed: {0}")]
    Decryption(String),

    #[error("ciphertext too short to contain a nonce")]
    CiphertextTooShort,
}

// ---------------------------------------------------------------------------
// Nonce size constant
// ---------------------------------------------------------------------------

const NONCE_LEN: usize = 12;

// ---------------------------------------------------------------------------
// Inline AES-256-GCM helpers (copied logic to avoid circular dependency)
// ---------------------------------------------------------------------------

/// Encrypt `plaintext` with AES-256-GCM.  
/// Wire format: `[ 12-byte nonce | ciphertext + 16-byte tag ]`
#[allow(deprecated)]
fn aes_encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, StorageError> {
    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ct = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| StorageError::Encryption(e.to_string()))?;
    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Decrypt a blob produced by [`aes_encrypt`].
#[allow(deprecated)]
fn aes_decrypt(key: &[u8; 32], ciphertext: &[u8]) -> Result<Vec<u8>, StorageError> {
    if ciphertext.len() < NONCE_LEN {
        return Err(StorageError::CiphertextTooShort);
    }
    let (nonce_bytes, ct) = ciphertext.split_at(NONCE_LEN);
    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ct)
        .map_err(|e| StorageError::Decryption(e.to_string()))
}

// ---------------------------------------------------------------------------
// StorageEngine
// ---------------------------------------------------------------------------

/// Encrypted key-value storage engine backed by `sled`.
///
/// Every value is AES-256-GCM encrypted before being written to the on-disk
/// database.  The 32-byte encryption key is held in a [`Zeroizing`] wrapper
/// so it is cleared from memory when this struct is dropped.
pub struct StorageEngine {
    db: sled::Db,
    enc_key: Zeroizing<[u8; 32]>,
}

impl StorageEngine {
    /// Open (or create) a `sled` database at `path` encrypted with `enc_key`.
    pub fn open(path: &Path, enc_key: [u8; 32]) -> Result<StorageEngine, StorageError> {
        let db = sled::open(path)?;
        Ok(StorageEngine {
            db,
            enc_key: Zeroizing::new(enc_key),
        })
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Compose the sled key from `namespace` and `key`.
    fn composite_key(namespace: &str, key: &str) -> Vec<u8> {
        // Format: "namespace\x00key" — the null byte prevents namespace
        // "foo" + key "bar" from colliding with namespace "foobar" + key "".
        let mut k = namespace.as_bytes().to_vec();
        k.push(0x00);
        k.extend_from_slice(key.as_bytes());
        k
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /// Encrypt and persist a raw byte slice.
    pub fn set(&self, namespace: &str, key: &str, value: &[u8]) -> Result<(), StorageError> {
        let encrypted = aes_encrypt(&self.enc_key, value)?;
        self.db.insert(Self::composite_key(namespace, key), encrypted)?;
        Ok(())
    }

    /// Retrieve and decrypt a raw byte slice.  
    /// Returns `None` if the key does not exist.
    pub fn get(&self, namespace: &str, key: &str) -> Result<Option<Vec<u8>>, StorageError> {
        match self.db.get(Self::composite_key(namespace, key))? {
            None => Ok(None),
            Some(ivec) => {
                let plaintext = aes_decrypt(&self.enc_key, &ivec)?;
                Ok(Some(plaintext))
            }
        }
    }

    /// Serialise `val` as JSON, encrypt, and persist.
    pub fn set_json<T: Serialize>(
        &self,
        ns: &str,
        key: &str,
        val: &T,
    ) -> Result<(), StorageError> {
        let bytes = serde_json::to_vec(val)?;
        self.set(ns, key, &bytes)
    }

    /// Retrieve, decrypt, and deserialise a JSON value.  
    /// Returns `None` if the key does not exist.
    pub fn get_json<T: for<'de> Deserialize<'de>>(
        &self,
        ns: &str,
        key: &str,
    ) -> Result<Option<T>, StorageError> {
        match self.get(ns, key)? {
            None => Ok(None),
            Some(bytes) => {
                let val: T = serde_json::from_slice(&bytes)?;
                Ok(Some(val))
            }
        }
    }

    /// Remove a key from storage.  No-op if the key does not exist.
    pub fn delete(&self, namespace: &str, key: &str) -> Result<(), StorageError> {
        self.db.remove(Self::composite_key(namespace, key))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_encrypt_decrypt() {
        let key = [0x42u8; 32];
        let plaintext = b"veyonix encrypted storage test";
        let ct = aes_encrypt(&key, plaintext).expect("encrypt should succeed");
        assert!(ct.len() > plaintext.len());
        let pt = aes_decrypt(&key, &ct).expect("decrypt should succeed");
        assert_eq!(pt, plaintext);
    }

    #[test]
    fn wrong_key_fails() {
        let key1 = [0x01u8; 32];
        let key2 = [0x02u8; 32];
        let ct = aes_encrypt(&key1, b"secret").expect("encrypt");
        assert!(aes_decrypt(&key2, &ct).is_err());
    }

    #[test]
    fn too_short_ciphertext() {
        let key = [0u8; 32];
        assert!(matches!(
            aes_decrypt(&key, &[0u8; 5]),
            Err(StorageError::CiphertextTooShort)
        ));
    }
}

//! P-256 device identity key generation.

use p256::{
    ecdsa::SigningKey,
    pkcs8::{EncodePrivateKey, LineEnding},
};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::CryptoError;

/// A P-256 ECDSA device identity containing the raw private key bytes
/// (zeroized on drop) and the DER-encoded public key in PEM format.
#[derive(Serialize, Deserialize)]
pub struct DeviceIdentity {
    /// Raw 32-byte private scalar, wrapped in `Zeroizing` so memory is
    /// cleared when this value is dropped.
    #[serde(with = "zeroizing_bytes_serde")]
    pub private_key_bytes: Zeroizing<Vec<u8>>,

    /// PKCS#8 PEM-encoded public key (SubjectPublicKeyInfo).
    pub public_key_pem: String,
}

/// Generate a fresh P-256 ECDSA keypair for device identity.
///
/// # Errors
/// Returns [`CryptoError::KeyGeneration`] if the keypair cannot be created or
/// if PEM encoding fails.
pub fn generate() -> Result<DeviceIdentity, CryptoError> {
    let signing_key = SigningKey::random(&mut OsRng);

    // Encode private key to PKCS#8 PEM so we store a stable, portable format.
    let private_key_pem = signing_key
        .to_pkcs8_pem(LineEnding::LF)
        .map_err(|e| CryptoError::KeyGeneration(e.to_string()))?;

    // Keep the raw 32-byte scalar as Zeroizing bytes for downstream use.
    let private_key_bytes: Zeroizing<Vec<u8>> =
        Zeroizing::new(signing_key.to_bytes().to_vec());

    // Derive the verifying (public) key and encode as PKCS#8 PEM.
    let verifying_key = signing_key.verifying_key();
    let public_key_pem = {
        use p256::pkcs8::EncodePublicKey;
        verifying_key
            .to_public_key_pem(LineEnding::LF)
            .map_err(|e| CryptoError::KeyGeneration(e.to_string()))?
    };

    // Explicitly drop the PEM string to clear it from memory; we only keep
    // the raw scalar bytes.
    drop(private_key_pem);

    Ok(DeviceIdentity {
        private_key_bytes,
        public_key_pem,
    })
}

// ---------------------------------------------------------------------------
// Private serde helper so Zeroizing<Vec<u8>> round-trips through JSON as a
// base64 string without exposing the raw bytes in a plain Vec.
// ---------------------------------------------------------------------------
mod zeroizing_bytes_serde {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use zeroize::Zeroizing;

    pub fn serialize<S>(val: &Zeroizing<Vec<u8>>, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // Encode as hex so it survives JSON round-trips cleanly.
        hex::encode(val.as_slice()).serialize(s)
    }

    pub fn deserialize<'de, D>(d: D) -> Result<Zeroizing<Vec<u8>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let hex_str = String::deserialize(d)?;
        let bytes = hex::decode(&hex_str).map_err(serde::de::Error::custom)?;
        Ok(Zeroizing::new(bytes))
    }
}

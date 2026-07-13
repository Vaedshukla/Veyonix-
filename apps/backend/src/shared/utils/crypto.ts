import * as crypto from 'crypto';

/**
 * Cryptographic helpers for desktop agent certificate validation.
 * Uses ECDSA P-256 (prime256v1 / secp256r1) for high-performance signatures.
 */

/**
 * Generate a new ECDSA P-256 key pair.
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/**
 * Verify a P-256 signature.
 * @param data The raw data that was signed
 * @param signature The signature to verify (base64 encoded)
 * @param publicKey The PEM-encoded public key
 */
export function verifySignature(data: string, signature: string, publicKey: string): boolean {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Sign data using a private key.
 * @param data The data to sign
 * @param privateKey The PEM-encoded private key
 */
export function signData(data: string, privateKey: string): string {
  const signer = crypto.createSign('SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

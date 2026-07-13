import argon2 from 'argon2';

/**
 * Adapter interface for password hashing.
 * Defined inside domain and implemented in infrastructure.
 */
export interface HashingProvider {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * Hashing Provider implemented using Argon2id.
 * Argon2id is highly resistant to GPU cracking and side-channel attacks,
 * making it the industry standard for secure password hashing.
 */
export class Argon2HashingProvider implements HashingProvider {
  async hash(password: string): Promise<string> {
    // Configured for optimal security/performance tradeoff:
    // Memory: 65536 KB (64MB), Time: 3 iterations, Parallelism: 4 threads
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}

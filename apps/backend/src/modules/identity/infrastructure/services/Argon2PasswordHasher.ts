import argon2 from 'argon2';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';

/**
 * Argon2id password hasher.
 *
 * Configuration follows OWASP recommendations:
 * - Memory: 64 MB
 * - Iterations: 3
 * - Parallelism: 4 (matches typical 4-core VMs)
 *
 * These settings are expensive enough to defeat GPU-based brute forcing
 * while remaining fast enough for interactive login (< 1 second).
 */
export class Argon2PasswordHasher implements IPasswordHasher {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  async hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, this.options);
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }
}

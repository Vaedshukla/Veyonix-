export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export class SecurePassword {
  private readonly _raw: string;

  private constructor(raw: string) {
    this._raw = raw;
  }

  static create(raw: string, policy: PasswordPolicy = DEFAULT_POLICY): SecurePassword {
    const errors = SecurePassword.validate(raw, policy);
    if (errors.length > 0) {
      throw new Error(`Password policy violations: ${errors.join(', ')}`);
    }
    return new SecurePassword(raw);
  }

  static validate(raw: string, policy: PasswordPolicy = DEFAULT_POLICY): string[] {
    const errors: string[] = [];
    if (raw.length < policy.minLength)
      errors.push(`must be at least ${policy.minLength} characters`);
    if (policy.requireUppercase && !/[A-Z]/.test(raw))
      errors.push('must contain at least one uppercase letter');
    if (policy.requireLowercase && !/[a-z]/.test(raw))
      errors.push('must contain at least one lowercase letter');
    if (policy.requireNumbers && !/[0-9]/.test(raw))
      errors.push('must contain at least one number');
    if (
      policy.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(raw)
    )
      errors.push('must contain at least one special character');
    return errors;
  }

  get raw(): string {
    return this._raw;
  }
}

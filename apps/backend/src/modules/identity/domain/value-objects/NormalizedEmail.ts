export class NormalizedEmail {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): NormalizedEmail {
    const normalized = raw.trim().toLowerCase();
    if (!NormalizedEmail.isValid(normalized)) {
      throw new Error(`Invalid email address: ${raw}`);
    }
    return new NormalizedEmail(normalized);
  }

  static isValid(email: string): boolean {
    const RFC_5322 =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return RFC_5322.test(email) && email.length <= 254;
  }

  get value(): string {
    return this._value;
  }

  equals(other: NormalizedEmail): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

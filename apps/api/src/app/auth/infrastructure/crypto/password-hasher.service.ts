import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

const ARGON2_OPTIONS = {
  hashLength: 32,
  memoryCost: 65_536,
  parallelism: 4,
  timeCost: 3,
  type: argon2id,
  version: 0x13,
} as const;

/** Owns the documented Argon2id password hashing boundary. */
@Injectable()
export class PasswordHasherService {
  /**
   * Derives a password hash using the accepted explicit Argon2id parameters.
   *
   * @param password Validated plaintext password that must remain request-local.
   * @returns An encoded Argon2id hash safe for persistence.
   */
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifies untrusted credentials against one persisted Argon2id hash.
   *
   * @param password Untrusted plaintext password from the login request.
   * @param passwordHash Encoded hash loaded from private persistence.
   * @returns Whether the credentials match.
   */
  verify(password: string, passwordHash: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}

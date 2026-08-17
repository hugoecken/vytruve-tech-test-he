import type { Readable } from 'node:stream';

/** Injection token for the application-owned private object-storage boundary. */
export const PRIVATE_OBJECT_STORAGE = Symbol('PRIVATE_OBJECT_STORAGE');

/** Safe provider-neutral storage failure categories. */
export type PrivateObjectStorageFailureKind = 'not_found' | 'unavailable';

/** Storage failure safe for application translation and operational logging. */
export class PrivateObjectStorageError extends Error {
  /**
   * Creates a provider-neutral storage failure.
   *
   * @param kind Safe failure category.
   */
  constructor(readonly kind: PrivateObjectStorageFailureKind) {
    super('Private object storage operation failed.');
    this.name = PrivateObjectStorageError.name;
  }
}

/** Minimal operations shared by bounded private-content features. */
export interface PrivateObjectStoragePort {
  /** Verifies that the configured private bucket is reachable. */
  checkReadiness(): Promise<void>;

  /**
   * Stores one bounded object under an opaque application key.
   *
   * @param storageKey Application-generated UUID key.
   * @param content Validated bounded bytes.
   * @param contentType Validated media type stored as object metadata.
   */
  write(
    storageKey: string,
    content: Buffer,
    contentType: string,
  ): Promise<void>;

  /**
   * Removes exactly one opaque object during compensation or cleanup.
   *
   * @param storageKey Application-generated UUID key.
   */
  remove(storageKey: string): Promise<void>;

  /**
   * Opens one authorized object after verifying persisted byte length.
   *
   * @param storageKey Opaque key read from owner-scoped metadata.
   * @param expectedSizeBytes Persisted exact byte length.
   * @returns Provider stream and verified byte length.
   */
  open(
    storageKey: string,
    expectedSizeBytes: number,
  ): Promise<{ sizeBytes: number; stream: Readable }>;
}

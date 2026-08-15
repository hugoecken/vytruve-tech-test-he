import type { Readable } from 'node:stream';

/** Injection token for the application-owned private scan storage boundary. */
export const SCAN_STORAGE = Symbol('SCAN_STORAGE');

/** Safe storage failure categories that contain no provider information. */
export type ScanStorageFailureKind = 'not_found' | 'unavailable';

/** Storage failure safe for application-level translation and logging. */
export class ScanStorageError extends Error {
  /**
   * Creates a provider-neutral storage error.
   *
   * @param kind Safe failure category.
   */
  constructor(readonly kind: ScanStorageFailureKind) {
    super('Private scan storage operation failed.');
    this.name = ScanStorageError.name;
  }
}

/** Operations currently required to store and stream private patient scans. */
export interface ScanStoragePort {
  /** Verifies that the configured private bucket is reachable. */
  checkReadiness(): Promise<void>;

  /**
   * Stores one bounded PLY object under an opaque application key.
   *
   * @param storageKey Application-generated opaque key.
   * @param content Validated PLY bytes.
   */
  write(storageKey: string, content: Buffer): Promise<void>;

  /**
   * Removes exactly one opaque object after a failed metadata write.
   *
   * @param storageKey Application-generated opaque key.
   */
  remove(storageKey: string): Promise<void>;

  /**
   * Opens one authorized private object for HTTP streaming.
   *
   * @param storageKey Opaque key read from authorized metadata.
   * @param expectedSizeBytes Expected metadata size used for integrity checking.
   * @returns Readable object bytes and their exact length.
   */
  open(
    storageKey: string,
    expectedSizeBytes: number,
  ): Promise<{ sizeBytes: number; stream: Readable }>;
}

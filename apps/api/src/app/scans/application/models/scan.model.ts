import type { Readable } from 'node:stream';
import type { Page } from '../../../../pagination/page';

/** PLY encodings accepted by the public scan contract. */
export const ScanEncoding = {
  ASCII: 'ascii',
  BINARY_BIG_ENDIAN: 'binary_big_endian',
  BINARY_LITTLE_ENDIAN: 'binary_little_endian',
} as const;

/** Union of validated PLY encodings. */
export type ScanEncoding = (typeof ScanEncoding)[keyof typeof ScanEncoding];

/** Persistence-independent metadata for one validated patient scan. */
export interface ScanModel {
  createdAt: Date;
  encoding: ScanEncoding;
  id: string;
  patientId: string;
  sizeBytes: number;
}

/** Untrusted but transport-bounded scan bytes entering the application. */
export interface CreateScanCommand {
  accountId: string;
  content: Buffer;
  patientId: string;
}

/** Server-paginated scan page without a fabricated total. */
export type ScanPageModel = Page<ScanModel>;

/** Authorized private scan stream with exact stored length. */
export interface ScanDownloadModel {
  sizeBytes: number;
  stream: Readable;
}

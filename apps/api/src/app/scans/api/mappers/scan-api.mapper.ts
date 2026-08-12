import { Injectable, StreamableFile } from '@nestjs/common';
import type {
  CreateScanCommand,
  ScanDownloadModel,
  ScanModel,
  ScanPageModel,
} from '../../application/models/scan.model';
import { ScanPageResponse, ScanResponse } from '../dto/scan-response.dto';

/** Maps multipart, pagination, streaming, and scan response boundaries. */
@Injectable()
export class ScanApiMapper {
  /**
   * Confines Multer values to the API boundary and installs server ownership.
   *
   * @param file Required size-bounded multipart file.
   * @param accountId Verified session owner.
   * @param patientId Authorized parent candidate.
   * @returns Application scan-creation command.
   */
  toCreateCommand(
    file: Express.Multer.File,
    accountId: string,
    patientId: string,
  ): CreateScanCommand {
    return { accountId, content: file.buffer, patientId };
  }

  /**
   * Serializes public metadata without a filename, object key, or endpoint.
   *
   * @param scan Internal scan model.
   * @returns Public scan representation.
   */
  toResponse(scan: ScanModel): ScanResponse {
    return {
      createdAt: scan.createdAt.toISOString(),
      encoding: scan.encoding,
      format: 'ply',
      id: scan.id,
      printingAvailable: scan.printingAvailable,
      sizeBytes: scan.sizeBytes,
    };
  }

  /**
   * Maps one deterministic server page to the public collection contract.
   *
   * @param page Application scan page.
   * @returns Public page without a total.
   */
  toPageResponse(page: ScanPageModel): ScanPageResponse {
    return {
      items: page.items.map((scan) => this.toResponse(scan)),
      pageInfo: {
        hasNext: page.hasNext,
        page: page.page,
        pageSize: page.pageSize,
      },
    };
  }

  /**
   * Wraps an authorized object stream with a synthetic safe filename.
   *
   * @param download Authorized scan stream and length.
   * @param scanId Safe public identifier used only for the attachment name.
   * @returns Nest streaming response wrapper.
   */
  toDownload(download: ScanDownloadModel, scanId: string): StreamableFile {
    return new StreamableFile(download.stream, {
      disposition: `attachment; filename="scan-${scanId}.ply"`,
      length: download.sizeBytes,
      type: 'application/octet-stream',
    });
  }
}

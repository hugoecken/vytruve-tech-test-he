import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiProblemResponse } from '../../../../http/api-problem-response.decorator';
import { PageQuery } from '../../../../pagination/page-query';
import type { AuthenticatedSessionModel } from '../../../auth/application/models/auth-session.model';
import { CurrentSession } from '../../../auth/api/decorators/current-session.decorator';
import { SESSION_COOKIE_NAME } from '../../../auth/infrastructure/security/session.constants';
import { ScansService } from '../../application/services/scans.service';
import {
  PatientScansPathParameters,
  ScanContentPathParameters,
} from '../dto/scan-path-parameters.dto';
import { ScanPageResponse, ScanResponse } from '../dto/scan-response.dto';
import { ScanApiMapper } from '../mappers/scan-api.mapper';
import {
  RequiredScanFilePipe,
  ScanFileSizePipe,
} from '../pipes/ply-upload.pipe';

/** Exposes owner-scoped scan listing, upload, and private content streaming. */
@ApiTags('Scans')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Controller('patients/:patientId/scans')
export class ScansController {
  /**
   * Creates the scan HTTP boundary with application and mapping collaborators.
   *
   * @param scans Owner-scoped scan use cases.
   * @param mapper Scan transport mapper.
   */
  constructor(
    private readonly scans: ScansService,
    private readonly mapper: ScanApiMapper,
  ) {}

  /**
   * Lists one deterministic page for an owned patient.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient path.
   * @param query Validated zero-based page query.
   * @returns Owner-visible scan page without storage data.
   */
  @Get()
  @ApiOperation({
    description:
      'Lists validated scan metadata only after confirming ownership of the parent patient.',
    operationId: 'listPatientScans',
    summary: 'List patient scans',
  })
  @ApiResponse({
    description: 'Owner-scoped patient scan page.',
    status: HttpStatus.OK,
    type: ScanPageResponse,
  })
  @ApiProblemResponse(400, 'The path or pagination input is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(500, 'The scan page could not be loaded safely.')
  async listScans(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientScansPathParameters,
    @Query() query: PageQuery,
  ): Promise<ScanPageResponse> {
    return this.mapper.toPageResponse(
      await this.scans.list(session.accountId, parameters.patientId, query),
    );
  }

  /**
   * Validates and privately stores exactly one patient PLY scan.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient path.
   * @param file Required size-bounded multipart upload.
   * @param response Passthrough response used only for the Location header.
   * @returns Stored public scan metadata.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Exactly one PLY 1.0 file. Extension and browser MIME metadata are not trusted.',
    schema: {
      properties: { file: { format: 'binary', type: 'string' } },
      required: ['file'],
      type: 'object',
    },
  })
  @ApiOperation({
    description:
      'Validates one bounded PLY mesh, stores it privately, then persists only safe metadata.',
    operationId: 'createPatientScan',
    summary: 'Upload a patient scan',
  })
  @ApiResponse({
    description: 'The PLY scan was validated and stored privately.',
    headers: {
      Location: {
        description: 'Authorized scan content resource.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.CREATED,
    type: ScanResponse,
  })
  @ApiProblemResponse(400, 'The path or multipart request is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(413, 'The uploaded scan exceeds the configured limit.')
  @ApiProblemResponse(415, 'The upload is not a supported PLY 1.0 encoding.')
  @ApiProblemResponse(422, 'The PLY mesh is malformed, empty, or truncated.')
  @ApiProblemResponse(503, 'Private scan storage is unavailable.')
  @ApiProblemResponse(500, 'Scan metadata could not be persisted safely.')
  async createScan(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientScansPathParameters,
    @UploadedFile(RequiredScanFilePipe, ScanFileSizePipe)
    file: Express.Multer.File,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ScanResponse> {
    const scan = await this.scans.create(
      this.mapper.toCreateCommand(
        file,
        session.accountId,
        parameters.patientId,
      ),
    );
    response.location(
      `/api/patients/${parameters.patientId}/scans/${scan.id}/content`,
    );
    return this.mapper.toResponse(scan);
  }

  /**
   * Streams one private scan after parent and member ownership checks.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient and scan identifiers.
   * @returns Authorized PLY stream with a safe generated attachment name.
   */
  @Get(':scanId/content')
  @ApiProduces('application/octet-stream')
  @ApiOperation({
    description:
      'Streams stored PLY bytes only when both patient and scan belong to the authenticated account.',
    operationId: 'downloadPatientScan',
    summary: 'Download a patient scan',
  })
  @ApiResponse({
    content: {
      'application/octet-stream': {
        schema: { format: 'binary', type: 'string' },
      },
    },
    description: 'Authorized PLY scan content.',
    status: HttpStatus.OK,
  })
  @ApiProblemResponse(400, 'A path identifier is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient or scan is missing or not owned by the current account.',
  )
  @ApiProblemResponse(503, 'Private scan storage is unavailable.')
  @ApiProblemResponse(500, 'The scan content could not be streamed safely.')
  async downloadScan(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: ScanContentPathParameters,
  ): Promise<StreamableFile> {
    return this.mapper.toDownload(
      await this.scans.openDownload(
        session.accountId,
        parameters.patientId,
        parameters.scanId,
      ),
      parameters.scanId,
    );
  }
}

import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentSession } from '@api/app/auth/api/decorators/current-session.decorator';
import type { AuthenticatedSessionModel } from '@api/app/auth/application/models/auth-session.model';
import { SESSION_COOKIE_NAME } from '@api/app/auth/infrastructure/security/session.constants';
import { ApiProblemResponse } from '@api/http/api-problem-response.decorator';
import { PageQuery } from '@api/pagination/page-query';
import { PrintingService } from '../../application/services/printing.service';
import {
  PatientPrintRequestsPathParameters,
  ScanPrintRequestsPathParameters,
} from '../dto/print-request-path-parameters.dto';
import {
  PrintRequestPageResponse,
  PrintRequestResponse,
} from '../dto/print-request-response.dto';
import { PrintRequestApiMapper } from '../mappers/print-request-api.mapper';

/** Exposes owner-scoped print submission and provider-neutral tracking. */
@ApiTags('Printing')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Controller('patients/:patientId')
export class PrintRequestsController {
  /**
   * Creates the printing HTTP boundary with application and mapping providers.
   *
   * @param printing Durable printing use cases.
   * @param mapper Printing transport mapper.
   */
  constructor(
    private readonly printing: PrintingService,
    private readonly mapper: PrintRequestApiMapper,
  ) {}

  /**
   * Reserves and submits an owned scan once, preserving ambiguous outcomes.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient and scan identifiers.
   * @param response Passthrough response used only for the Location header.
   * @returns Confirmed or confirmation-pending print request.
   */
  @Post('scans/:scanId/print-requests')
  @ApiOperation({
    description:
      'Persists a stable local reference before one non-idempotent submission. Ambiguous outcomes remain confirmation pending for later reconciliation.',
    operationId: 'createPrintRequest',
    summary: 'Submit a scan for printing',
  })
  @ApiResponse({
    description:
      'The local print request was created and now owns confirmation or tracking.',
    headers: {
      Location: {
        description: 'Owner-scoped print-request collection.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.CREATED,
    type: PrintRequestResponse,
  })
  @ApiProblemResponse(400, 'A patient or scan path identifier is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient or scan is missing or not owned by the current account.',
  )
  @ApiProblemResponse(409, 'The scan already has a non-terminal print request.')
  @ApiProblemResponse(
    503,
    'The printing center rejected capacity or is definitively unavailable.',
  )
  @ApiProblemResponse(
    500,
    'The local print reservation could not be persisted safely.',
  )
  async createPrintRequest(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: ScanPrintRequestsPathParameters,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PrintRequestResponse> {
    const request = await this.printing.create(
      this.mapper.toCreateCommand(session, parameters),
    );
    response.location(`/api/patients/${parameters.patientId}/print-requests`);
    return this.mapper.toResponse(request);
  }

  /**
   * Lists one patient page from persisted state without provider latency.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient identifier.
   * @param query Validated zero-based server page.
   * @returns Owner-scoped provider-neutral print history.
   */
  @Get('print-requests')
  @ApiOperation({
    description:
      'Returns the latest persisted print-request lifecycle projection without contacting the printing provider.',
    operationId: 'listPatientPrintRequests',
    summary: 'List patient print requests',
  })
  @ApiResponse({
    description: 'Owner-scoped print-request page with estimated progress.',
    status: HttpStatus.OK,
    type: PrintRequestPageResponse,
  })
  @ApiProblemResponse(400, 'The patient path or pagination input is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(500, 'The print-request page could not be loaded safely.')
  async listPrintRequests(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientPrintRequestsPathParameters,
    @Query() query: PageQuery,
  ): Promise<PrintRequestPageResponse> {
    return this.mapper.toPageResponse(
      await this.printing.list(session.accountId, parameters.patientId, query),
    );
  }

  /**
   * Reconciles active rows in one patient page without submitting new work.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient identifier.
   * @param query Validated zero-based server page.
   * @returns Owner-scoped provider-neutral print history after reconciliation.
   */
  @Get('print-requests/statuses')
  @ApiOperation({
    description:
      'Reconciles active rows through their stable reference and durable provider identifier, persists validated observations, and never submits a new print request.',
    operationId: 'refreshPatientPrintRequests',
    summary: 'Refresh patient print-request statuses',
  })
  @ApiResponse({
    description: 'Reconciled print-request page with estimated progress.',
    status: HttpStatus.OK,
    type: PrintRequestPageResponse,
  })
  @ApiProblemResponse(400, 'The patient path or pagination input is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(
    503,
    'The printing center could not refresh one or more non-terminal requests.',
  )
  @ApiProblemResponse(500, 'The print-request page could not be loaded safely.')
  async refreshPrintRequests(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientPrintRequestsPathParameters,
    @Query() query: PageQuery,
  ): Promise<PrintRequestPageResponse> {
    return this.mapper.toPageResponse(
      await this.printing.refresh(
        session.accountId,
        parameters.patientId,
        query,
      ),
    );
  }
}

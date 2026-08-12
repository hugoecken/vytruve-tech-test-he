import {
  Body,
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
import { ApiProblemResponse } from '../../../../http/api-problem-response.decorator';
import { PageQuery } from '../../../../pagination/page-query';
import { SESSION_COOKIE_NAME } from '../../../auth/infrastructure/security/session.constants';
import type { AuthenticatedSessionModel } from '../../../auth/application/models/auth-session.model';
import { CurrentSession } from '../../../auth/api/decorators/current-session.decorator';
import { PatientsService } from '../../application/services/patients.service';
import { CreatePatientRequest } from '../dto/create-patient-request.dto';
import { PatientPathParameters } from '../dto/patient-path-parameters.dto';
import {
  PatientPageResponse,
  PatientResponse,
} from '../dto/patient-response.dto';
import { PatientApiMapper } from '../mappers/patient-api.mapper';

/** Exposes owner-scoped patient creation and deterministic collection reads. */
@ApiTags('Patients')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Controller('patients')
export class PatientsController {
  /**
   * Creates the patient HTTP boundary with application and mapping collaborators.
   *
   * @param patients Owner-scoped patient use cases.
   * @param mapper Patient transport mapper.
   */
  constructor(
    private readonly patients: PatientsService,
    private readonly mapper: PatientApiMapper,
  ) {}

  /**
   * Lists one deterministic page belonging to the authenticated account.
   *
   * @param session Verified session from the global guard.
   * @param query Validated server page index and size.
   * @returns A server page without a fabricated total.
   * @throws AUTHENTICATION_REQUIRED or VALIDATION_FAILED.
   */
  @Get()
  @ApiOperation({
    description:
      'Lists the authenticated account’s patient records in deterministic descending order.',
    operationId: 'listPatients',
    summary: 'List patients',
  })
  @ApiResponse({
    description: 'Owner-scoped patient page.',
    status: HttpStatus.OK,
    type: PatientPageResponse,
  })
  @ApiProblemResponse(400, 'Pagination input is invalid.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(500, 'The patient page could not be loaded safely.')
  async listPatients(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Query() query: PageQuery,
  ): Promise<PatientPageResponse> {
    return this.mapper.toPageResponse(
      await this.patients.list(session.accountId, query),
    );
  }

  /**
   * Creates one patient whose owner is derived exclusively from the session.
   *
   * @param session Verified session from the global guard.
   * @param request Validated patient fields without an owner ID.
   * @param response Passthrough response used only for the Location header.
   * @returns The newly persisted patient.
   * @throws AUTHENTICATION_REQUIRED or VALIDATION_FAILED.
   */
  @Post()
  @ApiOperation({
    description: 'Creates a patient record owned by the authenticated account.',
    operationId: 'createPatient',
    summary: 'Create a patient',
  })
  @ApiResponse({
    description: 'Patient record created.',
    headers: {
      Location: {
        description: 'Canonical patient resource.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.CREATED,
    type: PatientResponse,
  })
  @ApiProblemResponse(400, 'The patient request contains invalid fields.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(500, 'The patient could not be created safely.')
  async createPatient(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Body() request: CreatePatientRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PatientResponse> {
    const patient = await this.patients.create(
      this.mapper.toCreateCommand(request, session.accountId),
    );
    response.location(`/api/patients/${patient.id}`);
    return this.mapper.toResponse(patient);
  }

  /**
   * Retrieves a patient through a combined owner and resource predicate.
   *
   * @param session Verified session from the global guard.
   * @param parameters Validated UUID path parameters.
   * @returns The owned patient record.
   * @throws PATIENT_NOT_FOUND identically for missing and foreign records.
   */
  @Get(':patientId')
  @ApiOperation({
    description:
      'Returns a patient only when it belongs to the authenticated account.',
    operationId: 'getPatient',
    summary: 'Get a patient',
  })
  @ApiResponse({
    description: 'Owned patient record.',
    status: HttpStatus.OK,
    type: PatientResponse,
  })
  @ApiProblemResponse(400, 'The patient identifier is not a valid UUID.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(500, 'The patient record could not be loaded safely.')
  async getPatient(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientPathParameters,
  ): Promise<PatientResponse> {
    return this.mapper.toResponse(
      await this.patients.get(session.accountId, parameters.patientId),
    );
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import { CurrentSession } from '@api/app/auth/api/decorators/current-session.decorator';
import type { AuthenticatedSessionModel } from '@api/app/auth/application/models/auth-session.model';
import { SESSION_COOKIE_NAME } from '@api/app/auth/infrastructure/security/session.constants';
import { ApiProblemResponse } from '@api/http/api-problem-response.decorator';
import { PageQuery } from '@api/pagination/page-query';
import type { PatientPhotoInput } from '../../application/models/patient.model';
import { PatientsService } from '../../application/services/patients.service';
import { CreatePatientRequest } from '../dto/create-patient-request.dto';
import { PatientPathParameters } from '../dto/patient-path-parameters.dto';
import { UpdatePatientRequest } from '../dto/update-patient-request.dto';
import { PatientPhotoUploadPipe } from '../pipes/patient-photo-upload.pipe';
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
   * @param photo Optional validated private photo.
   * @param response Passthrough response used only for the Location header.
   * @returns The newly persisted patient.
   * @throws AUTHENTICATION_REQUIRED or VALIDATION_FAILED.
   */
  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Validated patient identity fields and no more than one optional private photo.',
    schema: {
      properties: {
        age: { maximum: 150, minimum: 0, type: 'integer' },
        firstName: { maxLength: 100, minLength: 1, type: 'string' },
        lastName: { maxLength: 100, minLength: 1, type: 'string' },
        photo: { format: 'binary', type: 'string' },
      },
      required: ['firstName', 'lastName', 'age'],
      type: 'object',
    },
  })
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
  @ApiProblemResponse(413, 'The optional patient photo exceeds 5 MiB.')
  @ApiProblemResponse(415, 'The optional patient photo type is unsupported.')
  @ApiProblemResponse(
    422,
    'The optional patient photo cannot be decoded safely.',
  )
  @ApiProblemResponse(503, 'Private patient photo storage is unavailable.')
  @ApiProblemResponse(500, 'The patient could not be created safely.')
  async createPatient(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Body() request: CreatePatientRequest,
    @UploadedFile(PatientPhotoUploadPipe)
    photo: PatientPhotoInput | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PatientResponse> {
    const patient = await this.patients.create(
      this.mapper.toCreateCommand(request, session.accountId, photo),
    );
    response.location(`/api/patients/${patient.id}`);
    return this.mapper.toResponse(patient);
  }

  /**
   * Updates complete editable fields and one explicit current-photo decision.
   *
   * @param session Verified session from the global guard.
   * @param parameters Validated UUID patient path.
   * @param request Complete validated editable patient fields.
   * @param photo Optional validated replacement photo.
   * @returns The committed current patient representation.
   */
  @Patch(':patientId')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Complete patient identity fields, an explicit photo decision, and a conditional replacement photo.',
    schema: {
      properties: {
        age: { maximum: 150, minimum: 0, type: 'integer' },
        firstName: { maxLength: 100, minLength: 1, type: 'string' },
        lastName: { maxLength: 100, minLength: 1, type: 'string' },
        photo: { format: 'binary', type: 'string' },
        photoAction: {
          enum: ['keep', 'replace', 'remove'],
          type: 'string',
        },
      },
      required: ['firstName', 'lastName', 'age', 'photoAction'],
      type: 'object',
    },
  })
  @ApiOperation({
    description:
      'Updates one patient owned by the authenticated account as one confirmed result.',
    operationId: 'updatePatient',
    summary: 'Update a patient',
  })
  @ApiResponse({
    description: 'Patient record updated.',
    status: HttpStatus.OK,
    type: PatientResponse,
  })
  @ApiProblemResponse(400, 'The patient update contains invalid fields.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing or not owned by the current account.',
  )
  @ApiProblemResponse(413, 'The optional patient photo exceeds 5 MiB.')
  @ApiProblemResponse(415, 'The optional patient photo type is unsupported.')
  @ApiProblemResponse(
    422,
    'The optional patient photo cannot be decoded safely.',
  )
  @ApiProblemResponse(503, 'Private patient photo storage is unavailable.')
  @ApiProblemResponse(500, 'The patient could not be updated safely.')
  async updatePatient(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientPathParameters,
    @Body() request: UpdatePatientRequest,
    @UploadedFile(PatientPhotoUploadPipe)
    photo: PatientPhotoInput | undefined,
  ): Promise<PatientResponse> {
    return this.mapper.toResponse(
      await this.patients.update(
        this.mapper.toUpdateCommand(
          request,
          session.accountId,
          parameters.patientId,
          photo,
        ),
      ),
    );
  }

  /**
   * Streams the current photo after the same owner concealment as patient reads.
   *
   * @param session Verified session from the global guard.
   * @param parameters Validated UUID patient path.
   * @param response Passthrough response used only for private cache headers.
   * @returns The authorized current photo stream.
   */
  @Get(':patientId/photo')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({
    description:
      'Streams the current patient photo only through the authenticated ownership boundary.',
    operationId: 'getPatientPhoto',
    summary: 'Get a patient photo',
  })
  @ApiResponse({
    description: 'Current private patient photo.',
    schema: { format: 'binary', type: 'string' },
    status: HttpStatus.OK,
  })
  @ApiProblemResponse(400, 'The patient identifier is not a valid UUID.')
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(
    404,
    'The patient is missing, foreign-owned, or has no current photo.',
  )
  @ApiProblemResponse(503, 'Private patient photo storage is unavailable.')
  @ApiProblemResponse(500, 'The patient photo could not be loaded safely.')
  async getPatientPhoto(
    @CurrentSession() session: AuthenticatedSessionModel,
    @Param() parameters: PatientPathParameters,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const photo = await this.patients.getPhoto(
      session.accountId,
      parameters.patientId,
    );
    response.set({
      'Cache-Control': 'private, no-store',
      'Content-Length': String(photo.sizeBytes),
      'Content-Type': photo.mediaType,
    });
    return new StreamableFile(photo.stream);
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

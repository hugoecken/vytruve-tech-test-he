import { Injectable } from '@nestjs/common';
import type {
  CreatePatientCommand,
  ListPatientsQuery,
  PatientModel,
  PatientPageModel,
} from '../../application/models/patient.model';
import type { CreatePatientRequest } from '../dto/create-patient-request.dto';
import type { ListPatientsQuery as ListPatientsQueryTransport } from '../dto/list-patients-query.dto';
import {
  PatientPageResponse,
  PatientResponse,
} from '../dto/patient-response.dto';

/** Maps patient transport values without performing ownership decisions or I/O. */
@Injectable()
export class PatientApiMapper {
  /** Maps a validated request and verified owner into the creation command. */
  toCreateCommand(
    request: CreatePatientRequest,
    accountId: string,
  ): CreatePatientCommand {
    return {
      accountId,
      age: request.age,
      firstName: request.firstName,
      lastName: request.lastName,
    };
  }

  /** Maps the validated query DTO to a framework-free application query. */
  toListQuery(query: ListPatientsQueryTransport): ListPatientsQuery {
    return {
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
      pageSize: query.pageSize,
    };
  }

  /** Maps one internal patient without exposing its owner identifier. */
  toResponse(model: PatientModel): PatientResponse {
    return {
      age: model.age,
      createdAt: model.createdAt.toISOString(),
      firstName: model.firstName,
      id: model.id,
      lastName: model.lastName,
    };
  }

  /** Maps a forward application page to the accepted public collection shape. */
  toPageResponse(model: PatientPageModel): PatientPageResponse {
    return {
      items: model.items.map((patient) => this.toResponse(patient)),
      pageInfo: {
        hasNext: model.hasNext,
        nextCursor: model.nextCursor,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import type {
  CreatePrintRequestCommand,
  PrintRequestPageModel,
  PrintRequestViewModel,
} from '../../application/models/print-request.model';
import type { AuthenticatedSessionModel } from '@api/app/auth/application/models/auth-session.model';
import {
  PrintRequestPageResponse,
  PrintRequestResponse,
} from '../dto/print-request-response.dto';
import type { ScanPrintRequestsPathParameters } from '../dto/print-request-path-parameters.dto';

/** Maps authenticated printing transport values and public responses. */
@Injectable()
export class PrintRequestApiMapper {
  /**
   * Builds a creation command without accepting ownership from the client.
   *
   * @param session Verified authenticated session.
   * @param parameters Validated patient and scan route values.
   * @returns Application command with server-derived ownership.
   */
  toCreateCommand(
    session: AuthenticatedSessionModel,
    parameters: ScanPrintRequestsPathParameters,
  ): CreatePrintRequestCommand {
    return {
      accountId: session.accountId,
      patientId: parameters.patientId,
      scanId: parameters.scanId,
    };
  }

  /**
   * Serializes one provider-neutral request without external identifiers.
   *
   * @param request Public-safe application projection.
   * @returns JSON-ready print-request response.
   */
  toResponse(request: PrintRequestViewModel): PrintRequestResponse {
    return {
      createdAt: request.createdAt.toISOString(),
      estimatedProgress: request.estimatedProgress,
      id: request.id,
      lastObservedAt: request.lastObservedAt?.toISOString() ?? null,
      reference: request.reference,
      scanId: request.scanId,
      scheduledEndAt: request.scheduledEndAt?.toISOString() ?? null,
      scheduledStartAt: request.scheduledStartAt?.toISOString() ?? null,
      status: request.status,
    };
  }

  /**
   * Maps one deterministic server page to the public collection contract.
   *
   * @param page Application printing page after safe reconciliation.
   * @returns Public page with no total or provider details.
   */
  toPageResponse(page: PrintRequestPageModel): PrintRequestPageResponse {
    return {
      items: page.items.map((request) => this.toResponse(request)),
      pageInfo: {
        hasNext: page.hasNext,
        page: page.page,
        pageSize: page.pageSize,
      },
    };
  }
}

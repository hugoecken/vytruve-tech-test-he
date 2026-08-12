import { Injectable } from '@nestjs/common';
import type {
  AccountSessionModel,
  CreateAccountCommand,
  CreateSessionCommand,
} from '../../application/models/auth-session.model';
import { AccountSessionResponse } from '../dto/account-session-response.dto';
import type { CreateAccountRequest } from '../dto/create-account-request.dto';
import type { CreateSessionRequest } from '../dto/create-session-request.dto';

/** Maps authentication transport values at the owning HTTP boundary. */
@Injectable()
export class AuthApiMapper {
  /** Maps a validated registration request to its application command. */
  toCreateAccountCommand(request: CreateAccountRequest): CreateAccountCommand {
    return { email: request.email, password: request.password };
  }

  /** Maps validated credentials to the login application command. */
  toCreateSessionCommand(request: CreateSessionRequest): CreateSessionCommand {
    return { email: request.email, password: request.password };
  }

  /** Maps an internal session to its token-free public response. */
  toResponse(model: AccountSessionModel): AccountSessionResponse {
    return {
      accountId: model.accountId,
      email: model.email,
      expiresAt: model.expiresAt.toISOString(),
    };
  }
}

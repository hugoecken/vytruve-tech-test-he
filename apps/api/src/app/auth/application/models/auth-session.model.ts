/** Verified session claims attached to an authenticated HTTP request. */
export interface AuthenticatedSessionModel {
  accountId: string;
  expiresAt: Date;
}

/** Application response after registration, login, or session restoration. */
export interface AccountSessionModel extends AuthenticatedSessionModel {
  email: string;
}

/** Newly issued session containing the private token and public account model. */
export interface IssuedAccountSessionModel {
  session: AccountSessionModel;
  token: string;
}

/** Registration application input produced from a validated request DTO. */
export interface CreateAccountCommand {
  email: string;
  password: string;
}

/** Login application input produced from a validated request DTO. */
export interface CreateSessionCommand {
  email: string;
  password: string;
}

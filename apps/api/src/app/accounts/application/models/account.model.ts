/** Account identity and password material available only inside the API. */
export interface AccountModel {
  createdAt: Date;
  email: string;
  id: string;
  passwordHash: string;
}

/** Persistence input for a newly registered account. */
export interface CreateAccountModel {
  email: string;
  passwordHash: string;
}

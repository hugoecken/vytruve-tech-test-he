import { ApiProperty } from '@nestjs/swagger';

/** Public account identity and expiry returned without the private token. */
export class AccountSessionResponse {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: 'clinician@example.test', format: 'email' })
  email!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

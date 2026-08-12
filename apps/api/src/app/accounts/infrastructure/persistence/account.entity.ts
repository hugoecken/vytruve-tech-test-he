import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** TypeORM mapping for the Liquibase-owned singular account table. */
@Entity({ name: 'account' })
@Unique('uq_account_email', ['email'])
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @CreateDateColumn({
    name: 'created_at',
    precision: 3,
    type: 'timestamptz',
  })
  createdAt!: Date;
}

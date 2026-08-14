import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** TypeORM mapping for the Liquibase-owned singular patient table. */
@Entity({ name: 'patient' })
@Index('ix_patient_account_created', ['accountId', 'createdAt', 'id'])
@Check('ck_patient_age', '"age" BETWEEN 0 AND 150')
export class PatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ length: 100, name: 'first_name', type: 'varchar' })
  firstName!: string;

  @Column({ length: 100, name: 'last_name', type: 'varchar' })
  lastName!: string;

  @Column({ type: 'smallint' })
  age!: number;

  @CreateDateColumn({
    name: 'created_at',
    precision: 3,
    type: 'timestamptz',
  })
  createdAt!: Date;
}

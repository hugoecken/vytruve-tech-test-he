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
@Check(
  'ck_patient_photo_metadata',
  `("photo_storage_key" IS NULL AND "photo_format" IS NULL AND "photo_size_bytes" IS NULL)
  OR ("photo_storage_key" IS NOT NULL AND "photo_format" IN ('jpeg', 'png', 'webp') AND "photo_size_bytes" BETWEEN 1 AND 5242880)`,
)
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

  @Column({
    length: 36,
    name: 'photo_storage_key',
    nullable: true,
    type: 'varchar',
  })
  photoStorageKey!: string | null;

  @Column({ length: 4, name: 'photo_format', nullable: true, type: 'varchar' })
  photoFormat!: string | null;

  @Column({ name: 'photo_size_bytes', nullable: true, type: 'integer' })
  photoSizeBytes!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    precision: 3,
    type: 'timestamptz',
  })
  createdAt!: Date;
}

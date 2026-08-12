import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PatientEntity } from '@api/app/patients/infrastructure/persistence/patient.entity';
import { PrintRequestEntity } from '@api/app/printing/infrastructure/persistence/print-request.entity';
import type { ScanEncoding } from '../../application/models/scan.model';

/** TypeORM runtime mapping for the Liquibase-owned singular scan table. */
@Entity({ name: 'scan' })
@Index('ix_scan_patient_created', ['patientId', 'createdAt', 'id'])
@Check('ck_scan_format', '"format" = \'ply\'')
@Check(
  'ck_scan_encoding',
  "\"encoding\" IN ('ascii', 'binary_little_endian', 'binary_big_endian')",
)
@Check('ck_scan_size', '"size_bytes" > 0')
export class ScanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @ManyToOne(() => PatientEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: PatientEntity;

  @OneToMany(() => PrintRequestEntity, (printRequest) => printRequest.scan)
  printRequests!: PrintRequestEntity[];

  @Column({ length: 128, name: 'storage_key', type: 'varchar', unique: true })
  storageKey!: string;

  @Column({ default: 'ply', length: 16, type: 'varchar' })
  format!: 'ply';

  @Column({ length: 32, type: 'varchar' })
  encoding!: ScanEncoding;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @CreateDateColumn({
    name: 'created_at',
    precision: 3,
    type: 'timestamptz',
  })
  createdAt!: Date;
}

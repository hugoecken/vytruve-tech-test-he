import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ScanEntity } from '@api/app/scans/infrastructure/persistence/scan.entity';
import type { PrintRequestStatus } from '../../application/models/print-request.model';

/** TypeORM runtime mapping for the Liquibase-owned print_request table. */
@Entity({ name: 'print_request' })
@Unique('uq_print_request_reference', ['reference'])
@Unique('uq_print_request_active_slot', ['scanId', 'activeSlot'])
@Index('ix_print_request_scan_created', ['scanId', 'createdAt', 'id'])
@Check(
  'ck_print_request_active_slot',
  "(\"status\" IN ('confirmation_pending', 'queued', 'in_progress') AND \"active_slot\" IS TRUE) OR (\"status\" IN ('completed', 'failed') AND \"active_slot\" IS NULL)",
)
export class PrintRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scan_id', type: 'uuid' })
  scanId!: string;

  @ManyToOne(() => ScanEntity, (scan) => scan.printRequests, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'scan_id' })
  scan!: ScanEntity;

  @Column({ length: 12, type: 'varchar' })
  reference!: string;

  @Column({ length: 128, name: 'provider_id', nullable: true, type: 'varchar' })
  providerId!: string | null;

  @Column({ length: 32, type: 'varchar' })
  status!: PrintRequestStatus;

  @Column({ name: 'active_slot', nullable: true, type: 'boolean' })
  activeSlot!: true | null;

  @Column({ name: 'scheduled_start_at', nullable: true, type: 'timestamptz' })
  scheduledStartAt!: Date | null;

  @Column({ name: 'scheduled_end_at', nullable: true, type: 'timestamptz' })
  scheduledEndAt!: Date | null;

  @Column({ name: 'last_observed_at', nullable: true, type: 'timestamptz' })
  lastObservedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    precision: 3,
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    precision: 3,
    type: 'timestamptz',
  })
  updatedAt!: Date;
}

import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

@Entity('submissions')
@Unique(['submissionId'])
export class SubmissionEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  txHash: string;

  @Column()
  @Index()
  runId: string;

  @Column()
  chainFrom: number;

  @Column()
  @Index()
  chainTo: number;

  @Column()
  debridgeId: string;

  @Column()
  receiverAddr: string;

  @Column()
  amount: string;

  @Column()
  @Index()
  status: number;
}

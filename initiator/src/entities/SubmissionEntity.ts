import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import { SubmisionStatusEnum } from '../enums/SubmisionStatusEnum';
import { SubmisionAssetsStatusEnum } from '../enums/SubmisionAssetsStatusEnum';

@Entity('submissions')
@Unique(['submissionId'])
export class SubmissionEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  txHash: string;

  @Column({
    nullable: true,
  })
  @Index()
  runId?: string;

  @Column({
    nullable: true,
  })
  chainFrom?: number;

  @Column({
    nullable: true,
  })
  @Index()
  chainTo?: number;

  @Column({
    nullable: true,
  })
  debridgeId: string;

  @Column({
    nullable: true,
  })
  receiverAddr: string;

  @Column({
    nullable: true,
  })
  amount: string;

  @Column()
  @Index()
  status: SubmisionStatusEnum;

  @Column()
  @Index()
  assetsStatus: SubmisionAssetsStatusEnum;
}

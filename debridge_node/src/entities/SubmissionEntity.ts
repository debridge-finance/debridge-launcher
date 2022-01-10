import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import { SubmisionStatusEnum } from '../enums/SubmisionStatusEnum';
import { SubmisionAssetsStatusEnum } from '../enums/SubmisionAssetsStatusEnum';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';

@Entity('submissions')
@Unique(['submissionId'])
export class SubmissionEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  txHash: string;

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
  rawEvent: string;

  @Column({
    nullable: true,
  })
  signature: string;

  @Column({
    nullable: true,
  })
  ipfsLogHash: string;

  @Column({
    nullable: true,
  })
  ipfsKeyHash: string;

  // ExternalId of signature in debridge system
  @Column({
    nullable: true,
  })
  externalId: string;

  @Column()
  @Index()
  status: SubmisionStatusEnum;

  @Column()
  @Index()
  ipfsStatus: UploadStatusEnum;

  @Column()
  @Index()
  apiStatus: UploadStatusEnum;

  @Column()
  @Index()
  assetsStatus: SubmisionAssetsStatusEnum;
}

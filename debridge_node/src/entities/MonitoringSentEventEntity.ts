import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('monitoring_sent_event')
@Unique(['submissionId'])
export class MonitoringSentEventEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  nonce: number;

  @Column()
  blockNumber: number;

  @Column()
  lockedOrMintedAmount: number;

  @Column()
  totalSupply: number;

  @Column()
  chainId: number;
}

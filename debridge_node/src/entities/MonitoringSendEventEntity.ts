import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('monitoring_send_event')
@Unique(['submissionId'])
export class MonitoringSendEventEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  nonce: number;

  @Column()
  lockedOrMintedAmount: number;

  @Column()
  totalSupply: number;

  @Column()
  chainId: number;
}

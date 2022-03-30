import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('token_balance_history')
@Unique(['debridgeId'])
export class TokenBalanceHistory {
  @PrimaryColumn()
  debridgeId: string;

  @Column()
  chainId: number;

  @Column()
  amount: string;

  @Column({ nullable: true, type: 'bigint' })
  blockTimestamp: number;
}

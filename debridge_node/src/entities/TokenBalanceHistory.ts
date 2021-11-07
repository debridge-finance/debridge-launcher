import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('token_balance_history')
@Unique(['token'])
export class TokenBalanceHistory {
  @PrimaryColumn()
  token: string;

  @Column()
  chainId: string;

  @Column()
  amount: string;
}

import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('aggregator_chains')
@Unique(['chainIdTo'])
export class AggregatorChainEntity {
  @PrimaryColumn()
  chainIdTo: number;

  @Column()
  aggregatorChain: number;
}

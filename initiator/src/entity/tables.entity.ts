import { IsNotEmpty } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';
import { SupportedChain, ChainlinkPersistentConfig, Submissions, AggregatorChains } from '@interfaces/tables.interface';

@Entity('supported_chains')
@Unique(['chainId'])
export class SupportedChainEntity implements SupportedChain {
  @PrimaryColumn()
  chainId: number;

  @Column()
  network: string;

  @Column()
  debridgeAddr: string;

  @Column()
  latestBlock: number;

  @Column()
  provider: string;

  @Column()
  interval: number;
}

@Entity('chainlink_config')
@Unique(['chainId'])
export class ChainlinkPersistentConfigEntity implements ChainlinkPersistentConfig {
  @PrimaryColumn()
  chainId: number;

  @Column()
  cookie: string;

  @Column()
  eiChainlinkUrl: string;

  @Column()
  eiIcAccesskey: string;

  @Column()
  eiIcSecret: string;

  @Column()
  eiCiAccesskey: string;

  @Column()
  eiCiSecret: string;

  @Column()
  mintJobId: string;

  @Column()
  burntJobId: string;

  @Column()
  network: string;
}

@Entity('submissions')
@Unique(['submissionId'])
export class SubmissionsEntity implements Submissions {
  @PrimaryGeneratedColumn()
  submissionId: string;

  @Column()
  txHash: string;

  @Column()
  runId: string;

  @Column()
  chainFrom: number;

  @Column()
  chainTo: number;

  @Column()
  debridgeId: string;

  @Column()
  receiverAddr: string;

  @Column()
  amount: string;

  @Column()
  status: number;
}

@Entity('aggregator_chains')
@Unique(['chainTo'])
export class AggregatorChainsEntity implements AggregatorChains {
  @PrimaryColumn()
  chainTo: number;

  @Column()
  aggregatorChain: number;
}

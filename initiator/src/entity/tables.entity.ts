import { IsNotEmpty } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SupportedChains, ChainlinkConfig, Submissions, AggregatorChains } from '@interfaces/tables.interface';

@Entity()
@Unique(['chainId'])
export class SupportedChainsEntity implements SupportedChains {
  @PrimaryGeneratedColumn()
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

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
@Unique(['chainId'])
export class ChainlinkConfigEntity implements ChainlinkConfig {
  @PrimaryGeneratedColumn()
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

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
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

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
@Unique(['chainTo'])
export class AggregatorChainsEntity implements AggregatorChains {
  @PrimaryGeneratedColumn()
  chainTo: number;

  @Column()
  aggregatorChain: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

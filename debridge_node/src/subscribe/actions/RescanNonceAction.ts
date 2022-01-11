import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IAction } from './IAction';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { AddNewEventsAction } from './AddNewEventsAction';

@Injectable()
export class RescanNonceAction extends IAction {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectConnection()
    private readonly entityManager: EntityManager,
    private readonly addNewEventsAction: AddNewEventsAction,
  ) {
    super();
    this.logger = new Logger(RescanNonceAction.name);
  }

  async process(): Promise<void> {
    const chains = await this.supportedChainRepository.find({});
    for (const chain of chains) {
      const { min, max } = (
        await this.entityManager.query(`
 SELECT MAX(submissions.nonce::numeric) as max, MIN(submissions.nonce::numeric) as min
   FROM submissions WHERE "chainFrom"=${chain.chainId}
       `)
      )[0];
      this.logger.log(`Scanning from ${min} to ${max} in ${chain.chainId} chain`);
      const missNonces = await this.entityManager.query(`
 SELECT generate_series::text as nonce FROM generate_series(${min}, ${max})
     EXCEPT
 SELECT nonce FROM submissions WHERE "chainFrom"=${chain.chainId}
       `);
      for (const { nonce } of missNonces) {
        const blocks = await this.entityManager.query(`
 SELECT s."blockNumber" FROM (SELECT "blockNumber", nonce::numeric as nonce FROM submissions WHERE "chainFrom"=${chain.chainId} ) as s WHERE s.nonce = ${nonce} - 1 OR s.nonce = ${nonce} + 1
       `);
        await this.addNewEventsAction.process(
          chain.chainId,
          Math.min(blocks[0].blockNumber, blocks[1].blockNumber),
          Math.max(blocks[0].blockNumber, blocks[1].blockNumber),
          true,
        );
      }
    }
  }
}

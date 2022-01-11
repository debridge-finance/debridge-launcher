import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { EntityManager, Repository } from 'typeorm';
import { DuplicateNonceEntity } from '../../entities/DublicatedNonceEntity';
import { ChainScanningService } from '../../services/ChainScanningService';
import { ChainScanStatus } from '../../enums/ChainScanStatus';

@Injectable()
export class CheckDuplicatedNonceAction extends IAction {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(DuplicateNonceEntity)
    private readonly duplicateNonceRepository: Repository<DuplicateNonceEntity>,
    @InjectConnection()
    private readonly entityManager: EntityManager,
    private readonly chainScanningService: ChainScanningService,
  ) {
    super();
    this.logger = new Logger(CheckDuplicatedNonceAction.name);
  }

  async process() {
    const supportedChains = await this.supportedChainRepository.find({});
    for (const chain of supportedChains) {
      const nonces = await this.entityManager.query(`
 SELECT nonce FROM submissions WHERE "chainFrom"=${chain.chainId} GROUP BY nonce HAVING COUNT(nonce) > 1
    EXCEPT
SELECT nonce FROM duplicate_nonces WHERE "chainFrom"=${chain.chainId}
       `);
      if (nonces.length > 0) {
        if (this.chainScanningService.status(chain.chainId) === ChainScanStatus.IN_PROGRESS) {
          this.chainScanningService.pause(chain.chainId);
        }
        for (const { nonce } of nonces) {
          await this.duplicateNonceRepository.save({
            nonce: nonce.toString(),
            chainFrom: chain.chainId,
            resolved: false,
          } as DuplicateNonceEntity);
        }
      }
    }
  }
}

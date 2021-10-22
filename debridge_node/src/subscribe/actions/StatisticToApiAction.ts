import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { ProgressInfoDTO } from '../../dto/debridge_api/ValidationProgressDTO';

@Injectable()
export class StatisticToApiAction extends IAction {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    private readonly debridgeApiService: DebrdigeApiService,
  ) {
    super();
    this.logger = new Logger(StatisticToApiAction.name);
  }

  async process(): Promise<void> {
    this.logger.log(`process StatisticToApiAction is started`);
    const chains = await this.supportedChainRepository.find();
    this.logger.debug('chains are found');
    const progressInfo = chains.map(chain => {
      return { chainId: chain.chainId, lastBlock: chain.latestBlock } as ProgressInfoDTO;
    });
    await this.debridgeApiService.uploadStatistic(progressInfo);

    this.logger.log(`process StatisticToApiAction is finished`);
  }
}

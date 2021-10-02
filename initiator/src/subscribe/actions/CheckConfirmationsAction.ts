import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CheckConfirmationsAction implements IAction {
  private readonly logger = new Logger(CheckConfirmationsAction.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AggregatorChainEntity)
    private readonly aggregatorChainsRepository: Repository<AggregatorChainEntity>,
    @InjectRepository(ChainlinkConfigEntity)
    private readonly chainlinkConfigRepository: Repository<ChainlinkConfigEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly chainlinkService: ChainlinkService,
  ) {}

  /**
   * Check confirmation
   * @param {ChainlinkConfigEntity} chainConfig
   */
  private async checkConfirmations(chainConfig: ChainlinkConfigEntity) {
    //get chainTo for current aggregator
    const supportedChains = await this.aggregatorChainsRepository.find({
      aggregatorChain: chainConfig.chainId,
    });
    this.logger.debug(`checkConfirmations ${chainConfig.network} check submissions to network ${supportedChains.map(a => a.chainIdTo)}`);

    const runIds = (
      await this.submissionsRepository.find({
        status: SubmisionStatusEnum.CREATED,
        chainTo: In(supportedChains.map(a => a.chainIdTo)),
      })
    ).map(item => item.runId);

    for (const runId of runIds) {
      const runInfo = await this.chainlinkService.getChainlinkRun(chainConfig.eiChainlinkUrl, runId, chainConfig.cookie);
      if (!runInfo) continue;
      if (runInfo.status == 'completed') {
        await this.submissionsRepository.update(
          { runId },
          {
            status: SubmisionStatusEnum.CONFIRMED,
          },
        );
      }
      if (runInfo.status == 'errored') {
        await this.submissionsRepository.update(
          { runId },
          {
            status: SubmisionStatusEnum.REVERTED,
          },
        );
      }
    }
  }

  async action() {
    const chainConfigs = await this.chainlinkConfigRepository.find();

    for (const chainConfig of chainConfigs) {
      try {
        await this.checkConfirmations(chainConfig);
      } catch (e) {
        this.logger.error(e);
      }
    }
  }
}

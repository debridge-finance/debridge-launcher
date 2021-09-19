import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { In, Repository } from 'typeorm';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import Web3 from 'web3';

@Injectable()
export class CheckNewEvensAction implements IAction {
  private readonly logger = new Logger(CheckNewEvensAction.name);

  private readonly minConfirmations: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(AggregatorChainEntity)
    private readonly aggregatorChainsRepository: Repository<AggregatorChainEntity>,
    @InjectRepository(ChainlinkConfigEntity)
    private readonly chainlinkConfigRepository: Repository<ChainlinkConfigEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly chainlinkService: ChainlinkService,
  ) {
    this.minConfirmations = this.configService.get<number>('MIN_CONFIRMATIONS');
  }

  async action(): Promise<void> {
    this.logger.log(`Check new events`);
    const supportedChainList = await this.supportedChainRepository.find();
    for (const chain of supportedChainList) {
      const chainId = chain.chainId;
      const chainDetail = ChainsConfig.find(item => {
        return item.chainId === chainId;
      });

      const config = await this.chainlinkConfigRepository.findOne({
        chainId,
      });

      const web3 = new Web3(chainDetail.provider);

      const submissionIds = await this.submissionsRepository
        .createQueryBuilder()
        .select('SubmissionEntity.submissionId')
        .distinct(true)
        .where({
          status: SubmisionStatusEnum.NEW,
          chainTo: chainId,
        })
        .getRawMany();

      let runId: string;
      if (submissionIds.length === 1) {
        runId = await this.chainlinkService.postChainlinkRun(
          config.submitJobId,
          submissionIds[0],
          config.eiChainlinkUrl,
          config.eiCiAccesskey,
          config.eiIcSecret,
        );
      } else {
        runId = await this.chainlinkService.postBulkChainlinkRun(
          config.submitJobId,
          submissionIds,
          config.eiChainlinkUrl,
          config.eiCiAccesskey,
          config.eiIcSecret,
          web3,
        );
      }

      const { affected } = await this.submissionsRepository.update(
        {
          submissionId: In(submissionIds),
        },
        {
          status: SubmisionStatusEnum.CREATED,
          runId,
        },
      );

      this.logger.debug(`${affected} submissions is updated`);
    }
  }
}

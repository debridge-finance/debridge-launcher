import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import { AddNewEventsAction } from './actions/AddNewEventsAction';
import { SignAction } from './actions/SignAction';
import { UploadToIPFSAction } from './actions/UploadToIPFSAction';
import { UploadToApiAction } from './actions/UploadToApiAction';
import { CheckAssetsEventAction } from './actions/CheckAssetsEventAction';
import chainConfigs from './../config/chains_config.json';
import { StatisticToApiAction } from './actions/StatisticToApiAction';
import { Web3Service } from '../services/Web3Service';
import { ChainScanningService } from '../services/ChainScanningService';

@Injectable()
export class SubscribeHandler implements OnModuleInit {
  private readonly logger = new Logger(SubscribeHandler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly addNewEventsAction: AddNewEventsAction,
    private readonly signAction: SignAction,
    private readonly uploadToIPFSAction: UploadToIPFSAction,
    private readonly uploadToApiAction: UploadToApiAction,
    private readonly checkAssetsEventAction: CheckAssetsEventAction,
    private readonly statisticToApiAction: StatisticToApiAction,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    private readonly web3Service: Web3Service,
    private readonly chainScanningService: ChainScanningService,
  ) {}

  private async uploadConfig() {
    for (const config of chainConfigs) {
      const configInDd = await this.supportedChainRepository.findOne({
        where: {
          chainId: config.chainId,
        },
      });
      if (config.maxBlockRange <= 100) {
        this.logger.error(`Cant up application maxBlockRange(${config.maxBlockRange}) < 100`);
        process.exit();
      }
      if (config.blockConfirmation <= 8) {
        this.logger.error(`Cant up application maxBlockRange(${config.blockConfirmation}) < 8`);
        process.exit();
      }
      if (!configInDd) {
        await this.supportedChainRepository.save({
          chainId: config.chainId,
          latestBlock: config.firstStartBlock,
          network: config.name,
        });
      }
    }
  }

  private async setupCheckEventsTimeout() {
    const chains = await this.supportedChainRepository.find();

    for (const chain of chains) {
      try {
        const chainDetail = chainConfigs.find(item => {
          return item.chainId === chain.chainId;
        });
        if (!chainDetail) {
          this.logger.error(`${chain.chainId} ChainId from chains_config are not the same with the value from db`);
          process.exit(1);
        }
        const web3 = this.web3Service.web3HttpProvider(chainDetail.provider);

        const web3ChainId = await web3.eth.getChainId();
        if (web3ChainId !== chainDetail.chainId) {
          this.logger.error(`Checking correct RPC from config is failed (in config ${chainDetail.chainId} in rpc ${web3ChainId})`);
          process.exit(1);
        }
      } catch (e) {
        this.logger.error(`Error in validation configs for chain ${chain.chainId}: ${e.message}`);
        process.exit(1);
      }
    }

    for (const chain of chains) {
      this.chainScanningService.start(chain.chainId);
    }
  }

  @Cron('*/3 * * * * *')
  async Sign() {
    await this.signAction.action();
  }

  //TODO: comment out when go orbitDb will ready
  // @Cron('*/3 * * * * *')
  // async UploadToIPFSAction() {
  //   await this.uploadToIPFSAction.action();
  // }

  @Cron('*/3 * * * * *')
  async UploadToApiAction() {
    await this.uploadToApiAction.action();
  }

  @Cron('*/3 * * * * *')
  async checkAssetsEvent() {
    await this.checkAssetsEventAction.action();
  }

  @Cron('* * * * *')
  async UploadStatisticToApiAction() {
    await this.statisticToApiAction.action();
  }

  async onModuleInit() {
    await this.uploadConfig();
    await this.setupCheckEventsTimeout();
  }
}

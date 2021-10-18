import { Injectable, Logger } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import ChainsConfig from '../config/chains_config.json';
import { AddNewEventsAction } from './actions/AddNewEventsAction';
import { SignAction } from './actions/SignAction';
import { UploadToIPFSAction } from './actions/UploadToIPFSAction';
import { UploadToApiAction } from './actions/UploadToApiAction';
import { CheckAssetsEventAction } from './actions/CheckAssetsEventAction';
import chainConfigs from './../config/chains_config.json';

@Injectable()
export class SubscribeHandler {
  private readonly logger = new Logger(SubscribeHandler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly addNewEventsAction: AddNewEventsAction,
    private readonly signAction: SignAction,
    private readonly uploadToIPFSAction: UploadToIPFSAction,
    private readonly uploadToApiAction: UploadToApiAction,
    private readonly checkAssetsEventAction: CheckAssetsEventAction,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
  ) {
    this.init();
  }

  async init() {
    await this.uploadConfig();
    await this.setupCheckEventsTimeout();
  }

  private async uploadConfig() {
    for (const config of chainConfigs) {
      const configInDd = await this.supportedChainRepository.findOne({
        chainId: config.chainId,
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
    chains.forEach(chain => {
      const intervalName = `interval_${chain.chainId}`;
      const callback = async () => {
        try {
          await this.addNewEventsAction.action(chain.chainId);
        } catch (e) {
          this.logger.error(e);
        }
      };

      const chainDetail = ChainsConfig.find(item => {
        return item.chainId === chain.chainId;
      });

      const interval = setInterval(callback, chainDetail.interval);
      this.schedulerRegistry.addInterval(intervalName, interval);
    });
  }

  @Interval(3000)
  async Sign() {
    await this.signAction.action();
  }

  @Interval(3000)
  async UploadToIPFSAction() {
    await this.uploadToIPFSAction.action();
  }

  @Interval(3000)
  async UploadToApiAction() {
    await this.uploadToApiAction.action();
  }

  @Interval(3000)
  async checkAssetsEvent() {
    await this.checkAssetsEventAction.action();
  }
}

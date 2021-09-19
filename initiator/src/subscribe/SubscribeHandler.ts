import { Injectable, Logger } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { SetAllChainlinkCookiesAction } from './actions/SetAllChainlinkCookiesAction';
import { CheckConfirmationsAction } from './actions/CheckConfirmationsAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import ChainsConfig from '../config/chains_config.json';
import { AddNewEventsAction } from './actions/AddNewEventsAction';
import { CheckNewEvensAction } from './actions/CheckNewEventsAction';

@Injectable()
export class SubscribeHandler {
  private readonly logger = new Logger(SubscribeHandler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly setAllChainlinkCookiesAction: SetAllChainlinkCookiesAction,
    private readonly checkConfirmationsAction: CheckConfirmationsAction,
    private readonly addNewEventsAction: AddNewEventsAction,
    private readonly checkNewEvensAction: CheckNewEvensAction,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
  ) {
    this.setupCheckEventsTimeout();
    this.setChainLinkCookies();
  }

  private async setupCheckEventsTimeout() {
    const chains = await this.supportedChainRepository.find();
    chains.forEach(chain => {
      const intervalName = `inteval_${chain.chainId}`;
      if (this.schedulerRegistry.getInterval(intervalName)) {
        this.schedulerRegistry.deleteInterval(intervalName);
      }
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
  async confirmationChecker() {
    await this.checkConfirmationsAction.action();
  }

  @Interval(3000)
  async checkNewEvents() {
    await this.checkNewEvensAction.action();
  }

  @Interval(864000)
  async setChainLinkCookies() {
    await this.setAllChainlinkCookiesAction.action();
  }
}

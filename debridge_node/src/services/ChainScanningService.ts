import { SchedulerRegistry } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { ChainScanStatus } from '../enums/ChainScanStatus';
import chainConfigs from '../config/chains_config.json';
import { AddNewEventsAction } from '../subscribe/actions/AddNewEventsAction';

/**
 * Service for controlling scanning chain
 */
@Injectable()
export class ChainScanningService {
  private readonly logger = new Logger(ChainScanningService.name);
  constructor(private readonly schedulerRegistry: SchedulerRegistry, private readonly addNewEventsAction: AddNewEventsAction) {}

  private static getIntervalName(chainId: number) {
    return `interval_${chainId}`;
  }

  /**
   * Status of scanning chain
   * @param {number} chainId
   */
  status(chainId: number): ChainScanStatus {
    const intervalName = ChainScanningService.getIntervalName(chainId);
    if (this.schedulerRegistry.doesExists('interval', intervalName)) {
      return ChainScanStatus.IN_PROGRESS;
    }
    return ChainScanStatus.PAUSE;
  }

  /**
   * Pause of scanning chain
   * @param {number} chainId
   */
  pause(chainId: number): boolean {
    const intervalName = ChainScanningService.getIntervalName(chainId);
    if (this.status(chainId) === ChainScanStatus.PAUSE) {
      const message = `Cann't pause scanning chain ${chainId}: already paused`;
      this.logger.warn(message);
      return false;
    }
    if (this.status(chainId)) {
      this.schedulerRegistry.deleteInterval(intervalName);
      this.logger.log(`${intervalName} is stopped`);
    }
    return true;
  }

  /**
   * Start of scanning chain
   * @param {number} chainId
   */
  start(chainId: number) {
    const intervalName = `interval_${chainId}`;
    if (this.status(chainId) === ChainScanStatus.IN_PROGRESS) {
      const message = `Cann't start scanning chain ${chainId}: already started`;
      this.logger.warn(message);
      return false;
    }
    const callback = async () => {
      try {
        await this.addNewEventsAction.action(chainId);
      } catch (e) {
        this.logger.error(e);
      }
    };

    const chainDetail = chainConfigs.find(item => {
      return item.chainId === chainId;
    });

    const interval = setInterval(callback, chainDetail.interval);
    this.schedulerRegistry.addInterval(intervalName, interval);
    this.logger.log(`Scanning ${chainId} is started`);
    return true;
  }
}

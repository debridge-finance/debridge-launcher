import { Logger } from '@nestjs/common';
import { LockService } from '../../services/LockService';

/**
 * Interface for doing action in interval
 */
export abstract class IAction {
  logger: Logger;

  private isWorking = false;

  constructor(readonly lockService: LockService, readonly actionName: string) {}

  abstract process(): Promise<void>;

  async action() {
    if (this.isWorking) {
      this.logger.warn('Is working now');
      return;
    }
    try {
      this.isWorking = true;
      await this.lockService.lock(this.actionName);
      this.logger.log(`Is locked`);
      await this.process();
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.isWorking = false;
      await this.lockService.unlock(this.actionName);
      this.logger.log(`Is unlocked`);
    }
  }
}

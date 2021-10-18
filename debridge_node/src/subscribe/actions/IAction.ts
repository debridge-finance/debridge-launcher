import { Logger } from '@nestjs/common';

/**
 * Interface for doing action in interval
 */
export abstract class IAction {
  logger: Logger;

  private isWorking = false;

  abstract process(): Promise<void>;

  async action() {
    if (this.isWorking) {
      this.logger.warn('Is working now');
      return;
    }
    try {
      this.isWorking = true;
      this.logger.log(`Is locked`);
      await this.process();
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.isWorking = false;
      this.logger.log(`Is unlocked`);
    }
  }
}

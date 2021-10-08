import {Logger} from "@nestjs/common";

/**
 * Interface for doing action in interval
 */
export abstract class IAction<T> {
   logger: Logger;

  private isWorking = false;

  abstract process(data?: T): Promise<void>;

  async action(data?: T) {
    try {
      if (this.isWorking) {
        this.logger.warn('Is working now');
        return ;
      }
      this.isWorking = true;
      this.logger.log(`Is locked`);
      await this.process(data);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.isWorking = false;
      this.logger.log(`Is unlocked`);
    }
  }
}

/**
 * LockEntity service
 */
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LockEntity } from '../entities/LockEntity';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly LOCK_INTERVAL = 1000;

  constructor(@InjectRepository(LockEntity) private readonly lockRepository: Repository<LockEntity>, private readonly configService: ConfigService) {}

  private isExpired(lock: LockEntity): boolean {
    const dateNow = Date.now();
    const time = dateNow - lock.date.getTime();
    const lockExpiredTime: number = this.configService.get('LOCK_EXPIRED_TIME');
    const isExpiredResult = time > lockExpiredTime;
    if (isExpiredResult) {
      this.logger.warn(`Action ${lock.action} is expired`);
    }
    return isExpiredResult;
  }

  /**
   * Lock action
   * @param {string} action
   */
  async lock(action: string) {
    const lock = await this.lockRepository.findOne({ action });
    if (!lock) {
      await this.lockRepository.save({ action, date: new Date() });
      return;
    }
    if (this.isExpired(lock)) {
      await this.unlock(action);
      await this.lockRepository.save({ action, date: new Date() });
      return;
    }

    await new Promise(resolve => {
      const interval = setInterval(async () => {
        const lock = await this.lockRepository.findOne({ action });
        if (!lock) {
          await this.lockRepository.save({ action, date: new Date() });
          clearInterval(interval);
          resolve(true);
        }
        if (this.isExpired(lock)) {
          clearInterval(interval);
          await this.unlock(action);
          await this.lockRepository.save({ action, date: new Date() });
          resolve(true);
        }
        this.logger.warn(`Action ${action} is working now`);
      }, this.LOCK_INTERVAL);
    });
  }

  /**
   * Unlock action
   * @param {string} action
   */
  async unlock(action: string) {
    this.logger.verbose(`Unlock action ${action} is stared`);
    try {
      await this.lockRepository.delete({ action });
    } catch (e) {
      this.logger.error(`Unlock action ${action} is failed with error ${e.message}`);
      this.logger.error(e);
      throw e;
    }
    this.logger.verbose(`Action ${action} is unlocked`);
  }
}

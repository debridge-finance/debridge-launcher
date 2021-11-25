import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getHeapStatistics, getHeapCodeStatistics, getHeapSpaceStatistics } from 'v8';
import { writeFile } from 'fs';

@Injectable()
export class MonitoringHandler {
  private readonly logger = new Logger(MonitoringHandler.name);

  @Cron('* * * * *')
  handleHeapInfo() {
    const startDateInfo = new Date().getTime();
    const heapStatistics = getHeapStatistics();
    const heapCodeStatistics = getHeapCodeStatistics();
    const heapSpaceStatistics = getHeapSpaceStatistics();

    const heapInfo = {
      heapStatistics,
      heapCodeStatistics,
      heapSpaceStatistics,
    };
    writeFile('./stats/heap_info.json', JSON.stringify(heapInfo), err => {
      const endDateInfo = new Date().getTime();
      if (err) {
        this.logger.error(`getting heap info is failed`);
      } else {
        this.logger.log(`get heap info is finished ${(endDateInfo - startDateInfo) / 1000}s`);
      }
    });
  }
}

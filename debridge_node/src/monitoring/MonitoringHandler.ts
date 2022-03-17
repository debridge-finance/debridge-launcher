import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getHeapStatistics, getHeapCodeStatistics, getHeapSpaceStatistics } from 'v8';
import { createWriteStream, writeFile } from 'fs';
import { getHeapSnapshot } from 'v8';

@Injectable()
export class MonitoringHandler {
  private readonly logger = new Logger(MonitoringHandler.name);

  @Cron('*/10 * * * *')
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

    const snapshotStream = getHeapSnapshot();
    const fileName = `./stats/dump.heapsnapshot`;

    const fileStream = createWriteStream(fileName);
    snapshotStream.pipe(fileStream);
  }
}

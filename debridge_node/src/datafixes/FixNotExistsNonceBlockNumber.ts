import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FixNotExistsNonceBlockNumber implements OnModuleInit {
  private readonly logger = new Logger(FixNotExistsNonceBlockNumber.name);

  constructor(
    @InjectConnection()
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log(`Start setting Nonce and Blocknumber if not exists`);
    let size = 0;
    do {
      if (this.configService.get('ENABLE_DATAFIX') !== 'true') {
        return;
      }
      const records = await this.entityManager.query(`
 SELECT  "submissionId", "rawEvent" FROM submissions WHERE nonce IS NULL LIMIT 100
       `);
      size = records.length;
      for (const { submissionId, rawEvent } of records) {
        const rawEventJson = JSON.parse(rawEvent);
        await this.entityManager
          .createQueryBuilder()
          .update('submissions')
          .set({
            blockNumber: rawEventJson.blockNumber,
            nonce: parseInt(rawEventJson.returnValues.nonce),
          })
          .where('submissionId = :submissionId', { submissionId });
        this.logger.log(`Nonce and blockNumber are added to submission ${submissionId}`);
      }
    } while (size > 0);
    this.logger.log(`Finish setting Nonce and Blocknumber if not exists`);
  }
}

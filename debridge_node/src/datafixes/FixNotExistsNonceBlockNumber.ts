import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { promisify } from 'util';

@Injectable()
export class FixNotExistsNonceBlockNumber implements OnModuleInit {
  private readonly logger = new Logger(FixNotExistsNonceBlockNumber.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: configService.get('POSTGRES_HOST', 'localhost'),
      port: configService.get<number>('POSTGRES_PORT', 5432),
      user: configService.get('POSTGRES_USER', 'user'),
      password: configService.get('POSTGRES_PASSWORD', 'password'),
      database: configService.get('POSTGRES_DATABASE', 'postgres'),
    });
  }

  async onModuleInit() {
    if (this.configService.get('ENABLE_DATAFIX') !== 'true') {
      return;
    }
    const queryFunc = promisify(this.pool.query).bind(this.pool);
    await queryFunc('ALTER TABLE submissions ADD COLUMN nonce numeric');
    this.logger.log(`Nonce is added to submissions`);

    await queryFunc('ALTER TABLE submissions ADD COLUMN "blockNumber" numeric');
    this.logger.log(`blockNumber is added to submissions`);

    this.logger.log(`Start setting Nonce and Blocknumber if not exists`);
    let size = 0;
    do {
      const { rows: records } = await queryFunc(`SELECT  "submissionId", "rawEvent" FROM submissions WHERE nonce IS NULL LIMIT 100`);
      size = records.length;
      await Promise.allSettled(
        records.map(submission => {
          const { submissionId, rawEvent } = submission;
          const rawEventJson = JSON.parse(rawEvent);
          this.logger.log(`Nonce and blockNumber are added to submission ${submissionId}`);
          return queryFunc('UPDATE submissions SET blockNumber = $1, nonce = $2 WHERE submissionId = $3', [
            rawEventJson.blockNumber,
            parseInt(rawEventJson.returnValues.nonce),
            submissionId,
          ]);
        }),
      );
    } while (size > 0);

    await this.pool.end();
    this.logger.log(`Finish setting Nonce and Blocknumber if not exists`);
  }
}

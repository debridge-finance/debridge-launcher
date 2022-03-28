import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FixNotExistsNonceBlockNumber } from './FixNotExistsNonceBlockNumber';
import { FixNotExistsExecutionFee } from './FixNotExistsExecutionFee';
import { FixNotExistsBlockTimestamp } from './FixNotExistsBlockTimestamp';
import { ChainConfigService } from '../services/ChainConfigService';
import { Web3Service } from '../services/Web3Service';

@Module({
  imports: [ConfigModule],
  providers: [FixNotExistsNonceBlockNumber, FixNotExistsExecutionFee, FixNotExistsBlockTimestamp, ChainConfigService, Web3Service],
})
export class DataFixModule {}

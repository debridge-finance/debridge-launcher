import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FixNotExistsNonceBlockNumber } from './FixNotExistsNonceBlockNumber';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [FixNotExistsNonceBlockNumber],
})
export class DataFixModule {}

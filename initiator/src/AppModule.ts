import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './AppController';
import { AggregatorChainEntity } from './entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from './entities/ChainlinkConfigEntity';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { SubscriberService } from './SubsriberService';
import { ChainlinkService } from './chainlink/ChainlinkService';
import { ChainlinkServiceMock } from './chainlink/ChainlinkServiceMock';
import { chainlinkFactory } from "./chainlink/ChainlinkFactory";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'host'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'user'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_SCHEMA', 'postgres'),
        synchronize: true,
        entities: [AggregatorChainEntity, ChainlinkConfigEntity, SubmissionEntity, SupportedChainEntity],
      }),
    }),
    TypeOrmModule.forFeature([AggregatorChainEntity, ChainlinkConfigEntity, SubmissionEntity, SupportedChainEntity]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: ChainlinkService,
      useClass: chainlinkFactory(),
    },
    SubscriberService,
  ],
})
export class AppModule {}

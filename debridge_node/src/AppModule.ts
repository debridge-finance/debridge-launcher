import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerGuard, ThrottlerModule, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './api/AppController';
import { AuthService } from './api/auth/auth.service';
import { JwtStrategy } from './api/auth/jwt.strategy';
import { GetSupportedChainsService, GetSupportedChainsService } from './api/services/GetSupportedChainsService';
import { RescanService, RescanService } from './api/services/RescanService';
import { DataFixModule, DataFixModule } from './datafixes/DataFixModule';
import { FixNotExistsNonceBlockNumber, FixNotExistsNonceBlockNumber } from './datafixes/FixNotExistsNonceBlockNumber';
import { ConfirmNewAssetEntity, ConfirmNewAssetEntity } from './entities/ConfirmNewAssetEntity';
import { MonitoringSentEventEntity } from './entities/MonitoringSentEventEntity';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { ChainConfigService, ChainConfigService } from './services/ChainConfigService';
import { ChainScanningService, ChainScanningService } from './services/ChainScanningService';
import { DebrdigeApiService, DebrdigeApiService } from './services/DebrdigeApiService';
import { NonceControllingService } from './services/NonceControllingService';
import { OrbitDbService, OrbitDbService } from './services/OrbitDbService';
import { ValidationBalanceService } from './services/ValidationBalanceService';
import { Web3Service, Web3Service } from './services/Web3Service';
import { AddNewEventsAction } from './subscribe/actions/AddNewEventsAction';
import { CheckAssetsEventAction } from './subscribe/actions/CheckAssetsEventAction';
import { StatisticToApiAction } from './subscribe/actions/StatisticToApiAction';
import { UploadToApiAction } from './subscribe/actions/UploadToApiAction';
import { UploadToIPFSAction } from './subscribe/actions/UploadToIPFSAction';

@Module({
  imports: [
    DataFixModule,
    HttpModule.register({
      timeout: 30000, //30s
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('THROTTLER_TTL', 60),
        limit: configService.get('THROTTLER_LIMIT', 10),
      }),
    }),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        logging: false,
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'user'),
        password: configService.get('POSTGRES_PASSWORD', 'password'),
        database: configService.get('POSTGRES_DATABASE', 'postgres'),
        synchronize: true,
        entities: [SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity, MonitoringSentEventEntity],
      }),
    }),
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity, MonitoringSentEventEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AppController],
  providers: [
    Web3Service,
    RescanService,
    JwtStrategy,
    AuthService,
    AddNewEventsAction,
    SignAction,
    UploadToIPFSAction,
    UploadToApiAction,
    NonceControllingService,
    CheckAssetsEventAction,
    SubscribeHandler,
    GetSupportedChainsService,
    OrbitDbService,
    DebrdigeApiService,
    StatisticToApiAction,
    ChainScanningService,
    ChainConfigService,
    ValidationBalanceAction,
    ValidationBalanceService,
    FixNotExistsNonceBlockNumber,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

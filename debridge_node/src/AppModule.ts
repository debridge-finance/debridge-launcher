import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './api/AppController';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './api/auth/jwt.strategy';
import { AuthService } from './api/auth/auth.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AddNewEventsAction } from './subscribe/actions/AddNewEventsAction';
import { SignAction } from './subscribe/actions/SignAction';
import { SubscribeHandler } from './subscribe/SubscribeHandler';
import { CheckAssetsEventAction } from './subscribe/actions/CheckAssetsEventAction';
import { ConfirmNewAssetEntity } from './entities/ConfirmNewAssetEntity';
import { OrbitDbService } from './services/OrbitDbService';
import { DebrdigeApiService } from './services/DebrdigeApiService';
import { UploadToApiAction } from './subscribe/actions/UploadToApiAction';
import { RescanService } from './api/services/RescanService';
import { GetSupportedChainsService } from './api/services/GetSupportedChainsService';
import { UploadToIPFSAction } from './subscribe/actions/UploadToIPFSAction';
import { StatisticToApiAction } from './subscribe/actions/StatisticToApiAction';
import { MonitoringModule } from './monitoring/MonitoringModule';
import { Web3Service } from './services/Web3Service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ChainScanningService } from './services/ChainScanningService';

@Module({
  imports: [
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
    MonitoringModule,
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
        entities: [SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity],
      }),
    }),
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity]),
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
    CheckAssetsEventAction,
    SubscribeHandler,
    GetSupportedChainsService,
    OrbitDbService,
    DebrdigeApiService,
    StatisticToApiAction,
    ChainScanningService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

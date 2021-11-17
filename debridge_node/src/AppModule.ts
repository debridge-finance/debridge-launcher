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

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, //30s
    }),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        logging: true,
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'host'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'user'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_SCHEMA', 'postgres'),
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
    // {
    //   provide: DebrdigeApiService,
    //   useFactory: async () => {
    //     const service = new DebrdigeApiService();
    //     await service.init();
    //     return service;
    //   }
    // },
  ],
})
export class AppModule {}

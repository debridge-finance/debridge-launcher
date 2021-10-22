import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './AppController';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { AuthService } from './auth/auth.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AddNewEventsAction } from './subscribe/actions/AddNewEventsAction';
import { SignAction } from './subscribe/actions/SignAction';
import { SubscribeHandler } from './subscribe/SubscribeHandler';
import { CheckAssetsEventAction } from './subscribe/actions/CheckAssetsEventAction';
import { ConfirmNewAssetEntity } from './entities/ConfirmNewAssetEntity';
import { OrbitDbService } from './services/OrbitDbService';
import { DebrdigeApiService } from './services/DebrdigeApiService';
import { UploadToApiAction } from './subscribe/actions/UploadToApiAction';
import { UpdadToIPFSAction } from './subscribe/actions/UpdadToIPFSAction';
import { StatisticToApiAction } from './subscribe/actions/StatisticToApiAction';

@Module({
  imports: [
    HttpModule,
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
    JwtStrategy,
    AuthService,
    AddNewEventsAction,
    SignAction,
    UpdadToIPFSAction,
    UploadToApiAction,
    CheckAssetsEventAction,
    SubscribeHandler,
    {
      provide: OrbitDbService,
      useFactory: async () => {
        const service = new OrbitDbService();
        await service.init();
        return service;
      },
    },
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

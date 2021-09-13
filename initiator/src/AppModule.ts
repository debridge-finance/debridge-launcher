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
import { chainlinkFactory } from './chainlink/ChainlinkFactory';
import { ChainLinkConfigService } from './chainlink/ChainLinkConfigService';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { AuthService } from './auth/auth.service';

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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: ChainlinkService,
      useClass: chainlinkFactory(),
    },
    SubscriberService,
    ChainLinkConfigService,
    JwtStrategy,
    AuthService,
  ],
})
export class AppModule {}

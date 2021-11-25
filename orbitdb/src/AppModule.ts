import { Module } from '@nestjs/common';
import { OrbitDbService } from './services/OrbitDbService';
import { OrbitDbController } from './contollers/OrbitDbController';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './contollers/auth/auth.service';
import { JwtStrategy } from './contollers/auth/jwt.strategy';
import { MonitoringModule } from './monitoring/MonitoringModule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    MonitoringModule,
  ],
  controllers: [OrbitDbController],
  providers: [OrbitDbService, AuthService, JwtStrategy],
})
export class AppModule {}

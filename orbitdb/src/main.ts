import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './AppModule';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import { Logger } from './utils/Logger';
import { SentryInterceptor } from './contollers/interceptors/SentryInterceptor';

async function bootstrap() {
  dotenv.config();
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new Logger(),
    },
  );

  if (process.env.SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  const configService = app.get<ConfigService>(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('OrbitDB')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();

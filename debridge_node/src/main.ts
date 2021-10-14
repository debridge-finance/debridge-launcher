import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './AppModule';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: ['warn', 'log', 'debug', 'error'],
  });

  const configService = app.get<ConfigService>(ConfigService);

  if (!configService.get('SENTRY_DSN')) {
    console.log(`Not exists SENTRY_DSN`);
    process.exit();
  }

  Sentry.init({
    dsn: configService.get('SENTRY_DSN'),
  });

  const config = new DocumentBuilder().setTitle('Initiator').setVersion('1.0').addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();

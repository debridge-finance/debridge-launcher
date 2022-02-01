import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './AppModule';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import { Logger } from './Logger';

async function bootstrap() {
  dotenv.config();
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: new Logger(),
  });

  const configService = app.get<ConfigService>(ConfigService);

  const config = new DocumentBuilder().setTitle('Initiator').setVersion('1.0').addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  console.log('process.pid :>> ', process.pid);
  process.abort();
  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();

const timer = (ms: number) => new Promise(res => setTimeout(res, ms));
async function addToSentry(message: string | any) {
  const eventId = Sentry.captureException(new Error(message));
  await timer(10000);
  console.log('eventId', eventId);
}

process.on('SIGHUP', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGHUP`;
    await addToSentry(message);

    process.exit(1);
  }
});
process.on('SIGINT', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGINT`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGQUIT', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGQUIT`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGILL', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGILL`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGTRAP', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGTRAP`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGABRT', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGABRT`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGBUS', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGBUS`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGFPE', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGFPE`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGUSR1', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGUSR1`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGSEGV', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGSEGV`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGUSR2', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGUSR2`;
    await addToSentry(message);
    process.exit(1);
  }
});
process.on('SIGTERM', async () => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: SIGTERM`;
    await addToSentry(message);
    process.exit(1);
  }
});

process.on('uncaughtException', async (reason: string) => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: ${reason}`;

    await addToSentry(message);
    process.exit(1);
  }
});
process.on('unhandledRejection', async (error: any) => {
  if (process.env.SENTRY_DSN) {
    const message = `App is stopped: ${error}`;
    await addToSentry(message);
    process.exit(1);
  }
});

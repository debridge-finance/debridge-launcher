import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/minimal';
import gelfLog from 'gelf-pro';

export class Logger extends ConsoleLogger {
  constructor() {
    super();
    gelfLog.setConfig({ adapterOptions: { host: process.env.GELF_HOST, port: parseInt(process.env.GELF_PORT) } });
  }

  error(message: any, stack?: string) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`[${stack}] ${message}`);
    }
    gelfLog.message(`[${stack}] ${message}`, 3);
    super.error(`[${stack}] ${message}`);
  }

  warn(message: any, stack?: string) {
    gelfLog.message(`[${stack}] ${message}`, 4);
    super.warn(`[${stack}] ${message}`);
  }

  verbose(message: any, stack?: string) {
    gelfLog.message(`[${stack}] ${message}`, 7);
    super.verbose(`[${stack}] ${message}`);
  }

  debug(message: any, stack?: string) {
    gelfLog.message(`[${stack}] ${message}`, 7);
    super.debug(`[${stack}] ${message}`);
  }

  info(message: any, stack?: string) {
    gelfLog.message(`[${stack}] ${message}`, 6);
    super.log(`[${stack}] ${message}`);
  }
}

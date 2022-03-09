import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/minimal';

export class Logger extends ConsoleLogger {
  error(message: any, stack?: string) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`[${stack}] ${message}`);
    }
    super.error(`[${stack}] ${message}`);
  }
}

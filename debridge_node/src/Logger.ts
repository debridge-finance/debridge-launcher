import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/minimal';

export class Logger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message);
    }
    super.error(`[${stack}] ${message}`);
  }
}

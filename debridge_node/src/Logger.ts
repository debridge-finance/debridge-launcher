import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/minimal';

export class Logger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    Sentry.captureMessage(message);
    super.error(message, stack, context);
  }
}

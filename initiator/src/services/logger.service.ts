import log4js from 'log4js';
import { Logger } from '~/interfaces/logger.interface';

const log4jsConfig: log4js.Configuration = {
  appenders: {
    access: {
      type: 'file',
      filename: 'log/app.log',
      maxLogSize: 1073741824,
      backups: 5,
      compress: true,
      encoding: 'utf-8',
    },
    errorFile: {
      type: 'file',
      filename: 'log/errors.log',
    },
    errors: {
      type: 'logLevelFilter',
      level: 'ERROR',
      appender: 'errorFile',
    },
    out: {
      type: 'stdout',
    },
  },
  categories: {
    default: {
      appenders: ['access', 'errors', 'out'],
      level: 'DEBUG',
    },
    http: {
      appenders: ['access'],
      level: 'DEBUG',
    },
  },
};

export class LoggerService implements Logger {
  private logger: any;
  constructor(category: string) {
    this.logger = log4js.configure(log4jsConfig).getLogger(category);
  }

  debug(message: any, ...args: any[]) {
    this.logger.debug(message, ...args);
  }

  info(message: any, ...args: any[]) {
    this.logger.info(message, ...args);
  }

  error(message: any, ...args: any[]) {
    this.logger.error(message, ...args);
  }
}

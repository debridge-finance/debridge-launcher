import { Logger } from './logger.interface';

export interface DbConfig {
  connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

export interface DbEnv {
  config: DbConfig;
  logger: Logger;
}

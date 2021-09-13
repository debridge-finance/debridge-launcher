import { Subscriber } from '~/subscriber';
import { Logger } from './logger.interface';

export interface App {
  listen: () => void;
}

export interface AppConfig {
  port: number;
}

export interface AppEnv {
  config: AppConfig;
  logger: Logger;
  subscriber: Subscriber; // TODO replace with service
}

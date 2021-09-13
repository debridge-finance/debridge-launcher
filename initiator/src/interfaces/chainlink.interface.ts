import { Subscriber } from '~/subscriber';
import { Logger } from './logger.interface';

export interface Chainlink {
  listen: () => void;
}

export interface ChainlinkConfig {
  credentials: {
    email: string;
    password: string;
  };
}

export interface ChainlinkEnv {
  config: ChainlinkConfig;
  logger: Logger;
  // TODO: move axios to env
}

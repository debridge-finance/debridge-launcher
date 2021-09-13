import { Db } from '~/db';
import { Chainlink } from '~/services/chainlink.service';
import { Logger } from './logger.interface';

export interface Subscriber {
  init: () => Promise<void>;
}

export interface SubscriberConfig {
  minConfirmations: number;
}

export interface SubscriberEnv {
  config: SubscriberConfig;
  db: Db; // TODO replace with service
  chainlink: Chainlink; // TODO replace with service
  logger: Logger;
}

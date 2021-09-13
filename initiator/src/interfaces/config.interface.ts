import { AppConfig } from './app.interface';
import { DbConfig } from './db.interface';
import { SubscriberConfig } from './subscriber.interface';
import { ChainlinkConfig } from './chainlink.interface';

export interface Config {
  app: AppConfig;
  db: DbConfig;
  subscriber: SubscriberConfig;
  chainlink: ChainlinkConfig;
}

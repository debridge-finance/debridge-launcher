import config from './config';
import App from './app';
import { LoggerService } from './services/logger.service';
import { Db } from './db';
import { Chainlink } from './services/chainlink.service';
import { SubscriberService } from './services/subscriber.service';

const db = new Db({
  config: config.db,
  logger: new LoggerService('db'),
});

const chainlink = new Chainlink({
  config: config.chainlink,
  logger: new LoggerService('chainlink'),
});

const subscriber = new SubscriberService({
  config: config.subscriber,
  db: db,
  chainlink: chainlink,
  logger: new LoggerService('subscriber'),
});

const app = new App({
  config: config.app,
  subscriber: subscriber,
  logger: new LoggerService('startup'),
});

app.listen();

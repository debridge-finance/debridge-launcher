import express from 'express';
import bodyParser from 'body-parser';
import { AppConfig, AppEnv } from './interfaces/app.interface';
import { Logger } from './interfaces/logger.interface';
import { Subscriber } from './interfaces/subscriber.interface';

class App {
  private app: express.Application;
  private config: AppConfig;
  private log: Logger;
  private subscriber: Subscriber;

  constructor({ config, logger, subscriber }: AppEnv) {
    this.app = express();
    this.config = config;
    this.subscriber = subscriber;
    this.log = logger;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  public listen() {
    this.app.listen(this.config.port, async () => {
      this.log.info(`App now running on port ${this.config.port} with pid ${process.pid}`);

      try {
        await this.subscriber.init();
      } catch (e) {
        this.log.error(e);
        process.exit(1);
      }
    });
  }

  private initializeMiddlewares() {
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
  }

  private initializeRoutes() {
    this.app.get('/', function (req, res) {
      res.sendStatus(200);
    });

    this.app.post('/jobs', function (req, res) {
      res.sendStatus(200);
    });
  }
}

export default App;

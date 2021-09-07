process.env['NODE_CONFIG_DIR'] = __dirname + '/config';

import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();
import express from 'express';
import bodyParser from 'body-parser';
import { Subscriber } from './subscriber';
import log4js from 'log4js';
log4js.configure('./src/config/log4js.json');

class App {
  public app: express.Application;
  public port: string | number;
  public env: string;
  public log: log4js.Logger;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 8080;
    this.env = process.env.NODE_ENV || 'development';
    this.log = log4js.getLogger('startup');

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  public listen() {
    this.app.listen(this.port, async () => {
      this.log.info(`App now running on port ${this.port} with pid ${process.pid}`);

      try {
        const subscriber = new Subscriber();
        await subscriber.init();
      } catch (e) {
        this.log.error(e);
        process.exit(1);
      }
    });
  }

  public getServer() {
    return this.app;
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

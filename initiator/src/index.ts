import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();
import express from 'express';
import bodyParser from 'body-parser';
const app = express();
import { Subscriber } from './subscriber';

import log4js from 'log4js';
log4js.configure('./src/config/log4js.json');
const log = log4js.getLogger('startup');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.sendStatus(200);
});

app.post('/jobs', function (req, res) {
  res.sendStatus(200);
});

const port = process.env.PORT || 8080;
const server = app.listen(port, async function () {
  log.info(`App now running on port ${port} with pid ${process.pid}`);

  try {
    const subscriber = new Subscriber();
    await subscriber.init();
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
});

import dotenv from 'dotenv';
import { Config } from './interfaces/config.interface';

dotenv.config();

const config: Config = {
  app: {
    port: parseInt(process.env.APP_PORT, 10) || 8080,
  },
  db: {
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.EI_DATABASE,
    },
  },
  subscriber: {
    minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS, 10),
  },
  chainlink: {
    credentials: {
      email: process.env.CHAINLINK_EMAIL,
      password: process.env.CHAINLINK_PASSWORD,
    },
  },
};

export default config;

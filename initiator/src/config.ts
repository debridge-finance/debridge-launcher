import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  db: {
    connection: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT, 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.EI_DATABASE,
    },
    typeorm: {
      type: 'postgres' as const,
      synchronize: true,
      logging: false,
      migrationsRun: true,
      entities: [path.join(__dirname, './entity/*.entity{.ts,.js}')],
      migrations: [path.join(__dirname, './migrations/migration{.ts,.js}')],
      subscribers: [path.join(__dirname, './**/*.subscriber{.ts,.js}')],
      cli: {
        entitiesDir: 'src/entity',
        migrationsDir: 'src/migrations',
        subscribersDir: 'src/subscriber',
      },
    },
  },
};

export default config;

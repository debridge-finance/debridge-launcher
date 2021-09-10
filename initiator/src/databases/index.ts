import { ConnectionOptions } from 'typeorm';

import config from '~/config';

export const dbConnection: ConnectionOptions = {
  ...config.db.connection,
  ...config.db.typeorm,
};

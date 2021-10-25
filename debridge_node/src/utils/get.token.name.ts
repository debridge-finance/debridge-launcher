import { Logger } from '@nestjs/common';

export interface GetTokenNameParameters {
  logger: Logger;
}

export async function getTokenName(instance, address: string, { logger }: GetTokenNameParameters): Promise<string> {
  logger.verbose(`Getting name from ${address} is started`);
  let name = '';
  try {
    name = await instance.methods.name().call();
    logger.verbose(`Getting name from ${address} is finished`);
  } catch (e) {
    if (e.message === 'Returned error: execution reverted') {
      name = '';
      logger.warn(`${address} has not name`);
    } else {
      logger.error(e.message);
      throw e;
    }
  }
  return name;
}

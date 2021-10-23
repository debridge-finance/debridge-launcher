import { Logger } from '@nestjs/common';

export interface CreateProxyParameters {
  logger: Logger;
}

export function createProxy<T>(obj: T, { logger }: CreateProxyParameters): T {
  const validator = {
    get: (target, key) => {
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], validator);
      } else if (typeof target[key] === 'function') {
        const origMethod = target[key];
        return function (...args) {
          let result;
          try {
            result = origMethod.apply(this, args);
          } catch (e) {
            logger.error(`Error in execution ${key} with ${e.message} ${e}`);
            throw e;
          }
          return result;
        };
      } else {
        return target[key];
      }
    },
  };

  return new Proxy(obj, validator);
}

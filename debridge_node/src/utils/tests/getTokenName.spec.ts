import { getTokenName } from '../getTokenName';
import { Logger } from '@nestjs/common';
const logger = new Logger();

function generate(call) {
  return {
    methods: {
      name: () => {
        return {
          call,
        };
      },
    },
  };
}

describe('getTokenName', () => {
  it('should return name', async () => {
    const name = 'name';
    const call = async () => {
      return name;
    };
    await expect(getTokenName(generate(call), '', { logger })).resolves.toBe(name);
  });

  it('should return empty', async () => {
    const message = 'Returned error: execution reverted';
    const call = async () => {
      throw new Error(message);
    };
    await expect(getTokenName(generate(call), '', { logger })).resolves.toBe('');
  });

  it('should return error', async () => {
    const error = new Error('Error');
    const call = async () => {
      throw error;
    };
    await expect(getTokenName(generate(call), '', { logger })).rejects.toBe(error);
  });
});

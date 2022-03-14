import { Web3Service } from '../Web3Service';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ChainConfigService } from '../ChainConfigService';

jest.mock('../../config/chains_config.json', () => {
  return [
    {
      chainId: 970,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      provider: 'https://debridge.io',
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
    {
      chainId: 971,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      providers: ['https://debridge.io', 'debridge.io'],
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
    {
      chainId: 972,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      providers: [
        {
          provider: 'debridge.io',
          user: 'anton',
          password: '123',
          authType: 'BASIC',
        },
      ],
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
  ];
});

jest.mock('web3', () => {
  return class {
    static providers = {
      HttpProvider: class {
        constructor(public provider: string, public config: object) {}
      },
    };

    provider: string;

    constructor(obj) {
      this.provider = obj.provider;
    }

    eth = {
      getChainId: async () => {
        return 970;
      },

      getBlockNumber: async () => {
        if (this.provider === 'https://debridge.io') {
          throw new Error();
        }
        return 0;
      },
    };
  };
});

describe('Web3Service', () => {
  let web3Service: Web3Service;
  let chainConfigService: ChainConfigService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [Web3Service, ChainConfigService],
    }).compile();

    web3Service = module.get(Web3Service);
    chainConfigService = module.get(ChainConfigService);
  });

  it('validateChainId', async () => {
    const config = chainConfigService.get(970);
    jest.spyOn(config.providers, 'setProviderValidationStatus');
    await web3Service.validateChainId(config.providers, 'https://debridge.io');
    expect(config.providers.setProviderValidationStatus).toHaveBeenCalledWith('https://debridge.io', true);
    const notValidConfig = chainConfigService.get(971);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(code.toString());
    });
    await web3Service.validateChainId(notValidConfig.providers, 'https://debridge.io');
    await expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('web3HttpProvider', async () => {
    const config = chainConfigService.get(971);
    config.providers.setProviderValidationStatus('https://debridge.io', true);
    config.providers.setProviderValidationStatus('debridge.io', true);
    expect((await web3Service.web3HttpProvider(config.providers)).chainProvider).toBe('debridge.io');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ChainScanningService } from '../ChainScanningService';
import { ScheduleModule } from '@nestjs/schedule';
import { AddNewEventsAction } from '../../subscribe/actions/AddNewEventsAction';
import { ChainScanStatus } from '../../enums/ChainScanStatus';
import { ChainConfigService } from '../ChainConfigService';

jest.mock('../../config/chains_config.json', () => {
  return [
    {
      chainId: 97,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      provider: 'https://debridge.io',
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
  ];
});

describe('ChainScanningService', () => {
  let service: ChainScanningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: AddNewEventsAction,
          useValue: {
            action: async chainId => {
              return chainId;
            },
          },
        },
        ChainScanningService,
        ChainConfigService,
      ],
    }).compile();
    service = module.get(ChainScanningService);
  });

  describe('ChainScanningService', () => {
    it('Test ChainScanningService', async () => {
      expect(service.status(97)).toBe(ChainScanStatus.PAUSE);
      service.start(97);
      expect(service.status(97)).toBe(ChainScanStatus.IN_PROGRESS);
      service.pause(97);
      expect(service.status(97)).toBe(ChainScanStatus.PAUSE);
      service.start(97);
      expect(service.status(97)).toBe(ChainScanStatus.IN_PROGRESS);
      service.pause(97);
      expect(service.status(97)).toBe(ChainScanStatus.PAUSE);
    });
  });
});

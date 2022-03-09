import { Test, TestingModule } from '@nestjs/testing';
import { ChainScanningService } from '../ChainScanningService';
import { ScheduleModule } from '@nestjs/schedule';
import { AddNewEventsAction } from '../../subscribe/actions/AddNewEventsAction';
import { ChainScanStatus } from '../../enums/ChainScanStatus';

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

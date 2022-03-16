import { Test, TestingModule } from '@nestjs/testing';
import { NonceControllingService } from '../NonceControllingService';
import { getEntityManagerToken } from '@nestjs/typeorm/dist/common/typeorm.utils';

describe('NonceControllingService', () => {
  let service: NonceControllingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonceControllingService,
        {
          provide: getEntityManagerToken(),
          useValue: {
            query: async () => {
              return [
                {
                  chainFrom: 97,
                  max: 10,
                },
                {
                  chainFrom: 42,
                  max: 100,
                },
              ];
            },
          },
        },
      ],
    }).compile();
    service = module.get(NonceControllingService);
    await service.onModuleInit();
  });

  describe('NonceControllingService', () => {
    it('Test NonceControllingService', async () => {
      expect(service.get(98)).toBeUndefined();
      expect(service.get(97)).toBe(10);
      expect(service.get(42)).toBe(100);
      service.set(97, 11);
      expect(service.get(97)).toBe(11);
    });
  });
});

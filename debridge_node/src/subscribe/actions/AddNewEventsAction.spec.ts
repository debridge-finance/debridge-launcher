import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfigModule } from '@nestjs/config';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { HttpModule } from '@nestjs/axios';
import { AddNewEventsAction } from './AddNewEventsAction';
import spyOn = jest.spyOn;

describe('AddNewEventsAction', () => {
  let service: AddNewEventsAction;
  let repositorySubmissionEntity: Repository<SubmissionEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {
            find: async () => {
              return [
                {
                  chainId: 97,
                  latestBlock: 100,
                  network: 'etc',
                } as SupportedChainEntity,
              ];
            },
          },
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            save: async (submissionEntity: SubmissionEntity) => {
              return submissionEntity;
            },
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              distinct: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawMany: () => {
                return ['test'];
              },
            })),
            findOne: async () => {
              return undefined;
            },
            find: async () => {
              return [
                { chainFrom: 1, chainTo: 2, submissionId: '1' } as SubmissionEntity,
                {
                  chainFrom: 3,
                  chainTo: 4,
                  debridgeId: '123',
                  submissionId: 'test',
                } as SubmissionEntity,
              ];
            },
            update: async () => {
              return { affected: 1 };
            },
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            findOne: async ({ debridgeId }: { debridgeId?: string }) => {
              if (debridgeId) {
                return {
                  debridgeId,
                } as ConfirmNewAssetEntity;
              }
              return undefined;
            },
            save: async (entity: ConfirmNewAssetEntity) => {
              return entity;
            },
            update: async () => {
              return { affected: 0 };
            },
          },
        },
        AddNewEventsAction,
      ],
    }).compile();
    service = module.get(AddNewEventsAction);
    repositorySubmissionEntity = module.get(getRepositoryToken(SubmissionEntity));
  });

  describe('AddNewEventsAction', () => {
    it('AddNewEventsAction getEvents with from >= to', async () => {
      const result = await service.getEvents({}, 10, 9);
      expect(result).toBeUndefined();
    });

    it('AddNewEventsAction getEvents', async () => {
      const mock = {
        getPastEvents: () => {
          return [];
        },
      };
      const result = await service.getEvents(mock, 9, 11);
      expect(result).toEqual([]);
    });

    it('AddNewEventsAction processNewTransfers emptyEvents', async () => {
      const result = await service.processNewTransfers([], 97);
      expect(result).toEqual(true);
    });

    it('AddNewEventsAction processNewTransfers', async () => {
      spyOn(repositorySubmissionEntity, 'save');
      await service.processNewTransfers(
        [
          {
            returnValues: {
              submissionId: '123',
              chainIdTo: '123',
            },
          },
        ],
        97,
      );
      expect(repositorySubmissionEntity.save).toHaveBeenCalled();
    });
  });
});

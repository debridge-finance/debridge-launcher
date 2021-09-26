import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfigModule } from '@nestjs/config';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { ChainlinkServiceMock } from '../../chainlink/ChainlinkServiceMock';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { HttpModule } from '@nestjs/axios';
import { AddNewEventsAction } from './AddNewEventsAction';
import spyOn = jest.spyOn;

describe('AddNewEventsAction', () => {
  let service: AddNewEventsAction;
  let repositorySubmissionEntity: Repository<SubmissionEntity>;

  let chainlinkService: ChainlinkService;

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
          provide: getRepositoryToken(AggregatorChainEntity),
          useValue: {
            findOne: (entity: Partial<SupportedChainEntity>) => {
              return { chainId: 97, network: 'test', latestBlock: 80 } as SupportedChainEntity;
            },
            find: (entity: Partial<SupportedChainEntity>) => {
              return [{ chainId: 97, network: 'test', latestBlock: 80 } as SupportedChainEntity];
            },
          },
        },
        {
          provide: getRepositoryToken(ChainlinkConfigEntity),
          useValue: {
            findOne: async () => {
              return {
                chainId: 97,
                eiChainlinkUrl: 'test',
                network: 'network',
                cookie: 'test',
              } as ChainlinkConfigEntity;
            },
            find: async () => {
              return [
                {
                  chainId: 97,
                  eiChainlinkUrl: 'test',
                  network: 'network',
                  cookie: 'test',
                } as ChainlinkConfigEntity,
              ];
            },
            update: async (any, entity: Partial<ChainlinkConfigEntity>) => {
              return { affected: 1 };
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
            update: async (any, entity: Partial<SubmissionEntity>) => {
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
            update: async (any, entity: Partial<ConfirmNewAssetEntity>) => {
              return { affected: 0 };
            },
          },
        },
        {
          provide: ChainlinkService,
          useClass: ChainlinkServiceMock,
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
      expect(result).toEqual({
        sentEvents: [],
        burntEvents: [],
      });
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

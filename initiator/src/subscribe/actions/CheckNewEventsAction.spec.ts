import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfigModule } from '@nestjs/config';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { In, Repository } from 'typeorm';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { ChainlinkServiceMock } from '../../chainlink/ChainlinkServiceMock';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { HttpModule } from '@nestjs/axios';
import { CheckNewEvensAction } from './CheckNewEventsAction';

describe('CheckNewEvensAction', () => {
  let service: CheckNewEvensAction;
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
            find: async () => {
              return [{ chainFrom: 1, chainTo: 2, submissionId: 'test' } as SubmissionEntity];
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
        CheckNewEvensAction,
      ],
    }).compile();
    service = module.get(CheckNewEvensAction);
    repositorySubmissionEntity = module.get(getRepositoryToken(SubmissionEntity));

    chainlinkService = module.get(ChainlinkService);
  });

  describe('CheckNewEvensAction', () => {
    it('CheckNewEvensAction with 1 submittion', async () => {
      jest.spyOn(chainlinkService, 'postChainlinkRun');

      jest.spyOn(repositorySubmissionEntity, 'update');

      await service.action();

      expect(chainlinkService.postChainlinkRun).toHaveBeenCalled();

      expect(repositorySubmissionEntity.update).toHaveBeenCalledWith(
        {
          submissionId: In(['test']),
        },
        {
          status: SubmisionStatusEnum.CREATED,
          runId: '5e9ea5d1-f09b-42bb-89f3-08e64fc79694',
        },
      );
    });
  });
});

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
import { CheckAssetsEventAction } from './CheckAssetsEventAction';
import { CheckConfirmationsAction } from './CheckConfirmationsAction';

describe('CheckConfirmationsAction', () => {
  let service: CheckConfirmationsAction;
  let repositorySubmissionEntity: Repository<SubmissionEntity>;

  let chainlinkService: ChainlinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AggregatorChainEntity),
          useValue: {
            find: (entity: Partial<SupportedChainEntity>) => {
              return [{ chainId: 97, network: 'test', latestBlock: 80 } as SupportedChainEntity];
            },
          },
        },
        {
          provide: getRepositoryToken(ChainlinkConfigEntity),
          useValue: {
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
              return [
                { chainFrom: 1, chainTo: 2, submissionId: '1', runId: 'test' } as SubmissionEntity,
                {
                  chainFrom: 3,
                  chainTo: 4,
                  debridgeId: '123',
                  submissionId: '2',
                  runId: 'test',
                } as SubmissionEntity,
              ];
            },
            update: async (any, entity: Partial<SubmissionEntity>) => {
              return { affected: 0 };
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
        CheckConfirmationsAction,
      ],
    }).compile();
    service = module.get(CheckConfirmationsAction);
    repositorySubmissionEntity = module.get(getRepositoryToken(SubmissionEntity));

    chainlinkService = module.get(ChainlinkService);
  });

  describe('CheckConfirmationsAction', () => {
    it('CheckConfirmationsAction', async () => {
      jest.spyOn(chainlinkService, 'getChainlinkRun');
      jest.spyOn(repositorySubmissionEntity, 'update');

      await service.action();

      expect(chainlinkService.getChainlinkRun).toHaveBeenCalledWith('test', 'test', 'test');
      expect(repositorySubmissionEntity.update).toHaveBeenCalledWith(
        { runId: 'test' },
        {
          status: SubmisionStatusEnum.CONFIRMED,
        },
      );
    });
  });
});

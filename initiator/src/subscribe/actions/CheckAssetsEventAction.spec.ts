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
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';

describe('CheckAssetsEventAction', () => {
  let service: CheckAssetsEventAction;
  let repositorySubmissionEntity: Repository<SubmissionEntity>;
  let repositoryConfirmNewAssetEntity: Repository<ConfirmNewAssetEntity>;

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
          useValue: {},
        },
        {
          provide: getRepositoryToken(ChainlinkConfigEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: async () => {
              return [
                { chainFrom: 1, chainTo: 2, submissionId: '1' } as SubmissionEntity,
                {
                  chainFrom: 3,
                  chainTo: 4,
                  debridgeId: '123',
                  submissionId: '2',
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
        CheckAssetsEventAction,
      ],
    }).compile();
    service = module.get(CheckAssetsEventAction);
    repositorySubmissionEntity = module.get(getRepositoryToken(SubmissionEntity));
    repositoryConfirmNewAssetEntity = module.get(getRepositoryToken(ConfirmNewAssetEntity));
  });

  describe('CheckAssetsEventAction', () => {
    it('CheckAssetsEventAction', async () => {
      jest.spyOn(repositorySubmissionEntity, 'update');
      jest.spyOn(repositoryConfirmNewAssetEntity, 'save');
      await service.action();

      expect(repositorySubmissionEntity.update).toHaveBeenCalledWith(
        {
          submissionId: In(['1']),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS,
          status: SubmisionStatusEnum.NEW,
        },
      );

      expect(repositorySubmissionEntity.update).toHaveBeenLastCalledWith(
        {
          submissionId: In(['2']),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_CREATE,
          status: SubmisionStatusEnum.NEW,
        },
      );

      expect(repositoryConfirmNewAssetEntity.save).toHaveBeenCalled();
    });
  });
});

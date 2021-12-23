import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfigModule } from '@nestjs/config';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { In, Repository } from 'typeorm';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { HttpModule } from '@nestjs/axios';
import { CheckNewEvensAction } from './CheckNewEventsAction';

describe('CheckNewEvensAction', () => {
  let service: CheckNewEvensAction;
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
            find: async () => {
              return [{ chainFrom: 1, chainTo: 2, submissionId: 'test' } as SubmissionEntity];
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
        CheckNewEvensAction,
      ],
    }).compile();
    service = module.get(CheckNewEvensAction);
    repositorySubmissionEntity = module.get(getRepositoryToken(SubmissionEntity));
  });

  describe('CheckNewEvensAction', () => {
    it('CheckNewEvensAction with 1 submittion', async () => {
      jest.spyOn(repositorySubmissionEntity, 'update');

      await service.action();

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

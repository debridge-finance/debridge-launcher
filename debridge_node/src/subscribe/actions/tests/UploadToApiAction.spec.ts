import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../entities/ConfirmNewAssetEntity';
import { DebrdigeApiService } from '../../../services/DebrdigeApiService';
import { UploadToApiAction } from '../UploadToApiAction';
import { Repository } from 'typeorm';
import { UploadStatusEnum } from '../../../enums/UploadStatusEnum';
import { Web3Service } from '../../../services/Web3Service';

describe('UploadToApiAction', () => {
  let service: UploadToApiAction;
  let submissionRepository: Repository<SubmissionEntity>;
  let confirmNewAssetRepository: Repository<ConfirmNewAssetEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        UploadToApiAction,
        {
          provide: DebrdigeApiService,
          useValue: {
            uploadToApi: async (submissions: []) => {
              return submissions;
            },
            uploadConfirmNewAssetsToApi: async () => {
              return { registrationId: '12345' };
            },
          },
        },
        {
          provide: Web3Service,
          useValue: {
            web3: () => {
              return {
                eth: {
                  accounts: {
                    decrypt: () => {
                      return {
                        sign: (signature: string) => {
                          return { signature };
                        },
                      };
                    },
                  },
                },
              };
            },
          },
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: async () => {
              return [
                {
                  submissionId: '123',
                  registrationId: '1234',
                },
              ];
            },
            update: async input => {
              return input;
            },
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            find: async () => {
              return [
                {
                  deployId: '1',
                },
              ];
            },
            update: async input => {
              return input;
            },
          },
        },
      ],
    }).compile();
    service = module.get(UploadToApiAction);
    submissionRepository = module.get(getRepositoryToken(SubmissionEntity));
    confirmNewAssetRepository = module.get(getRepositoryToken(ConfirmNewAssetEntity));
  });

  it('Update Submission', async () => {
    jest.spyOn(submissionRepository, 'update');
    await service.process();
    expect(submissionRepository.update).toHaveBeenCalledWith(
      {
        submissionId: '123',
      },
      {
        apiStatus: UploadStatusEnum.UPLOADED,
        externalId: '1234',
      },
    );
  });

  it('Update ConfirmNewAssets', async () => {
    jest.spyOn(confirmNewAssetRepository, 'update');
    await service.process();
    expect(confirmNewAssetRepository.update).toHaveBeenCalledWith(
      {
        deployId: '1',
      },
      {
        apiStatus: UploadStatusEnum.UPLOADED,
        externalId: '12345',
      },
    );
  });
});

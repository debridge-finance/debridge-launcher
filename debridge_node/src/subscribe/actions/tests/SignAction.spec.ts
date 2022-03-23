import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../entities/ConfirmNewAssetEntity';
import { SignAction } from '../SignAction';
import { Repository } from 'typeorm';
import { SubmisionStatusEnum } from '../../../enums/SubmisionStatusEnum';
import { Web3Service } from '../../../services/Web3Service';

describe('SignAction', () => {
  let service: SignAction;
  let repository: Repository<SubmissionEntity>;
  jest.mock('fs');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        SignAction,
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
                },
              ];
            },
            update: async () => {
              return;
            },
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            find: async () => {
              return [];
            },
          },
        },
      ],
    }).compile();
    service = module.get(SignAction);
    repository = module.get(getRepositoryToken(SubmissionEntity));
  });

  it('test SignAction', async () => {
    jest.spyOn(repository, 'update');
    await service.process();
    expect(repository.update).toHaveBeenCalledWith(
      {
        submissionId: '123',
      },
      {
        signature: '123',
        status: SubmisionStatusEnum.SIGNED,
      },
    );
  });
});

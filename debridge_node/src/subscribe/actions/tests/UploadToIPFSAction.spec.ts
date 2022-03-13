import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../entities/ConfirmNewAssetEntity';
import { Repository } from 'typeorm';
import { UploadStatusEnum } from '../../../enums/UploadStatusEnum';
import { UploadToIPFSAction } from '../UploadToIPFSAction';
import { OrbitDbService } from '../../../services/OrbitDbService';

describe('UploadToIPFSAction', () => {
  let service: UploadToIPFSAction;
  let orbitdbService: OrbitDbService;
  let submissionRepository: Repository<SubmissionEntity>;
  let confirmNewAssetRepository: Repository<ConfirmNewAssetEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        UploadToIPFSAction,
        {
          provide: OrbitDbService,
          useValue: {
            addSignedSubmission: async () => {
              return ['x123', 'x1234'];
            },
            addConfirmNewAssets: async () => {
              return ['x1230', 'x12340'];
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
                  signature: 'signature',
                  txHash: 'txHash',
                  chainFrom: 97,
                  chainTo: 42,
                  debridgeId: '1234',
                  receiverAddr: 'receiverAddr',
                  amount: 10,
                  eventRaw: '',
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
                  signature: 'signature',
                  deployId: '1',
                  debridgeId: '11',
                  nativeChainId: '97',
                  tokenAddress: 'tokenAddress',
                  name: 'name',
                  symbol: 'symbol',
                  decimals: 'decimals',
                  submissionTxHash: 'submissionTxHash',
                  submissionChainFrom: 97,
                  submissionChainTo: 42,
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
    service = module.get(UploadToIPFSAction);
    orbitdbService = module.get(OrbitDbService);
    submissionRepository = module.get(getRepositoryToken(SubmissionEntity));
    confirmNewAssetRepository = module.get(getRepositoryToken(ConfirmNewAssetEntity));
  });

  it('Update Submission', async () => {
    jest.spyOn(submissionRepository, 'update');
    jest.spyOn(orbitdbService, 'addSignedSubmission');
    await service.process();
    expect(orbitdbService.addSignedSubmission).toHaveBeenCalledWith('123', 'signature', {
      submissionId: '123',
      txHash: 'txHash',
      chainFrom: 97,
      chainTo: 42,
      debridgeId: '1234',
      receiverAddr: 'receiverAddr',
      amount: 10,
    });
    expect(submissionRepository.update).toHaveBeenCalledWith(
      {
        submissionId: '123',
      },
      {
        ipfsStatus: UploadStatusEnum.UPLOADED,
        ipfsLogHash: 'x123',
        ipfsKeyHash: 'x1234',
      },
    );
  });

  it('Update ConfirmNewAssets', async () => {
    jest.spyOn(confirmNewAssetRepository, 'update');
    jest.spyOn(orbitdbService, 'addConfirmNewAssets');
    await service.process();
    expect(orbitdbService.addConfirmNewAssets).toHaveBeenCalledWith('1', 'signature', {
      deployId: '1',
      debridgeId: '11',
      nativeChainId: '97',
      tokenAddress: 'tokenAddress',
      name: 'name',
      symbol: 'symbol',
      decimals: 'decimals',
      submissionTxHash: 'submissionTxHash',
      submissionChainFrom: 97,
      submissionChainTo: 42,
    });
    expect(confirmNewAssetRepository.update).toHaveBeenCalledWith(
      {
        deployId: '1',
      },
      {
        ipfsStatus: UploadStatusEnum.UPLOADED,
        ipfsLogHash: 'x1230',
        ipfsKeyHash: 'x12340',
      },
    );
  });
});

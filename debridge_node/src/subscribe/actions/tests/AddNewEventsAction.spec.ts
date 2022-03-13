import { AddNewEventsAction, NonceValidationEnum, ProcessNewTransferResultStatusEnum } from '../AddNewEventsAction';
import { Web3Custom } from '../../../services/Web3Service';
import { AuthType, ChainProvider } from '../../../services/ChainConfigService';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DebrdigeApiService } from '../../../services/DebrdigeApiService';
import { ChainScanningService } from '../../../services/ChainScanningService';

describe('AddNewEventsActionSimple', () => {
  const provider = 'debridge.io';
  const chainId = 97;
  const serviceLocal = new AddNewEventsAction(null, null, null, null, null, null, null);
  const web3 = new Web3Custom(provider, null);
  const chainProvider = new ChainProvider(
    [
      {
        isValid: true,
        isActive: true,
        provider,
        authType: AuthType.NONE,
      },
    ],
    chainId,
  );

  let debridgeApiService;
  let chainScanningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      providers: [
        {
          provide: DebrdigeApiService,
          useValue: {
            notifyError: (message: string) => {
              return message;
            },
          },
        },
        {
          provide: ChainScanningService,
          useValue: {
            pause: (chainId: number) => {
              return chainId;
            },
          },
        },
      ],
    }).compile();

    debridgeApiService = module.get(DebrdigeApiService);
    chainScanningService = module.get(ChainScanningService);
  });

  it('AddNewEventsAction validateNonce', () => {
    expect(serviceLocal.validateNonce(10, 11)).toBe(NonceValidationEnum.SUCCESS);
    expect(serviceLocal.validateNonce(undefined, 1)).toBe(NonceValidationEnum.SUCCESS);
    expect(serviceLocal.validateNonce(undefined, 11)).toBe(NonceValidationEnum.MISSED_NONCE);
    expect(serviceLocal.validateNonce(10, 12)).toBe(NonceValidationEnum.MISSED_NONCE);
    expect(serviceLocal.validateNonce(10, 9)).toBe(NonceValidationEnum.DUPLICATED_NONCE);
    expect(serviceLocal.validateNonce(10, 10)).toBe(NonceValidationEnum.DUPLICATED_NONCE);
  });

  it('AddNewEventsAction getBlockNumber', () => {
    expect(serviceLocal.getBlockNumber({ status: ProcessNewTransferResultStatusEnum.SUCCESS }, 10)).toBe(10);
    expect(serviceLocal.getBlockNumber({ status: ProcessNewTransferResultStatusEnum.ERROR, blockToOverwrite: 7 }, 10)).toBe(7);
    expect(serviceLocal.getBlockNumber({ status: ProcessNewTransferResultStatusEnum.ERROR }, 10)).toBeUndefined();
  });

  it('AddNewEventsAction processValidationNonceError SUCCESS', async () => {
    await expect(
      serviceLocal.processValidationNonceError(
        web3,
        debridgeApiService,
        chainScanningService,
        { status: ProcessNewTransferResultStatusEnum.SUCCESS },
        97,
        chainProvider,
      ),
    ).resolves.toBeUndefined();
  });

  it('AddNewEventsAction processValidationNonceError DUPLICATED_NONCE', async () => {
    jest.spyOn(debridgeApiService, 'notifyError');
    jest.spyOn(chainScanningService, 'pause');
    await serviceLocal.processValidationNonceError(
      web3,
      debridgeApiService,
      chainScanningService,
      {
        nonceValidationStatus: NonceValidationEnum.DUPLICATED_NONCE,
        status: ProcessNewTransferResultStatusEnum.ERROR,
        submissionId: '123',
        nonce: 123,
      },
      chainId,
      chainProvider,
    );
    expect(debridgeApiService.notifyError).toHaveBeenCalledWith(`incorrect nonce error (duplicated_nonce): nonce: 123; submissionId: 123`);
    expect(chainScanningService.pause).toHaveBeenCalledWith(chainId);

    await expect(
      serviceLocal.processValidationNonceError(
        web3,
        debridgeApiService,
        chainScanningService,
        {
          nonceValidationStatus: NonceValidationEnum.DUPLICATED_NONCE,
          status: ProcessNewTransferResultStatusEnum.ERROR,
        },
        97,
        chainProvider,
      ),
    ).resolves.toBe(NonceValidationEnum.DUPLICATED_NONCE);
  });

  it('AddNewEventsAction processValidationNonceError MISSED_NONCE', async () => {
    jest.spyOn(debridgeApiService, 'notifyError');
    jest.spyOn(chainProvider, 'setProviderStatus');
    await serviceLocal.processValidationNonceError(
      web3,
      debridgeApiService,
      chainScanningService,
      {
        nonceValidationStatus: NonceValidationEnum.MISSED_NONCE,
        status: ProcessNewTransferResultStatusEnum.ERROR,
        submissionId: '123',
        nonce: 123,
      },
      chainId,
      chainProvider,
    );
    expect(debridgeApiService.notifyError).toHaveBeenCalledWith(`incorrect nonce error (missed_nonce): nonce: 123; submissionId: 123`);
    expect(chainProvider.setProviderStatus).toHaveBeenCalledWith(provider, false);

    await expect(
      serviceLocal.processValidationNonceError(
        web3,
        debridgeApiService,
        chainScanningService,
        {
          nonceValidationStatus: NonceValidationEnum.MISSED_NONCE,
          status: ProcessNewTransferResultStatusEnum.ERROR,
        },
        chainId,
        chainProvider,
      ),
    ).resolves.toBe(NonceValidationEnum.MISSED_NONCE);
  });
});

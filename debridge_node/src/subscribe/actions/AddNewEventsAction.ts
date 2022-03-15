import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { Web3Custom, Web3Service } from '../../services/Web3Service';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ChainConfigService, ChainProvider } from '../../services/ChainConfigService';
import { NonceControllingService } from './NonceControllingService';
import { ChainScanningService } from '../../services/ChainScanningService';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';

export enum ProcessNewTransferResultStatusEnum {
  SUCCESS,
  ERROR,
}

export enum NonceValidationEnum {
  SUCCESS,
  MISSED_NONCE,
  DUPLICATED_NONCE,
}

interface ProcessNewTransferResult {
  blockToOverwrite?: number;
  status: ProcessNewTransferResultStatusEnum;
  nonceValidationStatus?: NonceValidationEnum;
  submissionId?: string;
  nonce?: number;
}

@Injectable()
export class AddNewEventsAction {
  private logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();
  private readonly chainingScanningMap = new Map<number, AddNewEventsAction>();

  constructor(
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
    private readonly nonceControllingService: NonceControllingService,
    private readonly debridgeApiService: DebrdigeApiService,
  ) {}

  async action(chainId: number) {
    if (this.locker.get(chainId)) {
      this.logger.warn(`Is working now. chainId: ${chainId}`);
      return;
    }
    try {
      this.locker.set(chainId, true);
      this.logger.log(`Is locked chainId: ${chainId}`);
      if (!this.chainingScanningMap.has(chainId)) {
        this.chainingScanningMap.set(
          chainId,
          new AddNewEventsAction(
            this.chainScanningService,
            this.supportedChainRepository,
            this.submissionsRepository,
            this.chainConfigService,
            this.web3Service,
            this.nonceControllingService,
            this.debridgeApiService,
          ),
        );
      }
      await this.chainingScanningMap.get(chainId).process(chainId);
    } catch (e) {
      this.logger.error(`Error in action: ${e.message}`);
    } finally {
      this.locker.set(chainId, false);
      this.logger.log(`Is unlocked chainId: ${chainId}`);
    }
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    this.logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);
    this.logger.verbose(`process checkNewEvents - chainId: ${chainId}; from: ${from}; to: ${to}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      where: {
        chainId,
      },
    });
    const chainDetail = this.chainConfigService.get(chainId);

    const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);

    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

    this.logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      this.logger.log(`supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);
      if (supportedChain.latestBlock === lastBlockOfPage) {
        this.logger.warn(`latestBlock in db ${supportedChain.latestBlock} == lastBlockOfPage ${lastBlockOfPage}`);
        continue;
      }
      const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
      this.logger.log(`sentEvents: ${JSON.stringify(sentEvents)}`);
      if (!sentEvents || sentEvents.length === 0) {
        this.logger.verbose(`Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastBlockOfPage,
        });
        continue;
      }

      const result = await this.processNewTransfers(sentEvents, supportedChain.chainId);
      const updatedBlock = result.status === ProcessNewTransferResultStatusEnum.SUCCESS ? lastBlockOfPage : result.blockToOverwrite;

      // updatedBlock can be undefined if incorrect nonce occures in the first event
      if (updatedBlock) {
        this.logger.log(`updateSupportedChainBlock; key: latestBlock; value: ${updatedBlock};`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: updatedBlock,
        });
      }
      if (result.status != ProcessNewTransferResultStatusEnum.SUCCESS) {
        await this.processValidationNonceError(web3, this.debridgeApiService, this.chainScanningService, result, chainId, chainDetail.providers);
        break;
      }
    }
  }

  /**
   * Process new transfers
   * @param events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(events: any[], chainIdFrom: number): Promise<ProcessNewTransferResult> {
    let blockToOverwrite;

    for (const sendEvent of events) {
      const submissionId = sendEvent.returnValues.submissionId;
      this.logger.log(`submissionId: ${submissionId}`);
      const nonce = parseInt(sendEvent.returnValues.nonce);

      // check nonce collission
      // check if submission from rpc with the same submissionId have the same nonce
      const submission = await this.submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        blockToOverwrite = submission.blockNumber;
        continue;
      }

      const maxNonceFromDb = this.nonceControllingService.get(chainIdFrom);

      const submissionWithMaxNonceDb = await this.submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce: maxNonceFromDb,
        },
      });

      const submissionWithCurNonce = await this.submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce,
        },
      });
      const nonceExists = submissionWithCurNonce ? true : false;
      const nonceValidationStatus = this.validateNonce(maxNonceFromDb, nonce, nonceExists);
      this.logger.verbose(`Nonce validation status ${nonceValidationStatus}; maxNonceFromDb: ${maxNonceFromDb}; nonce: ${nonce};`);
      if (nonceValidationStatus !== NonceValidationEnum.SUCCESS) {
        const blockNumber = blockToOverwrite !== undefined ? blockToOverwrite : submissionWithMaxNonceDb.blockNumber;
        const message = `Incorrect nonce (${nonceValidationStatus}) for nonce: ${nonce}; max nonce in db: ${maxNonceFromDb}; submissionId: ${submissionId}; blockToOverwrite: ${blockToOverwrite}; submissionWithMaxNonceDb.blockNumber: ${submissionWithMaxNonceDb.blockNumber}`;
        this.logger.error(message);
        return {
          blockToOverwrite: blockNumber, // it would be empty only if incorrect nonce occures in the first event
          status: ProcessNewTransferResultStatusEnum.ERROR,
          nonceValidationStatus,
          submissionId,
          nonce,
        };
      }

      try {
        await this.submissionsRepository.save({
          submissionId: submissionId,
          txHash: sendEvent.transactionHash,
          chainFrom: chainIdFrom,
          chainTo: sendEvent.returnValues.chainIdTo,
          debridgeId: sendEvent.returnValues.debridgeId,
          receiverAddr: sendEvent.returnValues.receiver,
          amount: sendEvent.returnValues.amount,
          status: SubmisionStatusEnum.NEW,
          ipfsStatus: UploadStatusEnum.NEW,
          apiStatus: UploadStatusEnum.NEW,
          assetsStatus: SubmisionAssetsStatusEnum.NEW,
          rawEvent: JSON.stringify(sendEvent),
          blockNumber: sendEvent.blockNumber,
          nonce,
        } as SubmissionEntity);
        blockToOverwrite = sendEvent.blockNumber;
        this.nonceControllingService.set(chainIdFrom, nonce);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    return {
      status: ProcessNewTransferResultStatusEnum.SUCCESS,
    };
  }

  async processValidationNonceError(
    web3: Web3Custom,
    debridgeApiService: DebrdigeApiService,
    chainScanningService: ChainScanningService,
    transferResult: ProcessNewTransferResult,
    chainId: number,
    chainProvider: ChainProvider,
  ) {
    if (transferResult.nonceValidationStatus === NonceValidationEnum.MISSED_NONCE) {
      await debridgeApiService.notifyError(
        `incorrect nonce error (missed_nonce): nonce: ${transferResult.nonce}; submissionId: ${transferResult.submissionId}`,
      );
      chainProvider.setProviderStatus(web3.chainProvider, false);
      return NonceValidationEnum.MISSED_NONCE;
    } else if (transferResult.nonceValidationStatus === NonceValidationEnum.DUPLICATED_NONCE) {
      await debridgeApiService.notifyError(
        `incorrect nonce error (duplicated_nonce): nonce: ${transferResult.nonce}; submissionId: ${transferResult.submissionId}`,
      );
      chainScanningService.pause(chainId);
      return NonceValidationEnum.DUPLICATED_NONCE;
    }
  }

  /**
   * Validate nonce
   * @param nonceDb
   * @param nonce
   * @param nonceExists
   */
  validateNonce(nonceDb: number, nonce: number, nonceExists: boolean): NonceValidationEnum {
    if (nonceExists) {
      return NonceValidationEnum.DUPLICATED_NONCE;
    } else if (!nonceExists && nonce <= nonceDb) {
      return NonceValidationEnum.SUCCESS;
    } else if ((nonceDb === undefined && nonce !== 0) || (nonceDb != undefined && nonce !== nonceDb + 1)) {
      // (nonceDb === undefined && nonce !== 0) may occur in empty db
      return NonceValidationEnum.MISSED_NONCE;
    }
    return NonceValidationEnum.SUCCESS;
  }

  async getEvents(registerInstance, fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await registerInstance.getPastEvents('Sent', { fromBlock, toBlock });
  }
}

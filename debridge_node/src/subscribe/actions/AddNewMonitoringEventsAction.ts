import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { MonitoringSentEventEntity } from '../../entities/MonitoringSentEventEntity';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { ChainConfigService, ChainProvider } from '../../services/ChainConfigService';
import { ChainScanningService } from '../../services/ChainScanningService';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { NonceMonitoringEventsControllingService } from '../../services/NonceMonitoringEventsControllingService';
import { Web3Custom, Web3Service } from '../../services/Web3Service';

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
export class AddNewMonitoringEventsAction {
  private readonly logger = new Logger(AddNewMonitoringEventsAction.name);
  private readonly locker = new Map();

  constructor(
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(MonitoringSentEventEntity)
    private readonly monitoringSentEventRepository: Repository<MonitoringSentEventEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
    private readonly nonceMonitoringEventsControllingService: NonceMonitoringEventsControllingService,
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
      await this.process(chainId);
    } catch (e) {
      this.logger.error(`Error while scanning chainId: ${chainId}; error: ${e.message} ${JSON.stringify(e)}`);
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
    const logger = new Logger(`${AddNewMonitoringEventsAction.name} chainId ${chainId}`);
    logger.verbose(`process checkNewEvents - chainId: ${chainId}; from: ${from}; to: ${to}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      where: {
        chainId,
      },
    });
    const chainDetail = this.chainConfigService.get(chainId);
    const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);
    const contract = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
    // @ts-ignore
    web3.eth.setProvider = contract.setProvider;

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || (supportedChain.latestBlockMonitoring > 0 ? supportedChain.latestBlockMonitoring : toBlock - 1);

    logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      logger.log(`supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);
      if (supportedChain.latestBlockMonitoring === lastBlockOfPage) {
        logger.warn(`latestBlockMonitoring in db ${supportedChain.latestBlockMonitoring} == lastBlockOfPage ${lastBlockOfPage}`);
        continue;
      }
      const monitoringSentEvents = await this.getEvents(contract, fromBlock, lastBlockOfPage);
      logger.log(`monitoringSentEvents: ${JSON.stringify(monitoringSentEvents)}`);
      if (!monitoringSentEvents || monitoringSentEvents.length === 0) {
        logger.verbose(`Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlockMonitoring: lastBlockOfPage,
        });
        continue;
      }

      const result = await this.processNewTransfers(logger, monitoringSentEvents, supportedChain.chainId);
      const updatedBlock = result.status === ProcessNewTransferResultStatusEnum.SUCCESS ? lastBlockOfPage : result.blockToOverwrite;

      // updatedBlock can be undefined if incorrect nonce occures in the first event
      if (updatedBlock) {
        logger.log(`updateSupportedChainBlock; key: latestBlockMonitoring; value: ${updatedBlock};`);
        await this.supportedChainRepository.update(chainId, {
          latestBlockMonitoring: updatedBlock,
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
   * @param logger
   * @param events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(logger: Logger, events: any[], chainIdFrom: number): Promise<ProcessNewTransferResult> {
    let blockToOverwrite;

    for (const event of events) {
      const submissionId = event.returnValues.submissionId;
      logger.log(`submissionId: ${submissionId}`);
      const nonce = parseInt(event.returnValues.nonce);

      // check nonce collission
      // check if submission from rpc with the same submissionId have the same nonce
      const monitoringSentEvent = await this.monitoringSentEventRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (monitoringSentEvent) {
        logger.verbose(`monitoringSentEvent already found in db submissionId: ${submissionId}`);
        // blockToOverwrite = monitoringSentEvent.blockNumber;
        this.nonceMonitoringEventsControllingService.set(chainIdFrom, monitoringSentEvent.nonce);
        continue;
      }

      const maxNonceFromDb = this.nonceMonitoringEventsControllingService.get(chainIdFrom);

      const monitoringWithMaxNonceDb = await this.monitoringSentEventRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce: maxNonceFromDb,
        },
      });

      const nonceExists = await this.isMonitoringEventExists(chainIdFrom, nonce);
      const nonceValidationStatus = this.validateNonce(maxNonceFromDb, nonce, nonceExists);
      logger.verbose(`Nonce validation status ${nonceValidationStatus}; maxNonceFromDb: ${maxNonceFromDb}; nonce: ${nonce};`);

      if (nonceValidationStatus !== NonceValidationEnum.SUCCESS) {
        const blockNumber = blockToOverwrite !== undefined ? blockToOverwrite : monitoringWithMaxNonceDb.blockNumber;
        const message = `Incorrect nonce (${nonceValidationStatus}) for nonce: ${nonce}; max nonce in db: ${maxNonceFromDb}; submissionId: ${submissionId}; blockToOverwrite: ${blockToOverwrite}; monitoringWithMaxNonceDb.blockNumber: ${monitoringWithMaxNonceDb.blockNumber}`;
        logger.error(message);
        return {
          blockToOverwrite: blockNumber, // it would be empty only if incorrect nonce occures in the first event
          status: ProcessNewTransferResultStatusEnum.ERROR,
          nonceValidationStatus,
          submissionId,
          nonce,
        };
      }

      try {
        await this.monitoringSentEventRepository.save({
          submissionId,
          nonce,
          blockNumber: event.blockNumber,
          lockedOrMintedAmount: event.returnValues.lockedOrMintedAmount,
          totalSupply: event.returnValues.totalSupply,
          chainId: chainIdFrom,
        } as MonitoringSentEventEntity);
        blockToOverwrite = event.blockNumber;
        this.nonceMonitoringEventsControllingService.set(chainIdFrom, nonce);
      } catch (e) {
        logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
      return {
        status: ProcessNewTransferResultStatusEnum.SUCCESS,
      };
    }
  }

  async isMonitoringEventExists(chainIdFrom: number, nonce: number): Promise<boolean> {
    const monitoringEvent = await this.monitoringSentEventRepository.findOne({
      where: {
        chainFrom: chainIdFrom,
        nonce,
      },
    });
    if (monitoringEvent) {
      return true;
    }
    return false;
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

  async getEvents(contract, fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await contract.getPastEvents('MonitoringSendEvent', { fromBlock, toBlock });
  }
}

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { EntityManager, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionBalanceStatusEnum } from '../../enums/SubmisionBalanceStatusEnum';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { Web3Service } from '../../services/Web3Service';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ChainConfigService } from '../../services/ChainConfigService';
import { NonceControllingService } from './NonceControllingService';
import { ChainScanningService } from '../../services/ChainScanningService';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { MonitoringSentEventEntity } from '../../entities/MonitoringSentEventEntity';
import { BigNumber } from 'bignumber.js';
import { TokenBalanceHistory } from '../../entities/TokenBalanceHistory';

interface ProcessNewTransferResult {
  blockToOverwrite?: number;
  status: 'incorrect_nonce' | 'success' | 'empty';
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
    @InjectRepository(MonitoringSentEventEntity)
    private readonly monitoringSentEventRepository: Repository<MonitoringSentEventEntity>,
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
            this.monitoringSentEventRepository,
            this.chainConfigService,
            this.web3Service,
            this.nonceControllingService,
            this.debridgeApiService,
          ),
        );
      }
      await this.chainingScanningMap.get(chainId).process(chainId);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.locker.set(chainId, false);
      this.logger.log(`Is unlocked chainId: ${chainId}`);
    }
  }

  /**
   * Process new transfers
   * @param {EventData[]} events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(events: any[], chainIdFrom: number): Promise<ProcessNewTransferResult> {
    let blockToOverwrite;
    if (!events) {
      return {
        status: 'empty',
      };
    }
    for (const sendEvent of events) {
      const submissionId = sendEvent.returnValues.submissionId;
      this.logger.log(`chainId: ${chainIdFrom}; submissionId: ${submissionId}`);
      const nonce = parseInt(sendEvent.returnValues.nonce);
      const submission = await this.submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`chainId: ${chainIdFrom}; Submission already found in db submissionId: ${submissionId}`);
        blockToOverwrite = submission.blockNumber;
        continue;
      }

      if (this.nonceControllingService.get(chainIdFrom) && nonce !== this.nonceControllingService.get(chainIdFrom) + 1) {
        const message = `Incorrect nonce ${nonce} in scanning from ${chainIdFrom}`;
        this.logger.error(message);
        return {
          blockToOverwrite,
          status: 'incorrect_nonce',
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
          balanceStatus: SubmisionBalanceStatusEnum.RECIEVED,
          nonce,
        } as SubmissionEntity);
        blockToOverwrite = sendEvent.blockNumber;
        this.nonceControllingService.set(chainIdFrom, nonce);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    this.logger.log(`chainIdFrom: ${chainIdFrom}; blockToOverwrite ${blockToOverwrite}`);
    return {
      status: 'success',
    };
  }

  async getEvents(registerInstance, event: 'Sent' | 'MonitoringSent', fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    const events = await registerInstance.getPastEvents(event, { fromBlock, toBlock });

    return events;
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    this.logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);
    this.logger.verbose(`${chainId}> proceess> with> 0 checkNewEvents args: chainId: ${chainId}; from: ${from}; to: ${to}`);
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

    this.logger.debug(`chainId: ${chainDetail.chainId}; Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      this.logger.log(`chainId: ${chainDetail.chainId}; supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

      // get monitoringSendEvents and save to the database
      const monitoringSentEvents = await this.getEvents(registerInstance, 'MonitoringSent', fromBlock, lastBlockOfPage);
      await Promise.all(
        monitoringSentEvents.map(event => {
          return this.monitoringSentEventRepository.save({
            submissionId: event.returnValues.submissionId,
            nonce: event.returnValues.nonce,
            lockedOrMintedAmount: event.returnValues.lockedOrMintedAmount,
            chainId,
          } as MonitoringSentEventEntity);
        }),
      );

      //sent event
      const sentEvents = await this.getEvents(registerInstance, 'Sent', fromBlock, lastBlockOfPage);
      this.logger.log(`chainId: ${chainDetail.chainId}; sentEvents: ${JSON.stringify(sentEvents)}`);
      if (!sentEvents || sentEvents.length === 0) {
        this.logger.verbose(`chainId: ${chainDetail.chainId}; Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastBlockOfPage,
        });
        continue;
      }

      const result = await this.processNewTransfers(sentEvents, supportedChain.chainId);

      if (result.status === 'incorrect_nonce') {
        this.logger.log(`chainId: ${chainDetail.chainId}; result.status: incorrect_nonce`);
        this.chainScanningService.pause(chainId);
        await this.debridgeApiService.notifyError(
          `incorrect nonce error: nonce: ${result.nonce}; chainId: ${chainId}; submissionId: ${result.submissionId}`,
        );
        break;
      }
      if (result) {
        const lastBlock = result.blockToOverwrite ? result.blockToOverwrite : toBlock;
        if (supportedChain.latestBlock !== lastBlockOfPage) {
          this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: latestBlock; value: ${lastBlock}`);
          await this.supportedChainRepository.update(chainId, {
            latestBlock: lastBlock,
          });
        }
      } else {
        this.logger.error(`chainId: ${chainId}; Last block not updated. Found error in processNewTransfers`);
        break;
      }
    }
  }
}

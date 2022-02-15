import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { Web3Service } from '../../services/Web3Service';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ChainConfigService } from '../../services/ChainConfigService';
import { NonceControllingService } from './NonceControllingService';
import { ChainScanningService } from '../../services/ChainScanningService';

interface ProcessNewTransferResult {
  lastSuccessBlockNumber?: number;
  status: 'incorrect_nonce' | 'success' | 'empty';
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
    let lastSuccessBlockNumber;
    if (!events) {
      return {
        status: 'empty',
      };
    }
    for (const sendEvent of events) {
      const submissionId = sendEvent.returnValues.submissionId;
      this.logger.log(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${submissionId}`);
      //this.logger.debug(JSON.stringify(sentEvents));
      const nonce = parseInt(sendEvent.returnValues.nonce);
      const submission = await this.submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }

      if (this.nonceControllingService.get(chainIdFrom) && nonce !== this.nonceControllingService.get(chainIdFrom) + 1) {
        const message = `Incorrect nonce ${nonce} in scanning from ${chainIdFrom}`;
        this.logger.error(message);
        return {
          lastSuccessBlockNumber,
          status: 'incorrect_nonce',
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
        lastSuccessBlockNumber = sendEvent.blockNumber;
        this.nonceControllingService.set(chainIdFrom, nonce);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    return {
      lastSuccessBlockNumber,
      status: 'success',
    };
  }

  async getEvents(registerInstance, fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    const sentEvents = await registerInstance.getPastEvents(
      'Sent',
      { fromBlock, toBlock }, //,
      //async (error, events) => {
      //    if (error) {
      //        this.log.error(error);
      //    }
      //    await this.processNewTransfers(events, supportedChain.chainId);
      //}
    );

    // this.logger.debug('getEvents: ' + JSON.stringify(sentEvents));

    return sentEvents;
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    this.logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);
    this.logger.verbose(`checkNewEvents ${chainId}`);
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
      this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

      const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
      if (!sentEvents || sentEvents.length === 0) {
        this.logger.verbose(`Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastBlockOfPage,
        });
        continue;
      }
      const result = await this.processNewTransfers(sentEvents, supportedChain.chainId);

      if (result && result.lastSuccessBlockNumber) {
        if (supportedChain.latestBlock !== lastBlockOfPage) {
          this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: latestBlock; value: ${result.lastSuccessBlockNumber}`);
          await this.supportedChainRepository.update(chainId, {
            latestBlock: result.lastSuccessBlockNumber,
          });

          if (result.status === 'incorrect_nonce') {
            // @ts-ignore
            const host = web3.currentProvider.host;
            chainDetail.providers.setProviderStatus(host, false);
            this.logger.verbose(`Web3 ${host} is disabled`);
            if (chainDetail.providers.getFailedProviders().length === chainDetail.providers.getAllProviders().length) {
              this.chainScanningService.pause(chainId);
            }
            //await this.debrdigeApiService.notifyIncorrectNonce(sendEvent.returnValues.nonce, chainIdFrom, submissionId);
            break;
          }
        }
      } else {
        this.logger.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
        break;
      }
    }
  }
}

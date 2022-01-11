import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { EntityManager, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { Web3Service } from '../../services/Web3Service';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ChainScanningService } from '../../services/ChainScanningService';
import { ChainScanStatus } from '../../enums/ChainScanStatus';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';

@Injectable()
export class AddNewEventsAction implements OnModuleInit {
  logger: Logger;
  private readonly locker = new Map();
  private readonly maxNonceChains = new Map();

  constructor(
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
    @InjectConnection()
    private readonly entityManager: EntityManager,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly web3Service: Web3Service,
    private readonly debrdigeApiService: DebrdigeApiService,
  ) {
    this.logger = new Logger(AddNewEventsAction.name);
  }

  async onModuleInit() {
    const chains = await this.entityManager.query(`
SELECT "chainFrom", MAX(nonce::numeric) FROM public.submissions GROUP BY "chainFrom"
       `);
    for (const { chainFrom, max } of chains) {
      //this.maxNonceChains.set(chainFrom, max);
      this.maxNonceChains.set(chainFrom, 9999999999999);
      this.logger.verbose(`Max nonce in chain ${chainFrom} is ${max}`);
    }
  }

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
  async processNewTransfers(events: any[], chainIdFrom: number, rescan: boolean) {
    if (!events) return true;
    const isOk = true;
    for (const sendEvent of events) {
      this.logger.log(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${sendEvent.returnValues.submissionId}`);
      //this.logger.debug(JSON.stringify(sentEvents));
      const submissionId = sendEvent.returnValues.submissionId;

      if (!rescan) {
        const nonce = parseInt(sendEvent.returnValues.nonce);
        if (!this.maxNonceChains.has(chainIdFrom)) {
          this.maxNonceChains.set(chainIdFrom, 0);
        }
        if (this.maxNonceChains.get(chainIdFrom) >= nonce) {
          if (this.chainScanningService.status(chainIdFrom) === ChainScanStatus.IN_PROGRESS) {
            this.chainScanningService.pause(chainIdFrom);
            const message = `Incorrect nonce ${nonce} in chain ${chainIdFrom}`;
            this.logger.error(message);
            //await this.debrdigeApiService.notifyIncorrectNonce(sendEvent.returnValues.nonce, chainIdFrom, submissionId);
            throw new Error(message);
          }
        } else {
          this.maxNonceChains.set(chainIdFrom, nonce);
        }
      }

      const submission = await this.submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }

      try {
        await this.submissionsRepository.save({
          submissionId: submissionId,
          txHash: sendEvent.transactionHash,
          blockNumber: sendEvent.blockNumber.toString(),
          nonce: sendEvent.returnValues.nonce,
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
        } as SubmissionEntity);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    return isOk;
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
   * @param {boolean} rescan
   */
  async process(chainId: number, from: number = undefined, to: number = undefined, rescan = false) {
    this.logger.verbose(`checkNewEvents ${chainId}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      where: {
        chainId,
      },
    });
    const chainDetail = ChainsConfig.find(item => {
      return item.chainId === chainId;
    });

    const web3 = this.web3Service.web3HttpProvider(chainDetail.provider);

    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

    this.logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

      const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
      const processSuccess = await this.processNewTransfers(sentEvents, supportedChain.chainId, rescan);

      /* update lattest viewed block */
      if (processSuccess) {
        if (supportedChain.latestBlock != lastBlockOfPage) {
          this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: latestBlock; value: ${lastBlockOfPage}`);
          await this.supportedChainRepository.update(chainId, {
            latestBlock: lastBlockOfPage,
          });
        }
      } else {
        this.logger.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
        break;
      }
    }
  }
}

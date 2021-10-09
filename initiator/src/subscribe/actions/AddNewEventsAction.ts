import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { EventData } from 'web3-eth-contract';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import Web3 from 'web3';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';

@Injectable()
export class AddNewEventsAction extends IAction<number> {
  private readonly EVENTS_PAGE_SIZE = 5000;

  private readonly minConfirmations: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
  ) {
    super();
    this.logger = new Logger(AddNewEventsAction.name);
    this.minConfirmations = this.configService.get<number>('MIN_CONFIRMATIONS');
  }

  /**
   * Process new transfers
   * @param {EventData[]} events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(events: any[], chainIdFrom: number) {
    if (!events) return true;
    const isOk = true;
    for (const sendEvent of events) {
      this.logger.log(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${sendEvent.returnValues.submissionId}`);
      //this.logger.debug(JSON.stringify(sentEvents));
      const submissionId = sendEvent.returnValues.submissionId;
      const submission = await this.submissionsRepository.findOne({
        submissionId,
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }

      try {
        await this.submissionsRepository.save({
          submissionId,
          txHash: sendEvent.transactionHash,
          chainFrom: chainIdFrom,
          chainTo: sendEvent.returnValues.chainIdTo,
          debridgeId: sendEvent.returnValues.debridgeId,
          receiverAddr: sendEvent.returnValues.receiver,
          amount: sendEvent.returnValues.amount,
          status: SubmisionStatusEnum.NEW,
          assetsStatus: SubmisionAssetsStatusEnum.NEW,
        });
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

    this.logger.debug('getEvents: ' + JSON.stringify(sentEvents));

    return sentEvents;
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    this.logger.verbose(`checkNewEvents ${chainId}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      chainId,
    });
    const chainDetail = ChainsConfig.find(item => {
      return item.chainId === chainId;
    });

    const web3 = new Web3(chainDetail.provider);
    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

    this.logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

      const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
      const processSuccess = await this.processNewTransfers(sentEvents, supportedChain.chainId);

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

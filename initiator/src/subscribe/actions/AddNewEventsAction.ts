import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { In, Repository } from 'typeorm';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { EventData } from 'web3-eth-contract';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import Web3 from 'web3';
import { abi as whiteDebridgeAbi } from '../../assets/WhiteFullDebridge.json';

@Injectable()
export class AddNewEventsAction implements IAction {
  private readonly logger = new Logger(AddNewEventsAction.name);

  private readonly minConfirmations: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(AggregatorChainEntity)
    private readonly aggregatorChainsRepository: Repository<AggregatorChainEntity>,
    @InjectRepository(ChainlinkConfigEntity)
    private readonly chainlinkConfigRepository: Repository<ChainlinkConfigEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
  ) {
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
    let isOk = true;
    for (const e of events) {
      this.logger.log(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${e.returnValues.submissionId}`);
      this.logger.debug(e);
      /* remove chainIdTo  selector */
      const chainIdTo = e.returnValues.chainIdTo;
      const aggregatorInfo = await this.aggregatorChainsRepository.findOne({
        chainIdTo,
      });
      if (!aggregatorInfo) continue;
      const chainConfig = await this.chainlinkConfigRepository.findOne({
        chainId: aggregatorInfo.aggregatorChain,
      });
      if (!chainConfig) {
        this.logger.error(`Not found chainConfig: ${aggregatorInfo.aggregatorChain}`);
        isOk = false;
        continue;
      }

      /* call chainlink node */
      const submissionId = e.returnValues.submissionId;
      const submission = await this.submissionsRepository.findOne({
        submissionId,
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }
      await this.callChainlinkNode(chainConfig.submitJobId, chainConfig, submissionId, e.returnValues, chainIdFrom);
    }
    return isOk;
  }

  /**
   * CallChainLinkNode
   * @param {string} jobId
   * @param {string} chainConfig
   * @param {string} submissionId
   * @param e
   * @param {number} chainIdFrom
   */
  private async callChainlinkNode(jobId: string, chainConfig, submissionId: string, e, chainIdFrom: number) {
    this.logger.log(`callChainlinkNode jobId ${jobId}; submissionId: ${submissionId}`);
    await this.submissionsRepository.save({
      submissionId,
      txHash: 'NULL',
      chainFrom: chainIdFrom,
      chainTo: e.chainIdTo,
      debridgeId: e.debridgeId,
      receiverAddr: e.receiver,
      amount: e.amount,
      status: SubmisionStatusEnum.NEW,
    });
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
    const burntEvents = await registerInstance.getPastEvents(
      'Burnt',
      { fromBlock, toBlock }, //,
      //async (error, events) => {
      //    if (error) {
      //        this.log.error(error);
      //    }
      //await this.processNewTransfers(events, supportedChain.chainId);
      //}
    );

    return {
      sentEvents,
      burntEvents,
    };
  }

  async action(chainId: number): Promise<void> {
    this.logger.verbose(`checkNewEvents ${chainId}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      chainId,
    });
    const chainDetail = ChainsConfig.find(item => {
      return item.chainId === chainId;
    });

    const web3 = new Web3(chainDetail.provider);
    const registerInstance = new web3.eth.Contract(whiteDebridgeAbi as any, chainDetail.debridgeAddr);

    const toBlock = (await web3.eth.getBlockNumber()) - this.minConfirmations;
    const fromBlock = supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1;

    this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

    const { sentEvents, burntEvents } = await this.getEvents(registerInstance, fromBlock, toBlock);

    const isOk1 = await this.processNewTransfers(sentEvents, supportedChain.chainId);
    const isOk2 = await this.processNewTransfers(burntEvents, supportedChain.chainId);

    /* update lattest viewed block */
    //supportedChain.latestBlock = toBlock;
    if (isOk1 && isOk2) {
      const key = 'latestBlock';
      if (supportedChain[key] != toBlock) {
        this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: ${key}; value: ${toBlock}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: toBlock,
        });
      }
    } else {
      this.logger.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
    }
  }
}

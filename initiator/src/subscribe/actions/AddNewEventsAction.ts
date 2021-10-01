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
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from 'src/enums/SubmisionAssetsStatusEnum';

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
      this.logger.debug(JSON.stringify(sentEvents));
      const submissionId = e.returnValues.submissionId;
      const submission = await this.submissionsRepository.findOne({
        submissionId,
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }

      await this.submissionsRepository.save({
        submissionId,
        txHash: e.transactionHash,
        chainFrom: chainIdFrom,
        chainTo: e.chainIdTo,
        debridgeId: e.debridgeId,
        receiverAddr: e.receiver,
        amount: e.amount,
        status: SubmisionStatusEnum.NEW,
        assetsStatus: SubmisionAssetsStatusEnum.NEW
      });
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

    this.logger.debug("getEvents: " + JSON.stringify(sentEvents));

    return sentEvents;
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
    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);

    const toBlock = (await web3.eth.getBlockNumber()) - this.minConfirmations;
    const fromBlock = supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1;

    this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

    const sentEvents = await this.getEvents(registerInstance, fromBlock, toBlock);

    const processSucess = await this.processNewTransfers(sentEvents, supportedChain.chainId);

    /* update lattest viewed block */
    //supportedChain.latestBlock = toBlock;
    if (processSucess) {
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

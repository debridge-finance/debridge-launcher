import { abi as whiteDebridgeAbi } from './assets/WhiteFullDebridge.json';
import { EventData } from 'web3-eth-contract';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { AggregatorChainEntity } from './entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from './entities/ChainlinkConfigEntity';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SubmisionStatusEnum } from './enums/SubmisionStatusEnum';
import { InjectRepository } from '@nestjs/typeorm';
import Web3 from 'web3';
import { ChainlinkService } from './chainlink/ChainlinkService';
import ChainsConfig from './config/chains_config.json';

@Injectable()
export class SubscriberService {
  private readonly logger = new Logger(SubscriberService.name);
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
    private readonly chainlinkService: ChainlinkService,
  ) {
    this.minConfirmations = this.configService.get<number>('MIN_CONFIRMATIONS');
    this.init();
  }

  async init() {
    this.logger.log('init');
    await this.setAllChainlinkCookies();
    await this.subscribe();
  }

  /**
   * Process new transfers
   * @param {EventData[]} events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(events: EventData[], chainIdFrom: number) {
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
   * Check confirmation
   * @param {ChainlinkConfigEntity} chainConfig
   */
  async checkConfirmations(chainConfig: ChainlinkConfigEntity) {
    //this.log.debug(`checkConfirmations ${chainConfig.network}`);

    //get chainTo for current aggregator
    const supportedChains = await this.aggregatorChainsRepository.find({
      aggregatorChain: chainConfig.chainId,
    });
    this.logger.debug(`checkConfirmations ${chainConfig.network} check submissions to network ${supportedChains.map(a => a.chainIdTo)}`);
    const createdSubmissions = await this.submissionsRepository.find({
      where: {
        status: SubmisionStatusEnum.CREATED,
        chainTo: In(supportedChains.map(a => a.chainIdTo)),
      },
    });

    for (const submission of createdSubmissions) {
      const runInfo = await this.chainlinkService.getChainlinkRun(chainConfig.eiChainlinkUrl, submission.runId, chainConfig.cookie);
      if (!runInfo) continue;
      if (runInfo.status == 'completed') {
        await this.submissionsRepository.update(submission.submissionId, {
          status: SubmisionStatusEnum.CONFIRMED,
        });
      }
      if (runInfo.status == 'errored') {
        await this.submissionsRepository.update(submission.submissionId, {
          status: SubmisionStatusEnum.REVERTED,
        });
      }
    }
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
    const runId = await this.chainlinkService.postChainlinkRun(
      jobId,
      submissionId,
      chainConfig.eichainlinkurl,
      chainConfig.eiicaccesskey,
      chainConfig.eiicsecret,
    );
    this.logger.log(`Received runId ${runId}; submissionId: ${submissionId}`);
    await this.submissionsRepository.save({
      submissionId,
      txHash: 'NULL',
      runId,
      chainFrom: chainIdFrom,
      chainTo: e.chainIdTo,
      debridgeId: e.debridgeId,
      receiverAddr: e.receiver,
      amount: e.amount,
      status: SubmisionStatusEnum.CREATED,
    });
  }

  private async setAllChainlinkCookies() {
    this.logger.debug(`Start setAllChainlinkCookies`);
    const chainConfigs = await this.chainlinkConfigRepository.find();
    for (const chainConfig of chainConfigs) {
      this.logger.debug(`setAllChainlinkCookies ${chainConfig.network}`);
      const cookies = await this.chainlinkService.getChainlinkCookies(chainConfig.eiChainlinkUrl, chainConfig.network);

      await this.chainlinkConfigRepository.update(chainConfig.chainId, {
        cookie: cookies,
      });
    }
  }

  /**
   * Check new events
   * @param {number} chainId
   * @private
   */
  private async checkNewEvents(chainId: number) {
    this.logger.verbose(`checkNewEvents ${chainId}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      chainId,
    });
    const chainDetail = ChainsConfig.find(item => {
      return item.chainId === chainId;
    });

    const web3 = new Web3(chainDetail.provider);
    const registerInstance = new web3.eth.Contract(whiteDebridgeAbi as any, chainDetail.debridgeAddr);
    /* get blocks range */
    //console.log(await web3.eth.getBlockNumber());
    const toBlock = (await web3.eth.getBlockNumber()) - this.minConfirmations;
    const fromBlock = supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1;

    if (fromBlock >= toBlock) return;
    this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

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

  async subscribe() {
    const supportedChains = await this.supportedChainRepository.find();
    for (const supportedChain of supportedChains) {
      //const web3 = new Web3(supportedChain.provider);
      //const registerInstance = new web3.eth.Contract(
      //    whiteDebridgeAbi,
      //    supportedChain.debridgeaddr
      //);

      const chainDetail = ChainsConfig.find(item => {
        return item.chainId === supportedChain.chainId;
      });

      this.logger.log(`setInterval ${chainDetail.interval} for checkNewEvents ${supportedChain.network}`);
      setInterval(async () => {
        try {
          await this.checkNewEvents(supportedChain.chainId);
        } catch (e) {
          this.logger.error(e);
        }
      }, chainDetail.interval);
    }
    const chainConfigs = await this.chainlinkConfigRepository.find();
    for (const chainConfig of chainConfigs) {
      this.logger.log(`setInterval ${this.configService.get('CHECK_CONFIRMATION_INTERVAL')} for checkConfirmations ${chainConfig.network}`);
      setInterval(async () => {
        try {
          await this.checkConfirmations(chainConfig);
        } catch (e) {
          this.logger.error(e);
        }
      }, this.configService.get<number>('CHECK_CONFIRMATION_INTERVAL'));
    }

    this.logger.log(`setInterval ${this.configService.get('SET_CHAINLINK_COOKIES_INTERVAL')} for setAllChainlinkCookies`);
    setInterval(async () => {
      try {
        await this.setAllChainlinkCookies();
      } catch (e) {
        this.logger.error(e);
      }
    }, this.configService.get<number>('SET_CHAINLINK_COOKIES_INTERVAL'));
  }
}

import Web3 from 'web3';
import { Db } from '~/db';
import { Chainlink } from './chainlink.service';
import { EventData } from 'web3-eth-contract';
import { Subscriber, SubscriberConfig, SubscriberEnv } from '~/interfaces/subscriber.interface';
import { Logger } from '~/interfaces/logger.interface';

import { abi as whiteDebridgeAbi } from '~/assets/WhiteFullDebridge.json';

const SubmisionStatus = {
  CREATED: 0,
  BROADCASTED: 1,
  CONFIRMED: 2,
  REVERTED: 3,
};

export class SubscriberService implements Subscriber {
  config: SubscriberConfig;
  db: Db;
  chainlink: Chainlink;
  log: Logger;

  constructor({ config, db, chainlink, logger }: SubscriberEnv) {
    this.config = config;
    this.db = db;
    this.chainlink = chainlink;
    this.log = logger;
  }

  async init() {
    this.log.info('init');
    await this.db.connectDb();
    await this.db.createTables();
    await this.setAllChainlinkCookies();
    await this.subscribe();
  }

  /* call the chainlink node and run a job */
  async subscribe() {
    const supportedChains = await this.db.getSupportedChains();
    for (const supportedChain of supportedChains) {
      //const web3 = new Web3(supportedChain.provider);
      //const registerInstance = new web3.eth.Contract(
      //    whiteDebridgeAbi,
      //    supportedChain.debridgeaddr
      //);

      this.log.info(`setInterval ${supportedChain.interval} for checkNewEvents ${supportedChain.network}`);
      setInterval(async () => {
        try {
          await this.checkNewEvents(supportedChain.chainId);
        } catch (e) {
          this.log.error(e);
        }
      }, supportedChain.interval);
    }
    const chainConfigs = await this.db.getChainConfigs();
    for (const chainConfig of chainConfigs) {
      this.log.info(`setInterval 30000 for checkConfirmations ${chainConfig.network}`);
      setInterval(async () => {
        try {
          await this.checkConfirmations(chainConfig);
        } catch (e) {
          this.log.error(e);
        }
      }, 30000);
    }

    this.log.info(`setInterval 864000 for setAllChainlinkCookies`);
    setInterval(async () => {
      try {
        await this.setAllChainlinkCookies();
      } catch (e) {
        this.log.error(e);
      }
    }, 864000);
  }

  /* collect new events */
  async checkNewEvents(chainId: number) {
    this.log.debug(`checkNewEvents ${chainId}`);
    const supportedChain = await this.db.getSupportedChain(chainId);

    const web3 = new Web3(supportedChain.provider);
    const registerInstance = new web3.eth.Contract(whiteDebridgeAbi as any, supportedChain.debridgeAddr);
    /* get blocks range */
    //console.log(await web3.eth.getBlockNumber());
    const toBlock = (await web3.eth.getBlockNumber()) - this.config.minConfirmations;
    const fromBlock = supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1;

    if (fromBlock >= toBlock) return;
    this.log.info(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

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
      await this.db.updateSupportedChainKey(supportedChain.chainId, 'latestBlock', toBlock);
    } else {
      this.log.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
    }
  }

  /* proccess new events */
  async processNewTransfers(events: EventData[], chainIdFrom: number) {
    if (!events) return true;
    let isOk = true;
    for (const e of events) {
      this.log.info(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${e.returnValues.submissionId}`);
      this.log.debug(e);
      /* remove chainIdTo  selector */
      const chainIdTo = e.returnValues.chainIdTo;
      const aggregatorInfo = await this.db.getAggregatorConfig(chainIdTo);
      if (!aggregatorInfo) continue;
      const chainConfig = await this.db.getChainConfig(aggregatorInfo.aggregatorChain);
      if (!chainConfig) {
        this.log.error(`Not found chainConfig: ${aggregatorInfo.aggregatorChain}`);
        isOk = false;
        continue;
      }

      /* call chainlink node */
      const submissionId = e.returnValues.submissionId;
      const submission = await this.db.getSubmission(submissionId);
      if (submission) {
        this.log.debug(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }
      await this.callChainlinkNode(chainConfig.mintJobId, chainConfig, submissionId, e.returnValues, chainIdFrom);
    }
    return isOk;
  }

  /* set chainlink cookies */
  async checkConfirmations(chainConfig) {
    //this.log.debug(`checkConfirmations ${chainConfig.network}`);

    //get chainTo for current aggregator
    const supportedChains = await this.db.getChainToForAggregator(chainConfig.chainId);
    this.log.debug(`checkConfirmations ${chainConfig.network} check submissions to network ${supportedChains.map(a => a.chainTo)}`);
    const createdSubmissions = await this.db.getSubmissionsByStatusAndChainTo(
      SubmisionStatus.CREATED,
      supportedChains.map(a => a.chainTo),
    );
    for (const submission of createdSubmissions) {
      const runInfo = await this.chainlink.getChainlinkRun(chainConfig.eichainlinkurl, submission.runId, chainConfig.cookie);
      if (runInfo) {
        if (runInfo.status == 'completed') await this.db.updateSubmissionStatus(submission.submissionId, SubmisionStatus.CONFIRMED);
        if (runInfo.status == 'errored') await this.db.updateSubmissionStatus(submission.submissionId, SubmisionStatus.REVERTED);
      }
    }
  }

  /* call the chainlink node and run a job */
  async callChainlinkNode(jobId: string, chainConfig, submissionId: string, e, chainIdFrom: number) {
    this.log.info(`callChainlinkNode jobId ${jobId}; submissionId: ${submissionId}`);
    const runId = await this.chainlink.postChainlinkRun(
      jobId,
      submissionId,
      chainConfig.eichainlinkurl,
      chainConfig.eiicaccesskey,
      chainConfig.eiicsecret,
    );
    this.log.info(`Received runId ${runId}; submissionId: ${submissionId}`);
    await this.db.createSubmission({
      submissionId,
      txHash: 'NULL',
      runId,
      chainFrom: chainIdFrom,
      chainTo: e.chainIdTo,
      debridgeId: e.debridgeId,
      receiverAddr: e.receiver,
      amount: e.amount,
      status: SubmisionStatus.CREATED,
    });
  }

  /* set chainlink cookies */
  async setAllChainlinkCookies() {
    this.log.debug(`Start setAllChainlinkCookies`);
    const chainConfigs = await this.db.getChainConfigs();
    for (const chainConfig of chainConfigs) {
      this.log.debug(`setAllChainlinkCookies ${chainConfig.network}`);
      const cookies = await this.chainlink.getChainlinkCookies(chainConfig.eiChainlinkUrl, chainConfig.network);
      await this.db.updateChainConfigCookie(chainConfig.chainId, cookies);
    }
  }
}

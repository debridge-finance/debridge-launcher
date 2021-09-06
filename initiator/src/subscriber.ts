import log4js from 'log4js';
import Web3 from 'web3';
import { abi as whiteDebridgeAbi } from '../assets/WhiteFullDebridge.json';
import { Db } from './db';
import { Chainlink } from './chainlink';
import { EventData } from 'web3-eth-contract';
const minConfirmations = parseInt(process.env.MIN_CONFIRMATIONS);
const SubmisionStatus = {
  CREATED: 0,
  BROADCASTED: 1,
  CONFIRMED: 2,
  REVERTED: 3,
};

const log = log4js.getLogger('subscriber');

class Subscriber {
  db: Db;
  chainlink: Chainlink;

  constructor() {
    this.db = new Db();
    this.chainlink = new Chainlink();
  }

  async init() {
    log.info('init');
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

      log.info(`setInterval ${supportedChain.interval} for checkNewEvents ${supportedChain.network}`);
      setInterval(async () => {
        try {
          await this.checkNewEvents(supportedChain.chainid);
        } catch (e) {
          log.error(e);
        }
      }, supportedChain.interval);
    }
    const chainConfigs = await this.db.getChainConfigs();
    for (const chainConfig of chainConfigs) {
      log.info(`setInterval 30000 for checkConfirmations ${chainConfig.network}`);
      setInterval(async () => {
        try {
          await this.checkConfirmations(chainConfig);
        } catch (e) {
          log.error(e);
        }
      }, 30000);
    }

    log.info(`setInterval 864000 for setAllChainlinkCookies`);
    setInterval(async () => {
      try {
        await this.setAllChainlinkCookies();
      } catch (e) {
        log.error(e);
      }
    }, 864000);
  }

  /* collect new events */
  async checkNewEvents(chainId: number) {
    log.debug(`checkNewEvents ${chainId}`);
    const supportedChain = await this.db.getSupportedChain(chainId);

    const web3 = new Web3(supportedChain.provider);
    const registerInstance = new web3.eth.Contract(whiteDebridgeAbi as any, supportedChain.debridgeaddr);
    /* get blocks range */
    //console.log(await web3.eth.getBlockNumber());
    const toBlock = (await web3.eth.getBlockNumber()) - minConfirmations;
    const fromBlock = supportedChain.latestblock > 0 ? supportedChain.latestblock : toBlock - 1;

    if (fromBlock >= toBlock) return;
    log.info(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

    /* get events */
    const sentEvents = await registerInstance.getPastEvents(
      'Sent',
      { fromBlock, toBlock }, //,
      //async (error, events) => {
      //    if (error) {
      //        log.error(error);
      //    }
      //    await this.processNewTransfers(events, supportedChain.chainid);
      //}
    );
    const burntEvents = await registerInstance.getPastEvents(
      'Burnt',
      { fromBlock, toBlock }, //,
      //async (error, events) => {
      //    if (error) {
      //        log.error(error);
      //    }
      //await this.processNewTransfers(events, supportedChain.chainid);
      //}
    );

    const isOk1 = await this.processNewTransfers(sentEvents, supportedChain.chainid);
    const isOk2 = await this.processNewTransfers(burntEvents, supportedChain.chainid);

    /* update lattest viewed block */
    //supportedChain.latestblock = toBlock;
    if (isOk1 && isOk2) {
      await this.db.updateSupportedChainKey(supportedChain.chainid, 'latestblock', toBlock);
    } else {
      log.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
    }
  }

  /* proccess new events */
  async processNewTransfers(events: EventData[], chainIdFrom: number) {
    if (!events) return true;
    let isOk = true;
    for (const e of events) {
      log.info(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${e.returnValues.submissionId}`);
      log.debug(e);
      /* remove chainIdTo  selector */
      const chainIdTo = e.returnValues.chainIdTo;
      const aggregatorInfo = await this.db.getAggregatorConfig(chainIdTo);
      if (!aggregatorInfo) continue;
      const chainConfig = await this.db.getChainConfig(aggregatorInfo.aggregatorchain);
      if (!chainConfig) {
        log.error(`Not found chainConfig: ${aggregatorInfo.aggregatorchain}`);
        isOk = false;
        continue;
      }

      /* call chainlink node */
      const submissionId = e.returnValues.submissionId;
      const submission = await this.db.getSubmission(submissionId);
      if (submission) {
        log.debug(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }
      await this.callChainlinkNode(chainConfig.submitjobid, chainConfig, submissionId, e.returnValues, chainIdFrom);
    }
    return isOk;
  }

  /* set chainlink cookies */
  async checkConfirmations(chainConfig) {
    //log.debug(`checkConfirmations ${chainConfig.network}`);

    //get chainTo for current aggregator
    const supportedChains = await this.db.getChainToForAggregator(chainConfig.chainid);
    log.debug(`checkConfirmations ${chainConfig.network} check submissions to network ${supportedChains.map(a => a.chainto)}`);
    const createdSubmissions = await this.db.getSubmissionsByStatusAndChainTo(
      SubmisionStatus.CREATED,
      supportedChains.map(a => a.chainto),
    );
    for (const submission of createdSubmissions) {
      const runInfo = await this.chainlink.getChainlinkRun(chainConfig.eichainlinkurl, submission.runid, chainConfig.cookie);
      if (runInfo) {
        if (runInfo.status == 'completed') await this.db.updateSubmissionStatus(submission.submissionid, SubmisionStatus.CONFIRMED);
        if (runInfo.status == 'errored') await this.db.updateSubmissionStatus(submission.submissionid, SubmisionStatus.REVERTED);
      }
    }
  }

  /* call the chainlink node and run a job */
  async callChainlinkNode(jobId: number, chainConfig, submissionId: number, e, chainIdFrom: number) {
    log.info(`callChainlinkNode jobId ${jobId}; submissionId: ${submissionId}`);
    const runId = await this.chainlink.postChainlinkRun(
      jobId,
      submissionId,
      chainConfig.eichainlinkurl,
      chainConfig.eiicaccesskey,
      chainConfig.eiicsecret,
    );
    log.info(`Received runId ${runId}; submissionId: ${submissionId}`);
    await this.db.createSubmission(
      submissionId,
      'NULL',
      runId,
      chainIdFrom,
      e.chainIdTo,
      e.debridgeId,
      e.receiver,
      e.amount,
      SubmisionStatus.CREATED,
    );
  }

  /* set chainlink cookies */
  async setAllChainlinkCookies() {
    log.debug(`Start setAllChainlinkCookies`);
    const chainConfigs = await this.db.getChainConfigs();
    for (const chainConfig of chainConfigs) {
      log.debug(`setAllChainlinkCookies ${chainConfig.network}`);
      const cookies = await this.chainlink.getChainlinkCookies(chainConfig.eichainlinkurl, chainConfig.network);
      await this.db.updateChainConfigCokie(chainConfig.chainid, cookies);
    }
  }
}

export { Subscriber };

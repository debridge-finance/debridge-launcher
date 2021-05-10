const Web3 = require("web3");
const whiteDebridgeAbi = require("../assets/WhiteFullDebridge.json").abi;
const { Db } = require("./db");
const { Chainlink } = require("./chainlink");
const minConfirmations = process.env.MIN_CONFIRMATIONS;
const SubmisionStatus = {
  CREATED: 0,
  BROADCASTED: 1,
  CONFIRMED: 2,
  REVERTED: 3,
};

class Subscriber {
  constructor() {
    this.db = new Db();
    this.chainlink = new Chainlink();
  }

  async init() {
    await this.db.connectDb();
    await this.db.createTables();
    await this.setAllChainlinkCookies();
    await this.subscribe();
  }

  /* call the chainlink node and run a job */
  async subscribe() {
    const supportedChains = await this.db.getSupportedChains();
    for (let supportedChain of supportedChains) {
      const web3 = new Web3(supportedChain.provider);
      const registerInstance = new web3.eth.Contract(
        whiteDebridgeAbi,
        supportedChain.debridgeaddr
      );

      setInterval(() => {
        this.checkNewEvents(supportedChain, web3, registerInstance);
      }, supportedChain.interval);
    }
    const chainConfigs = await this.db.getChainConfigs();
    for (let chainConfig of chainConfigs) {
      setInterval(() => {
        this.checkConfirmations(chainConfig);
      }, 10000);
    }
    setInterval(() => {
      this.setAllChainlinkCookies();
    }, 86400);
  }

  /* collect new events */
  async checkNewEvents(supportedChain, web3, registerInstance) {
    /* get blocks range */
    console.log(await web3.eth.getBlockNumber());
    const toBlock = (await web3.eth.getBlockNumber()) - minConfirmations;
    const fromBlock = supportedChain.latestblock;
    if (fromBlock >= toBlock) return;

    /* get events */
    registerInstance.getPastEvents(
      "Sent",
      { fromBlock, toBlock },
      async (error, events) => {
        await this.processNewTransfers(events, supportedChain.chainid);
      }
    );
    registerInstance.getPastEvents(
      "Burnt",
      { fromBlock, toBlock },
      async (error, events) => {
        await this.processNewTransfers(events, supportedChain.chainid);
      }
    );

    /* update lattest viewed block */
    supportedChain.latestblock = toBlock;
    await this.db.updateSupportedChainBlock(supportedChain.chainid, toBlock);
  }

  /* proccess new events */
  async processNewTransfers(events, chainIdFrom) {
    if (!events) return;

    for (let e of events) {
      /* remove chainIdTo  selector */
      const chainIdTo = e.returnValues.chainIdTo;
      const aggregatorInfo = await this.db.getAggregatorConfig(chainIdTo);
      if (!aggregatorInfo) continue;
      const chainConfig = await this.db.getChainConfig(
        aggregatorInfo.aggregatorchain
      );
      if (!chainConfig) continue;

      /* call chainlink node */
      const submissionId = e.returnValues.submissionId;
      const submission = await this.db.getSubmission(submissionId);
      if (submission) continue;
      this.callChainlinkNode(
        chainConfig.submitjobid,
        chainConfig,
        submissionId,
        e.returnValues,
        chainIdFrom
      );
    }
  }

  /* set chainlink cookies */
  async checkConfirmations(chainConfig) {
    const createdSubmissions = await this.db.getSubmissionsByStatus(
      SubmisionStatus.CREATED
    );
    for (let submission of createdSubmissions) {
      const runInfo = await this.chainlink.getChainlinkRun(
        chainConfig.eichainlinkurl,
        submission.runid,
        chainConfig.cookie
      );
      if (runInfo) {
        if (runInfo.status == "completed")
          await this.db.updateSubmissionStatus(
            submission.submissionId,
            SubmisionStatus.CONFIRMED
          );
        if (runInfo.status == "errored")
          await this.db.updateSubmissionStatus(
            submission.submissionId,
            SubmisionStatus.REVERTED
          );
      }
    }
  }

  /* call the chainlink node and run a job */
  async callChainlinkNode(jobId, chainConfig, submissionId, e, chainIdFrom) {
    const runId = await this.chainlink.postChainlinkRun(
      jobId,
      submissionId,
      chainConfig.eichainlinkurl,
      chainConfig.eiicaccesskey,
      chainConfig.eiicsecret
    );

    await this.db.createSubmission(
      submissionId,
      "NULL",
      runId,
      chainIdFrom,
      e.chainIdTo,
      e.debridgeId,
      e.receiver,
      e.amount,
      SubmisionStatus.CREATED
    );
  }

  /* set chainlink cookies */
  async setAllChainlinkCookies() {
    const chainConfigs = await this.db.getChainConfigs();
    for (const chainConfig of chainConfigs) {
      const cookies = await this.chainlink.getChainlinkCookies(
        chainConfig.eichainlinkurl
      );
      await this.db.updateChainConfigCokie(chainConfig.chainid, cookies);
    }
  }
}

module.exports.Subscriber = Subscriber;

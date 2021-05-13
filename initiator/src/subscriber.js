const log4js = require('log4js');
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

const log = log4js.getLogger("subscriber");


class Subscriber {
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
        for (let supportedChain of supportedChains) {
            //const web3 = new Web3(supportedChain.provider);
            //const registerInstance = new web3.eth.Contract(
            //    whiteDebridgeAbi,
            //    supportedChain.debridgeaddr
            //);

            log.info(`setInterval ${supportedChain.interval} for checkNewEvents ${supportedChain.network}`);
            setInterval(async () => {
                try {
                    await this.checkNewEvents(supportedChain);
                }
                catch (e) {
                    log.error(e);
                }
            }, supportedChain.interval);
        }
        const chainConfigs = await this.db.getChainConfigs();
        for (let chainConfig of chainConfigs) {
            log.info(`setInterval 30000 for checkConfirmations ${chainConfig.network}`);
            setInterval(async() => {
                try {
                    await this.checkConfirmations(chainConfig);
                }
                catch (e) {
                    log.error(e);
                }
            }, 30000);
        }

        log.info(`setInterval 864000 for setAllChainlinkCookies`);
        setInterval(async () => {
            try {
                await this.setAllChainlinkCookies();
            }
            catch (e) {
                log.error(e);
            }
        }, 864000);
    }

    /* collect new events */
    async checkNewEvents(supportedChain) {
        log.debug(`checkNewEvents ${supportedChain.network}`);

        const web3 = new Web3(supportedChain.provider);
        const registerInstance = new web3.eth.Contract(
            whiteDebridgeAbi,
            supportedChain.debridgeaddr
        );
        /* get blocks range */
        //console.log(await web3.eth.getBlockNumber());
        const toBlock = (await web3.eth.getBlockNumber()) - minConfirmations;
        const fromBlock = supportedChain.latestblock;
        if (fromBlock >= toBlock) return;
        log.info(`checkNewEvents ${supportedChain.network} ${fromBlock}-${toBlock}`);

        /* get events */
        const sentEvents =  await registerInstance.getPastEvents(
            "Sent",
            { fromBlock, toBlock }//,
            //async (error, events) => {
            //    if (error) {
            //        log.error(error);
            //    }
            //    await this.processNewTransfers(events, supportedChain.chainid);
            //}
        );
        const burntEvents = await registerInstance.getPastEvents(
            "Burnt",
            { fromBlock, toBlock }//,
            //async (error, events) => {
            //    if (error) {
            //        log.error(error);
            //    }
                //await this.processNewTransfers(events, supportedChain.chainid);
            //}
        );
        await this.processNewTransfers(sentEvents, supportedChain.chainid);
        await this.processNewTransfers(burntEvents, supportedChain.chainid);

        /* update lattest viewed block */
        supportedChain.latestblock = toBlock;
        await this.db.updateSupportedChainBlock(supportedChain.chainid, toBlock);
    }

    /* proccess new events */
    async processNewTransfers(events, chainIdFrom) {
        if (!events) return;

        for (let e of events) {
            log.info(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${e.returnValues.submissionId}`);
            log.debug(e);
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
            if (submission) {
                log.debug(`Submission already found in db submissionId: ${submissionId}`);
                continue;
            }
            await this.callChainlinkNode(
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
        //log.debug(`checkConfirmations ${chainConfig.network}`);

        //get chainTo for current aggregator
        const supportedChains = await this.db.getChainToForAggregator(chainConfig.chainid);
        log.debug(`checkConfirmations ${chainConfig.network} check submissions to network ${supportedChains.map(a => a.chainto)}`);
        const createdSubmissions = await this.db.getSubmissionsByStatusAndChainTo(
            SubmisionStatus.CREATED,
            supportedChains.map(a => a.chainto)
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
                        submission.submissionid,
                        SubmisionStatus.CONFIRMED
                    );
                if (runInfo.status == "errored")
                    await this.db.updateSubmissionStatus(
                        submission.submissionid,
                        SubmisionStatus.REVERTED
                    );
            }
        }
    }

    /* call the chainlink node and run a job */
    async callChainlinkNode(jobId, chainConfig, submissionId, e, chainIdFrom) {
        log.info(`callChainlinkNode jobId ${jobId}; submissionId: ${submissionId}`);
        const runId = await this.chainlink.postChainlinkRun(
            jobId,
            submissionId,
            chainConfig.eichainlinkurl,
            chainConfig.eiicaccesskey,
            chainConfig.eiicsecret
        );
        log.info(`Received runId ${runId}; submissionId: ${submissionId}`);
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
        log.debug(`Start setAllChainlinkCookies`);
        const chainConfigs = await this.db.getChainConfigs();
        for (const chainConfig of chainConfigs) {
            log.debug(`setAllChainlinkCookies ${chainConfig.network}`);
            const cookies = await this.chainlink.getChainlinkCookies(
                chainConfig.eichainlinkurl
            );
            await this.db.updateChainConfigCokie(chainConfig.chainid, cookies);
        }
    }
}

module.exports.Subscriber = Subscriber;

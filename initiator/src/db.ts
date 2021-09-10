import log4js from 'log4js';
import { createConnection, getRepository, In } from 'typeorm';
import { dbConnection } from '@databases';
import { SupportedChainEntity, ChainlinkConfigEntity, SubmissionsEntity, AggregatorChainsEntity } from './entity/tables.entity';
import { AggregatorChains, ChainlinkConfig, Submissions, SupportedChain } from './interfaces/tables.interface';
import chainConfigs from './config/chains.json';

class Db {
  log: log4js.Logger;
  public supportedChains = SupportedChainEntity;
  public chainlinkConfig = ChainlinkConfigEntity;
  public submissions = SubmissionsEntity;
  public aggregatorChains = AggregatorChainsEntity;

  constructor() {
    this.log = log4js.getLogger('Db');
  }

  async connectDb() {
    this.log.info('connectDb');
    createConnection(dbConnection);
  }

  async createTables() {
    this.log.info('createTables');
    chainConfigs.forEach(async (config: SupportedChain) => {
      const isTableExist = await this.getSupportedChain(config.chainId);
      if (!isTableExist) {
        this.log.info(`createSupportedChain network: ${config.network}`);
        await this.createSupportedChain({
          ...config,
          latestBlock: 0,
        });
      } else {
        await this.updateSupportedChain(config.chainId, config);
      }
    });
  }

  async createChainConfig(chainConfig: ChainlinkConfig) {
    this.log.info(`createChainConfig chainId: ${chainConfig.chainId}; cookie: ${chainConfig.cookie}; network: ${chainConfig.network}`);
    const chainConfigRepository = getRepository(this.chainlinkConfig);
    await chainConfigRepository.save(chainConfig);
  }

  async createSupportedChain(supportedChain: SupportedChain) {
    this.log.info(
      `createSupportedChain chainId: ${supportedChain.chainId}; latestBlock: ${supportedChain.latestBlock}; network: ${supportedChain.network}; provider: ${supportedChain.provider}; debridgeAddr: ${supportedChain.debridgeAddr}; interval: ${supportedChain.interval};`,
    );
    const supportedChainsRepository = getRepository(this.supportedChains);
    await supportedChainsRepository.save(supportedChain);
  }

  async createSubmission(submission: Submissions) {
    this.log.info(`createSubmission submissionId ${submission.submissionId}; txHash: ${submission.txHash}; runId: ${submission.runId}`);
    const submissionsRepository = getRepository(this.submissions);
    await submissionsRepository.save(submission);
  }

  async getChainConfigs(): Promise<ChainlinkConfig[]> {
    const chainConfigRepository = getRepository(this.chainlinkConfig);
    const chainConfigs: ChainlinkConfig[] = await chainConfigRepository.find();
    return chainConfigs;
  }

  async getChainConfig(chainId: number): Promise<ChainlinkConfig> {
    const chainConfigRepository = getRepository(this.chainlinkConfig);
    const chainConfig: ChainlinkConfig = await chainConfigRepository.findOne({ where: { chainId } });
    return chainConfig;
  }

  async getAggregatorConfig(chainId: number): Promise<AggregatorChains> {
    const aggConfigRepository = getRepository(this.aggregatorChains);
    const aggConfig: AggregatorChains = await aggConfigRepository.findOne({ where: { chainId } });
    return aggConfig;
  }

  async getChainToForAggregator(aggregatorChain: number): Promise<AggregatorChains[]> {
    const aggConfigRepository = getRepository(this.aggregatorChains);
    const aggConfig: AggregatorChains[] = await aggConfigRepository.find({ where: { aggregatorChain } });
    return aggConfig;
  }

  async getSupportedChains(): Promise<SupportedChain[]> {
    const supportedChainsRepository = getRepository(this.supportedChains);
    const supportedChains: SupportedChain[] = await supportedChainsRepository.find();
    return supportedChains;
  }

  async getSupportedChain(chainId: number): Promise<SupportedChain> {
    const supportedChainsRepository = getRepository(this.supportedChains);
    const supportedChains: SupportedChain = await supportedChainsRepository.findOne({ where: { chainId } });
    return supportedChains;
  }

  async getSubmissionsByStatus(status: number): Promise<Submissions[]> {
    const submissionsRepository = getRepository(this.submissions);
    const submissions: Submissions[] = await submissionsRepository.find({ where: { status } });
    return submissions;
  }

  async getSubmissionsByStatusAndChainTo(status: number, chainsTo: number[]) {
    const submissionsRepository = getRepository(this.submissions);
    const submissions: Submissions[] = await submissionsRepository.find({ where: { status, chainTo: In(chainsTo) } });
    return submissions;
  }

  async getSubmission(submissionId: string): Promise<Submissions> {
    const submissionsRepository = getRepository(this.submissions);
    const submission: Submissions = await submissionsRepository.findOne({ where: { submissionId } });
    return submission;
  }

  async updateSupportedChainKey(chainId: number, key: string, value: any) {
    const supportedChainsRepository = getRepository(this.supportedChains);
    const supportedChain = await this.getSupportedChain(chainId);
    if (supportedChain[key] != value) {
      this.log.info(`updateSupportedChainBlock chainId: ${chainId}; key: ${key}; value: ${value}`);
      await supportedChainsRepository.update(chainId, { ...supportedChain, [key]: value });
    }
  }

  async updateSupportedChain(chainId: number, values: any) {
    const supportedChainsRepository = getRepository(this.supportedChains);
    const supportedChain = await this.getSupportedChain(chainId);
    await supportedChainsRepository.update(chainId, { ...supportedChain, ...values });
  }

  async updateSubmissionStatus(submissionId: string, status: number) {
    this.log.info(`updateSubmissionStatus submissionId: ${submissionId}; status: ${status}`);
    const submissionsRepository = getRepository(this.submissions);
    const submission = await this.getSubmission(submissionId);
    await submissionsRepository.update(submissionId, { ...submission, status });
  }

  async updateSubmissionTxHash(submissionId: string, txHash: string) {
    this.log.info(`updateSubmissionTxHash submissionId: ${submissionId}; txHash: ${txHash}`);
    const submissionsRepository = getRepository(this.submissions);
    const submission = await this.getSubmission(submissionId);
    await submissionsRepository.update(submissionId, { ...submission, txHash });
  }

  async updateChainConfigCookie(chainId: number, cookie: string) {
    this.log.info(`updateChainConfigCokie chainId: ${chainId}; cookie: ${cookie}`);
    const chainConfigRepository = getRepository(this.chainlinkConfig);
    const chainConfig = await this.getChainConfig(chainId);
    await chainConfigRepository.update(chainId, { ...chainConfig, cookie });
  }
}

export { Db };

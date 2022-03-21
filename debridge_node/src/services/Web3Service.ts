import { Injectable, Logger } from '@nestjs/common';
import Web3 from 'web3';
import { ChainProvider } from './ChainConfigService';
import { ConfigService } from '@nestjs/config';

export class Web3Custom extends Web3 {
  constructor(readonly chainProvider: string, httpProvider) {
    super(httpProvider);
  }
}

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly web3Timeout: number;
  private readonly providersMap = new Map<string, Web3Custom>();

  constructor(private readonly configService: ConfigService) {
    this.web3Timeout = parseInt(configService.get('WEB3_TIMEOUT', '10000'));
  }

  web3(): Web3 {
    return new Web3();
  }

  async web3HttpProvider(chainProvider: ChainProvider): Promise<Web3Custom> {
    for (const provider of [...chainProvider.getNotFailedProviders(), ...chainProvider.getFailedProviders()]) {
      if (this.providersMap.has(provider)) {
        const web3 = this.providersMap.get(provider);
        const isWorking = await this.checkConnectionHttpProvider(web3);
        if (isWorking) {
          this.logger.verbose(`Old provider is working`);
          return web3;
        }
        this.logger.error(`Old provider ${provider} is not working`);
      }

      const httpProvider = new Web3Custom.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
        keepAlive: true,
        headers: chainProvider.getChainAuth(provider),
      });

      const web3 = new Web3Custom(provider, httpProvider);
      const isWorking = await this.checkConnectionHttpProvider(web3);

      if (!isWorking) {
        chainProvider.setProviderStatus(provider, false);
        continue;
      }
      if (!chainProvider.getProviderValidationStatus(provider)) {
        await this.validateChainId(chainProvider, provider);
      }
      chainProvider.setProviderStatus(provider, true);
      this.providersMap.set(provider, web3);
      return web3;
    }
    this.logger.error(`Cann't connect to any provider ${chainProvider.getAllProviders()}`);
    process.exit(1);
  }

  private async checkConnectionHttpProvider(web3: Web3Custom): Promise<boolean> {
    const provider = web3.chainProvider;
    try {
      this.logger.log(`Connection to ${provider} is started`);
      await web3.eth.getBlockNumber();
      this.logger.log(`Connection to ${provider} is success`);
      return true;
    } catch (e) {
      this.logger.error(`Cann't connect to ${provider}: ${e.message}`);
      this.logger.error(e);
    }
    return false;
  }

  async validateChainId(chainProvider: ChainProvider, provider: string) {
    try {
      const httpProvider = new Web3Custom.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
        keepAlive: false,
        headers: chainProvider.getChainAuth(provider),
      });
      const web3 = new Web3Custom(provider, httpProvider);
      const web3ChainId = await web3.eth.getChainId();
      if (web3ChainId !== chainProvider.getChainId()) {
        this.logger.error(`Checking correct RPC from config is failed (in config ${chainProvider.getChainId()} in rpc ${web3ChainId})`);
        process.exit(1);
      }
      chainProvider.setProviderValidationStatus(provider, true);
    } catch (error) {
      this.logger.error(`Catch error: ${error}; provider: ${provider}`);
    }
  }
}

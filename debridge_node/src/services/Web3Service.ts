import { Injectable, Logger } from '@nestjs/common';
import Web3 from 'web3';
import { ChainProvider } from './ChainConfigService';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly web3Timeout: number;
  private readonly providersMap = new Map();

  constructor(private readonly configService: ConfigService) {
    this.web3Timeout = parseInt(configService.get('WEB3_TIMEOUT', '10000'));
  }

  async web3HttpProvider(chainProvider: ChainProvider): Promise<Web3> {
    for (const provider of [...chainProvider.getNotFailedProviders(), ...chainProvider.getFailedProviders()]) {
      if (this.providersMap.has(provider)) {
        const web3 = this.providersMap.get(provider);
        const isWorking = this.checkConnectionHttpProvider(web3);
        if (isWorking) {
          this.logger.verbose(`Old provider is working`);
          return web3;
        }
        this.logger.error(`Old provider ${provider} is not working`);
      }
      const httpProvider = new Web3.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
        keepAlive: false,
      });
      const web3 = new Web3(httpProvider);
      const isWorking = this.checkConnectionHttpProvider(web3);
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
    this.logger.error(`Cann't connect to any provider`);
    process.kill(process.pid, 'SIGQUIT');
  }

  private async checkConnectionHttpProvider(web3): Promise<boolean> {
    const provider = web3.currentProvider.host;
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
      const httpProvider = new Web3.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
        keepAlive: false,
      });
      const web3 = new Web3(httpProvider);
      const web3ChainId = await web3.eth.getChainId();
      if (web3ChainId !== chainProvider.getChainId()) {
        this.logger.error(`Checking correct RPC from config is failed (in config ${chainProvider.getChainId()} in rpc ${web3ChainId})`);
        process.exit(1);
      }
      chainProvider.setProviderValidationStatus(provider, true);
    } catch (error) {
      this.logger.error(`Catch error: ${error}`);
    }
  }
}

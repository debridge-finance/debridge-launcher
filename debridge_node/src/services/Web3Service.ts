import { Injectable, Logger } from '@nestjs/common';
import Web3 from 'web3';
import { ChainProvider } from './ChainConfigService';
import { ConfigService } from '@nestjs/config';

interface Web3FunctionExecutor<T> {
  (web3: Web3): Promise<T>;
}

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly web3Timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.web3Timeout = parseInt(configService.get('WEB3_TIMEOUT', '10000'));
  }

  async web3Execution<T>(chainProvider: ChainProvider, executor: Web3FunctionExecutor<T>): Promise<T> {
    for (const provider of [...chainProvider.getNotFailedProviders(), ...chainProvider.getFailedProviders()]) {
      const { web3, httpProvider } = await this.checkConnectionHttpProvider(provider);
      if (!web3) {
        chainProvider.setProviderStatus(provider, false);
        continue;
      }
      if (!chainProvider.getProviderValidationStatus(provider)) {
        await this.validateChainId(chainProvider, provider);
      }
      chainProvider.setProviderStatus(provider, true);
      try {
        this.logger.verbose(`web3 executor is started`);
        const res = await executor(web3);
        this.logger.verbose(`web3 executor is finished`);
        return res;
      } catch (e) {
        this.logger.error(`Error in web3 executor ${e.message}`);
      } finally {
        await httpProvider.disconnect();
      }
    }
    this.logger.error(`Cann't connect to any provider`);
    process.kill(process.pid, 'SIGQUIT');
  }

  private async checkConnectionHttpProvider(provider: string): Promise<{ web3: Web3, httpProvider }> {
    try {
      const httpProvider = new Web3.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
      });
      const web3 = new Web3(httpProvider);
      this.logger.log(`Connection to ${provider} is started`);
      await web3.eth.getBlockNumber();
      this.logger.log(`Connection to ${provider} is success`);
      return { web3, httpProvider };
    } catch (e) {
      this.logger.error(`Cann't connect to ${provider}: ${e.message}`);
      this.logger.error(e);
    }
    return undefined;
  }

  async validateChainId(chainProvider: ChainProvider, provider: string) {
    let httpProvider;
    try {
      httpProvider = new Web3.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
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
    } finally {
      await httpProvider.disconnect();
    }
  }
}

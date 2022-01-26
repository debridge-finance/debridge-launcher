import { Injectable, Logger } from '@nestjs/common';
import Web3 from 'web3';
import { ChainProvider } from './ChainConfigService';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly web3Timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.web3Timeout = parseInt(configService.get('WEB3_TIMEOUT'));
  }

  async web3HttpProvider(chainProvider: ChainProvider): Promise<Web3> {
    for (const provider of [...chainProvider.getNotFailedProviders(), ...chainProvider.getFailedProviders()]) {
      const web3 = await this.checkConnectionHttpProvider(provider);
      if (web3) {
        chainProvider.setProviderStatus(provider, true);
        return web3;
      } else {
        chainProvider.setProviderStatus(provider, false);
      }
    }

    this.logger.error(`Cann't connect to any provider`);
  }

  private async checkConnectionHttpProvider(provider: string): Promise<Web3> {
    let web3 = undefined;
    try {
      const httpProvider = new Web3.providers.HttpProvider(provider, {
        timeout: this.web3Timeout,
      });
      web3 = new Web3(httpProvider);
      this.logger.log(`Connection to ${provider} is started`);
      await web3.eth.getBlockNumber();
      this.logger.log(`Connection to ${provider} is success`);
      return web3;
    } catch (e) {
      this.logger.error(`Cann't connect to ${provider}: ${e.message}`);
      this.logger.error(e);
    }
    return web3;
  }
}

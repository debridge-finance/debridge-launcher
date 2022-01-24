import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';

/**
 * Chain provider
 */
export class ChainProvider {
  constructor(private readonly providers: Map<string, boolean>) {}

  /**
   * Get not failed provider
   */
  getNotFailedProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      if (this.providers.get(provider)) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Get failed provider
   */
  getFailedProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      if (!this.providers.get(provider)) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Get all prochviders
   */
  getAllProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      providers.push(provider);
    }
    return providers;
  }

  /**
   * Get status of provider
   * @param {string} provider
   * @param {boolean} status
   */
  setProviderStatus(provider: string, status: boolean) {
    this.providers.set(provider, status);
  }
}

export class ChainConfig {
  chainId: number;
  name: string;
  debridgeAddr: string;
  firstStartBlock: number;
  providers: ChainProvider;
  interval: number;
  blockConfirmation: number;
  maxBlockRange: number;
}

/**
 * Service for controlling configs of chain
 */
@Injectable()
export class ChainConfigService {
  private readonly configs = new Map<number, ChainConfig>();
  private readonly chains: number[] = [];

  constructor() {
    const chainConfigs = JSON.parse(readFileSync('config/chains_config.json', { encoding: 'utf-8' }));
    chainConfigs.forEach(config => {
      this.chains.push(config.chainId);
      this.configs.set(config.chainId, {
        chainId: config.chainId,
        name: config.name,
        debridgeAddr: config.debridgeAddr,
        firstStartBlock: config.firstStartBlock,
        providers: this.generateChainProvides(config),
        interval: config.interval,
        blockConfirmation: config.blockConfirmation,
        maxBlockRange: config.maxBlockRange,
      } as ChainConfig);
    });
  }

  /**
   * Get chain config
   * @param chainId
   */
  get(chainId: number) {
    return this.configs.get(chainId);
  }

  /**
   * Get chains
   */
  getChains() {
    return this.chains;
  }

  private generateChainProvides(config: any): ChainProvider {
    const providers = new Map<string, boolean>();
    if (config.providers) {
      config.providers.forEach(provider => {
        providers.set(provider, true);
      });
    } else if (config.provider) {
      providers.set(config.provider, true);
    }
    return new ChainProvider(providers);
  }
}

import { Injectable } from '@nestjs/common';
import chainConfigs from '../config/chains_config.json';

interface ChainProviderDetail {
  isValid: boolean;
  isActive: boolean;
}

/**
 * Chain provider
 */
export class ChainProvider {
  private readonly providers = new Map<string, ChainProviderDetail>();
  constructor(private readonly providerList: string[], private readonly chainId: number) {
    for (const provider of providerList) {
      this.providers.set(provider, {
        isValid: false,
        isActive: true,
      });
    }
  }

  /**
   * Get not failed provider
   */
  getNotFailedProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      if (this.providers.get(provider).isActive && this.providers.get(provider).isValid) {
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
      if (!this.providers.get(provider).isActive) {
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
   * Set status to provider
   * @param {string} provider
   * @param {boolean} status
   */
  setProviderStatus(provider: string, status: boolean) {
    const details = this.providers.get(provider);
    details.isActive = status;
    this.providers.set(provider, details);
  }

  /**
   * Get status to provider
   * @param {string} provider
   */
  getProviderStatus(provider: string): boolean {
    const details = this.providers.get(provider);
    return details.isActive;
  }

  /**
   * Set validation status to provider
   * @param {string} provider
   * @param {boolean} status
   */
  setProviderValidationStatus(provider: string, status: boolean) {
    const details = this.providers.get(provider);
    details.isValid = status;
    this.providers.set(provider, details);
  }

  /**
   * Get validation status to provider
   * @param {string} provider
   */
  getProviderValidationStatus(provider: string): boolean {
    const details = this.providers.get(provider);
    return details.isValid;
  }

  /**
   * Get counts of providers
   */
  size(): number {
    return this.providers.size;
  }

  /**
   * Get id of chain
   */
  getChainId(): number {
    return this.chainId;
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

  /**
   * Get chains
   */
  getConfig() {
    return chainConfigs;
  }

  private generateChainProvides(config: any): ChainProvider {
    let providers: string[] = [];
    if (config.providers) {
      providers = config.providers;
    } else if (config.provider) {
      providers = [config.provider];
    }
    return new ChainProvider(providers, config.chainId);
  }
}

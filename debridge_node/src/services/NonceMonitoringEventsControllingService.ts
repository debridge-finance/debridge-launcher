import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class NonceMonitoringEventsControllingService implements OnModuleInit {
  private readonly maxNonceChains = new Map<number, number>();
  private readonly logger = new Logger(NonceMonitoringEventsControllingService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async onModuleInit() {
    const chains = await this.entityManager.query(`
    SELECT monitoring_event."chainId", MAX(nonce)
      FROM public.monitoring_sent_event as monitoring_event
      JOIN public.supported_chains as chains
      ON (chains."chainId" = monitoring_event."chainId")
      WHERE monitoring_event."blockNumber" <= chains."latestBlockMonitoring"  GROUP BY monitoring_event."chainId";
        `);
    for (const { chainFrom, max } of chains) {
      this.maxNonceChains.set(chainFrom, max);
      this.logger.verbose(`Max nonce for monitoring events in chain ${chainFrom} is ${max}`);
    }
  }

  get(chainId: number): number {
    return this.maxNonceChains.get(chainId);
  }

  set(chainId: number, nonce: number) {
    this.maxNonceChains.set(chainId, nonce);
  }
}

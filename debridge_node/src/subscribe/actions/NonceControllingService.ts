import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class NonceControllingService implements OnModuleInit {
  private readonly maxNonceChains = new Map<number, number>();
  private readonly logger = new Logger(NonceControllingService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async onModuleInit() {
    const chains = await this.entityManager.query(`
    SELECT "chainFrom", MAX(nonce) 
      FROM public.submissions as submissions 
      JOIN public.supported_chains as chains 
      ON (chains."chainId" = submissions."chainFrom") 
      WHERE submissions."blockNumber" <= chains."latestBlock"  GROUP BY "chainFrom"
        `);
    for (const { chainFrom, max } of chains) {
      this.maxNonceChains.set(chainFrom, max);
      this.logger.verbose(`Max nonce in chain ${chainFrom} is ${max}`);
    }
  }

  get(chainId: number): number {
    return this.maxNonceChains.get(chainId);
  }

  set(chainId: number, nonce: number) {
    this.maxNonceChains.set(chainId, nonce);
  }
}

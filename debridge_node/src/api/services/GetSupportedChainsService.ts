/**
 * Service for working with SupportedChain
 */
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GetSupportedChainsService {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
  ) {}

  /**
   * Get list of SupportedChainEntity
   */
  get(): Promise<SupportedChainEntity[]> {
    return this.supportedChainRepository.find();
  }
}

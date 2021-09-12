import { Injectable } from '@nestjs/common';
import { ChainlinkConfigEntity } from '../entities/ChainlinkConfigEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ChainLinkConfigService {
  constructor(
    @InjectRepository(ChainlinkConfigEntity)
    private readonly chainlinkConfigRepository: Repository<ChainlinkConfigEntity>,
  ) {}

  async insert(config: ChainlinkConfigEntity) {
    const chainlinkConfig = await this.chainlinkConfigRepository.findOne({
      chainId: config.chainId,
    });
    if (!chainlinkConfig) {
      return this.chainlinkConfigRepository.save(config);
    }
  }

  update(config: ChainlinkConfigEntity) {
    return this.chainlinkConfigRepository.update(config.chainId, config);
  }
}

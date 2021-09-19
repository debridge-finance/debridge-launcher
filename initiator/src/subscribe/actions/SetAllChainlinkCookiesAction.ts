import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { Repository } from 'typeorm';
import { ChainlinkService } from '../../chainlink/ChainlinkService';

@Injectable()
export class SetAllChainlinkCookiesAction implements IAction {
  private readonly logger = new Logger(SetAllChainlinkCookiesAction.name);

  constructor(
    @InjectRepository(ChainlinkConfigEntity)
    private readonly chainlinkConfigRepository: Repository<ChainlinkConfigEntity>,
    private readonly chainlinkService: ChainlinkService,
  ) {}

  async action() {
    this.logger.log(`Start setAllChainlinkCookies`);
    const chainConfigs = await this.chainlinkConfigRepository.find();
    for (const chainConfig of chainConfigs) {
      this.logger.debug(`setAllChainlinkCookies ${chainConfig.network}`);
      const cookies = await this.chainlinkService.getChainlinkCookies(chainConfig.eiChainlinkUrl, chainConfig.network);

      const { affected } = await this.chainlinkConfigRepository.update(
        { chainId: chainConfig.chainId },
        {
          cookie: cookies,
        },
      );
      if (affected !== 1) {
        this.logger.error(`Chainconfig ${chainConfig.chainId} is not updated`);
      }
    }
    this.logger.log(`Finish setAllChainlinkCookies`);
  }
}

import { AddNewEventsAction } from '../../subscribe/actions/AddNewEventsAction';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ChainConfigService } from '../../services/ChainConfigService';

/**
 * Rescan service
 */
export class RescanService {
  private readonly logger = new Logger();

  constructor(private readonly addNewEventsAction: AddNewEventsAction, private readonly chainConfigService: ChainConfigService) {}

  /**
   * Rescan
   * @param chainId
   * @param fromBlock
   * @param toBlock
   */
  rescan(chainId: number, fromBlock: number, toBlock: number) {
    const chainDetail = this.chainConfigService.get(chainId);

    if (toBlock - fromBlock >= chainDetail.maxBlockRange) {
      const e = new HttpException('Out of range', HttpStatus.METHOD_NOT_ALLOWED);
      this.logger.error(e);
      throw e;
    }
    return this.addNewEventsAction.process(chainId, fromBlock, toBlock);
  }
}

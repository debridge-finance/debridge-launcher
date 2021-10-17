import { AddNewEventsAction } from '../../subscribe/actions/AddNewEventsAction';
import ChainsConfig from '../../config/chains_config.json';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * Rescan service
 */
export class RescanService {
  private readonly logger = new Logger();

  constructor(private readonly addNewEventsAction: AddNewEventsAction) {}

  /**
   * Rescan
   * @param chainId
   * @param fromBlock
   * @param toBlock
   */
  rescan(chainId: number, fromBlock: number, toBlock: number) {
    const chainDetail = ChainsConfig.find(item => {
      return item.chainId === chainId;
    });

    if (toBlock - fromBlock >= chainDetail.maxBlockRange) {
      const e = new HttpException('Out of range', HttpStatus.METHOD_NOT_ALLOWED);
      this.logger.error(e);
      throw e;
    }
    return this.addNewEventsAction.process(chainId, fromBlock, toBlock);
  }
}

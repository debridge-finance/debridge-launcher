import { AddNewEventsAction } from '../../subscribe/actions/AddNewEventsAction';
import ChainsConfig from '../../config/chains_config.json';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Rescan service
 */
export class RescanService {
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
      throw new HttpException('Out of range', HttpStatus.METHOD_NOT_ALLOWED);
    }
    return this.addNewEventsAction.process(chainId, fromBlock, toBlock);
  }
}

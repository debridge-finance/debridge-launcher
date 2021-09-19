import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

@Injectable()
export abstract class ChainlinkService {
  abstract getChainlinkCookies(eiChainlinkUrl: string, network: string): Promise<string>;

  abstract getChainlinkRun(eiChainlinkUrl: string, runId: string, cookie: string): Promise<Required<any | 'status'>>;

  abstract postChainlinkRun(jobId: string, data: string, eiChainlinkUrl: string, eiIcAccessKey: string, eiIcSecret: string): Promise<string>;

  abstract postBulkChainlinkRun(
    jobId: string,
    data: string[],
    eiChainlinkUrl: string,
    eiIcAccessKey: string,
    eiIcSecret: string,
    web3: Web3,
  ): Promise<string>;
}

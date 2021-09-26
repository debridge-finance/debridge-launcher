import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ChainlinkService } from './ChainlinkService';

@Injectable()
export class ChainlinkServiceMock extends ChainlinkService {
  private readonly logger = new Logger(ChainlinkServiceMock.name);

  private readonly emailAddress: string;
  private readonly password: string;

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    super();
    this.logger.verbose(`ChainlinkServiceMock is initialized`);
    this.emailAddress = this.configService.get('CHAINLINK_EMAIL');
    this.password = this.configService.get('CHAINLINK_PASSWORD');
  }

  /* set chainlink cookies */
  async getChainlinkCookies(eiChainlinkUrl: string, network: string): Promise<string> {
    const res = {
      explorer: '%7B%22status%22%3A%22disconnected%22%2C%22url%22%3A%22%22%7D',
      SameSite: 'Strict',
      clsession:
        '=MTYzMTMwMjA0MHxEdi1CQkFFQ180SUFBUkFCRUFBQVJ2LUNBQUVHYzNSeWFXNW5EQTRBREdOc2MyVnpjMmx2Ymw5cFpBWnpkSEpwYm1jTUlnQWdZekUzWVRVek1XVmpOR1poTkRCaE5qbGpOVFUyTWprM09UQTNPRGt3TkdJPXylxa9CklljXYRvTgBXd7J0evJLB2vfcT-uk6kxFpoNgw==',
      Expires: 'Sun, 10 Oct 2021 19:27:20 GMT',
      'Max-Age': 2592000,
    };

    return JSON.stringify(res);
  }

  /* set chainlink cookies */
  async getChainlinkRun(eiChainlinkUrl: string, runId: string, cookie: string) {
    return {
      status: 'completed',
    };
  }

  /* post chainlink run */
  async postChainlinkRun(jobId: string, data: any, eiChainlinkUrl: string, eiIcAccessKey: string, eiIcSecret: string) {
    return '5e9ea5d1-f09b-42bb-89f3-08e64fc79694';
  }

  async postBulkChainlinkRun(jobId: string, data: string[], eiChainlinkUrl: string, eiIcAccessKey: string, eiIcSecret: string): Promise<string> {
    return '5e9ea5d1-f09b-42bb-89f3-08e64fc79694';
  }
}

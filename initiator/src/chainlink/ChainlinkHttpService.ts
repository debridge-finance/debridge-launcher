import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as credentials from '../config/credantial.json';
import { ChainlinkService } from './ChainlinkService';

@Injectable()
export class ChainlinkHttpService extends ChainlinkService {
  private readonly logger = new Logger(ChainlinkHttpService.name);

  private readonly emailAddress: string;
  private readonly password: string;

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    super();
    this.logger.verbose(`ChainlinkHttpService is initialized`);
    this.emailAddress = this.configService.get('CHAINLINK_EMAIL');
    this.password = this.configService.get('CHAINLINK_PASSWORD');
  }

  /* set chainlink cookies */
  async getChainlinkCookies(
    eiChainlinkUrl: string,
    network: string,
  ): Promise<string> {
    const sessionUrl = '/sessions';
    const headers = {
      'content-type': 'application/json',
    };
    let body = { email: this.emailAddress, password: this.password };

    // get for the specific node if found
    const chainlinkCredentials = credentials[network];
    if (chainlinkCredentials !== undefined) {
      body = chainlinkCredentials;
      this.logger.verbose(`override base chainlinkCredentials: ${body.email}`);
    }

    const response = await this.httpService
      .post(eiChainlinkUrl + sessionUrl, body, {
        headers,
      })
      .toPromise();
    /*.post(, body, {

      });*/
    const cookies = response.headers['set-cookie'];
    this.logger.log(cookies);
    return JSON.stringify(cookies);
  }

  /* set chainlink cookies */
  async getChainlinkRun(eiChainlinkUrl: string, runId: string, cookie: string) {
    const getRunUrl = '/v2/runs/' + runId;
    const headers = {
      'content-type': 'application/json',
      Cookie: JSON.parse(cookie),
    };

    try {
      const response = await this.httpService
        .get(eiChainlinkUrl + getRunUrl, {
          headers,
        })
        .toPromise();

      this.logger.verbose(response.data.data);
      return response.data.data.attributes;
    } catch (e) {
      this.logger.error(e);
    }
  }

  /* post chainlink run */
  async postChainlinkRun(
    jobId: string,
    data: any,
    eiChainlinkUrl: string,
    eiIcAccessKey: string,
    eiIcSecret: string,
  ) {
    const postJobUrl = '/v2/specs/' + jobId + '/runs';
    const headers = {
      'content-type': 'application/json',
      'X-Chainlink-EA-AccessKey': eiIcAccessKey,
      'X-Chainlink-EA-Secret': eiIcSecret,
    };
    this.logger.verbose('postChainlinkRun', data);
    const body = { result: data };

    const response = await this.httpService
      .post(eiChainlinkUrl + postJobUrl, body, {
        headers,
      })
      .toPromise();
    this.logger.verbose('postChainlinkRun response', response.data.data);
    return response.data.data.id;
  }
}

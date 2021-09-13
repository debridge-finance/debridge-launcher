import axios from 'axios';
import { ChainlinkConfig, ChainlinkEnv } from '~/interfaces/chainlink.interface';
import { Logger } from '~/interfaces/logger.interface';

// TODO fetch all external configs in `config` module
import credentials from '~/config/credentials.json';

class Chainlink {
  private config: ChainlinkConfig;
  private log: Logger;

  constructor({ config, logger }: ChainlinkEnv) {
    this.config = config;
    this.log = logger;
  }

  /* set chainlink cookies */
  async getChainlinkCookies(eiChainlinkUrl: string, network: string): Promise<string> {
    const sessionUrl = '/sessions';
    const headers = {
      'content-type': 'application/json',
    };
    let body = this.config.credentials;

    // get for the specific node if found
    const chainlinkCredentials = credentials[network];
    if (chainlinkCredentials !== undefined) {
      body = chainlinkCredentials;
      this.log.debug(`override base chainlinkCredentials: ${body.email}`);
    }

    const response = await axios.post(eiChainlinkUrl + sessionUrl, body, {
      headers,
    });
    const cookies = response.headers['set-cookie'];
    this.log.debug(cookies);
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
      const response = await axios.get(eiChainlinkUrl + getRunUrl, {
        headers,
      });

      this.log.debug(response.data.data);
      return response.data.data.attributes;
    } catch (e) {
      this.log.error(e);
    }
  }

  /* post chainlink run */
  async postChainlinkRun(jobId: string, data: any, eiChainlinkUrl: string, eiIcAccessKey: string, eiIcSecret: string) {
    const postJobUrl = '/v2/specs/' + jobId + '/runs';
    const headers = {
      'content-type': 'application/json',
      'X-Chainlink-EA-AccessKey': eiIcAccessKey,
      'X-Chainlink-EA-Secret': eiIcSecret,
    };
    this.log.debug('postChainlinkRun', data);
    const body = { result: data };

    const response = await axios.post(eiChainlinkUrl + postJobUrl, body, {
      headers,
    });
    this.log.debug('postChainlinkRun response', response.data.data);
    return response.data.data.id;
  }
}

export { Chainlink };

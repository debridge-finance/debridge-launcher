import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

@Injectable()
export class Web3Service {
  constructor() {}

  web3HttpProvider(url: string) {
    return new Web3(
      new Web3.providers.HttpProvider(url, {
        timeout: 30000,
      }),
    );
  }
}

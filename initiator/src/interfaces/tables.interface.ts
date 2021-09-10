export interface SupportedChain {
  chainId: number;
  network: string;
  debridgeAddr: string;
  latestBlock: number;
  provider: string;
  interval: number;
}

export interface ChainlinkConfig {
  chainId: number;
  cookie: string;
  eiChainlinkUrl: string;
  eiIcAccesskey: string;
  eiIcSecret: string;
  eiCiAccesskey: string;
  eiCiSecret: string;
  mintJobId: string;
  burntJobId: string;
  network: string;
}

export interface Submissions {
  submissionId: string;
  txHash: string;
  runId: string;
  chainFrom: number;
  chainTo: number;
  debridgeId: string;
  receiverAddr: string;
  amount: string;
  status: number;
}

export interface AggregatorChains {
  chainTo: number;
  aggregatorChain: number;
}

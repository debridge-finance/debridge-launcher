import { ChainlinkServiceMock } from './ChainlinkServiceMock';
import { ChainlinkHttpService } from './ChainlinkHttpService';

export function chainlinkFactory() {
  const mode = process.env.MODE;
  if (mode === 'dev') {
    return ChainlinkServiceMock;
  }
  return ChainlinkHttpService;
}

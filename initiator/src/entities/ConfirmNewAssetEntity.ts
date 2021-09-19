import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

// contract info
// function getDeployId(
//   bytes32 _debridgeId,
//   string memory _name,
//   string memory _symbol,
//   uint8 _decimals
// ) public pure returns (bytes32) {
//   return keccak256(abi.encodePacked(_debridgeId, _name, _symbol, _decimals));
// }

// Process new transfer
// we check for existance ConfirmNewAssetEntity where id = abi.encodePacked(debridgeId, chainTo)
// if not exist create ConfirmNewAssetEntity
// {
//   id: abi.encodePacked(debridgeId, chainTo),
//   chainFrom: chainIdFrom,
//   chainTo: e.chainIdTo,
//   debridgeId: e.debridgeId,
//   status: SubmisionStatusEnum.new,
// }

// Add service that will get all confirmNewAssets with satus new
// then process for each
// call getDebridge method from debridgeGateContract (we need to find rpc settins from chains_config where chainId = item.chainFrom)
// then find name, symbol, decimals in the same rpc settings
// calculate deployId =  keccak256(abi.encodePacked(_debridgeId, _name, _symbol, _decimals));

// find deployId = keccak256(web3.eth.abi.encodeParameters(
//  ['bytes','uint256', 'string', 'string', 'uint8'],
//  [_tokenAddress, _chainId, _name, _symbol, _decimals]));
//

// create new chainlink job with arguments
// bytes _tokenAddress, uint256 _chainId, string _name, string _symbol, uint8 _decimals, bytes deployId

//After update _tokenAddress, _name, _symbol, _decimals, runId, Status set in created

@Entity('confirmNewAssets')
@Unique(['deployId'])
export class ConfirmNewAssetEntity {
  //id = abi.encodePacked(debridgeId, chainTo)
  @PrimaryColumn()
  Id: string;

  @Column()
  deployId: string;

  @Column()
  runId: string;

  @Column()
  tokenAddress: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column()
  decimals: string;

  @Column()
  chainFrom: number;

  @Column()
  chainTo: number;

  @Column()
  debridgeId: string;

  @Column()
  status: number;
}

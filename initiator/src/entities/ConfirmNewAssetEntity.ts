import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('confirmNewAssets')
@Unique(['deployId'])
export class ConfirmNewAssetEntity {
  @PrimaryColumn()
  debridgeId: string;

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
  status: number;
}

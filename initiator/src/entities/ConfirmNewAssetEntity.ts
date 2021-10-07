import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('confirmNewAssets')
@Unique(['deployId'])
export class ConfirmNewAssetEntity {
  @PrimaryColumn()
  debridgeId: string;

  //@TODO yaro
  @Column({
    nullable: true,
  })
  deployId: string;

  @Column({
    nullable: true,
  })
  tokenAddress: string;

  @Column({
    nullable: true,
  })
  name: string;

  @Column({
    nullable: true,
  })
  symbol: string;

  @Column({
    nullable: true,
  })
  decimals: string;

  @Column({
    nullable: true,
  })
  chainFrom: number;

  @Column({
    nullable: true,
  })
  chainTo: number;

  @Column({
      nullable: true,
  })
  signature: string;

  @Column({
      nullable: true,
  })
  ipfsLogHash: string;

  @Column({
      nullable: true,
  })
  ipfsKeyHash: string;

  @Column({
    nullable: true,
  })
  status: number;
}

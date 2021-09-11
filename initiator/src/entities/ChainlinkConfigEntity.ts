import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('chainlink_configs')
@Unique(['chainId'])
export class ChainlinkConfigEntity {
  @PrimaryColumn()
  chainId: number;

  @Column()
  cookie: string;

  @Column()
  eiChainlinkUrl: string;

  @Column()
  eiIcAccesskey: string;

  @Column()
  eiIcSecret: string;

  @Column()
  eiCiAccesskey: string;

  @Column()
  eiCiSecret: string;

  @Column()
  mintJobId: string;

  @Column()
  burntJobId: string;

  @Column()
  network: string;
}

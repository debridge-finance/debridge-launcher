import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('duplicate_nonces')
export class DuplicateNonceEntity {
  @PrimaryColumn()
  nonce: string;

  @PrimaryColumn()
  chainFrom: number;

  @Column()
  resolved: boolean;
}

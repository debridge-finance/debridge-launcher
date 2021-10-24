import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('locks')
@Unique(['action'])
export class LockEntity {
  @PrimaryColumn()
  action: string;

  @Column()
  date: Date;
}

import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { AggregatorChainsEntity, ChainlinkPersistentConfigEntity, SubmissionsEntity, SupportedChainEntity } from '@entity/tables.entity';

export class init1631045096468 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection;
    await queryRunner.createTable(Table.create(connection.getMetadata(SupportedChainEntity), connection.driver));
    await queryRunner.createTable(Table.create(connection.getMetadata(AggregatorChainsEntity), connection.driver));
    await queryRunner.createTable(Table.create(connection.getMetadata(ChainlinkPersistentConfigEntity), connection.driver));
    await queryRunner.createTable(Table.create(connection.getMetadata(SubmissionsEntity), connection.driver));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('supported_chains');
    await queryRunner.dropTable('chainlink_config');
    await queryRunner.dropTable('submissions');
    await queryRunner.dropTable('aggregator_chains');
  }
}

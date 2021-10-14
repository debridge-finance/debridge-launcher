import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { OrbitDbService } from '../../services/OrbitDbService';
import Web3 from 'web3';
import keystore from 'keystore.json';
import { Account } from 'web3-core';

//Simple action that sign submissionId and save signatures to DB
@Injectable()
export class SignAction extends IAction {
  private web3: Web3;
  private account: Account;

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
  ) {
    super();
    this.logger = new Logger(SignAction.name);
    this.web3 = new Web3();
    this.account = this.web3.eth.accounts.decrypt(keystore, process.env.KEYSTORE_PASSWORD);
  }

  async process(): Promise<void> {
    this.logger.log(`process SignAction`);

    //TODO: check is supported chainIdTo
    const submissions = await this.submissionsRepository.find({
      status: SubmisionStatusEnum.NEW,
    });

    for (const submission of submissions) {
      const signature = this.account.sign(submission.submissionId).signature;
      this.logger.log(`signed  ${submission.submissionId} ${signature}`);
      await this.submissionsRepository.update(
        {
          submissionId: submission.submissionId,
        },
        {
          signature: signature,
          status: SubmisionStatusEnum.SIGNED
        },
      );
    }

    // signed in  CheckAssetsEventAction
    // const assetsForConfim = await this.confirmNewAssetEntityRepository.find({
    //   status: SubmisionStatusEnum.NEW,
    // });

    // for (const asset of assetsForConfim) {
    //   const signature = this.account.sign(asset.deployId).signature;
    //   this.logger.log(`signed deploy ${asset.deployId} ${signature}`);
    //   await this.confirmNewAssetEntityRepository.update(
    //     {
    //       deployId: asset.deployId,
    //     },
    //     {
    //       signature: signature,
    //       status: SubmisionStatusEnum.SIGNED
    //     },
    //   );
    // }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import Web3 from 'web3';

@Injectable()
export class CheckNewEvensAction implements IAction {
  private readonly logger = new Logger(CheckNewEvensAction.name);

  private readonly minConfirmations: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
  ) {
    this.minConfirmations = this.configService.get<number>('MIN_CONFIRMATIONS');
  }

  async action(): Promise<void> {
    this.logger.log(`Check new events`);
    const supportedChainList = await this.supportedChainRepository.find();

    //TODO: check is supported chainIdTo
    const submissions = await this.submissionsRepository.find({
      status: SubmisionStatusEnum.NEW,
    });

    // for (const chain of supportedChainList) {
    //   const chainId = chain.chainId;

    //   const submissionIds = (
    //     await this.submissionsRepository.find({
    //       status: SubmisionStatusEnum.NEW,
    //       chainTo: chainId,
    //     })
    //   ).map(submission => submission.submissionId);

    //   if (submissionIds.length === 0) {
    //     this.logger.debug(`submissionIds.length ${submissionIds.length}`);
    //     return;
    //   }
    //   let runId: string;

    const web3 = new Web3();
    for (const submission of submissions) {
      const signature = (await web3.eth.accounts.sign(submission.submissionId, process.env.SIGNATURE_PRIVATE_KEY)).signature;
      const hash = ""; //TODO: save to IPFS hash   let hash = await db.add(value);
      this.logger.debug(`signed  ${submission.submissionId} {signature}`);
      await this.submissionsRepository.update(
        {
          submissionId: submission.submissionId,
        },
        {
          signature: signature,
          status: SubmisionStatusEnum.SIGNED,
          ipfsLogHash: hash,
        },
      );
    }

      //TODO: sign and  save to orbit db

      // if (runId) {
      //   const { affected } = await this.submissionsRepository.update(
      //     {
      //       submissionId: In(submissionIds),
      //     },
      //     {
      //       status: SubmisionStatusEnum.CREATED,
      //       runId,
      //     },
      //   );

        // this.logger.debug(`${affected} submissions is updated`);

        //await this.updateConfirmAssets(submissionIds, runId);
      // }
    // }
  }

  // private async updateConfirmAssets(submissionIds: string[], runId) {
  //   this.logger.debug(`Start updating confirm assets ${submissionIds} ${runId}`);
  //   const debridgeIds = (
  //     await this.submissionsRepository.find({
  //       submissionId: In(submissionIds),
  //     })
  //   ).map(item => item.debridgeId);

  //   const { affected } = await this.confirmNewAssetEntityRepository.update(
  //     {
  //       debridgeId: In(debridgeIds),
  //     },
  //     {
  //       status: SubmisionStatusEnum.CREATED,
  //       runId,
  //     },
  //   );
  //   this.logger.debug(`Finish updating (${affected}) confirm assets ${submissionIds} ${runId}`);
  // }
}

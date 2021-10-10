import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { OrbitDbService } from 'src/services/orbitDbService';
import Web3 from 'web3';

@Injectable()
export class CheckNewEvensAction extends IAction<void> {
  private readonly minConfirmations: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly orbitDbService: OrbitDbService,
  ) {
    super();
    this.logger = new Logger(CheckNewEvensAction.name);
    this.minConfirmations = this.configService.get<number>('MIN_CONFIRMATIONS');
  }

  async process(): Promise<void> {
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
      const [logHash, doscHash] = await this.orbitDbService.addSignedSubmission(submission.submissionId, signature,
        {
          txHash: submission.txHash,
          submissionId: submission.submissionId,
          chainFrom: submission.chainFrom,
          chainTo: submission.chainTo,
          debridgeId: submission.debridgeId,
          receiverAddr: submission.receiverAddr,
          amount: submission.amount
        });
      this.logger.log(`signed  ${submission.submissionId} ${signature}`);
      await this.submissionsRepository.update(
        {
          submissionId: submission.submissionId,
        },
        {
          signature: signature,
          status: SubmisionStatusEnum.SIGNED,
          ipfsLogHash: logHash,
          ipfsKeyHash: doscHash
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

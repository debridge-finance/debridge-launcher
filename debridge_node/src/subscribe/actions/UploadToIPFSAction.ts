import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { OrbitDbService } from '../../services/OrbitDbService';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';

@Injectable()
export class UploadToIPFSAction extends IAction {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly orbitDbService: OrbitDbService,
  ) {
    super();
    this.logger = new Logger(UploadToIPFSAction.name);
  }

  async process(): Promise<void> {
    this.logger.log(`process UploadToIPFSAction`);

    const submissions = await this.submissionsRepository.find({
      status: SubmisionStatusEnum.SIGNED,
      ipfsStatus: UploadStatusEnum.NEW,
    });

    for (const submission of submissions) {
      const hash = await this.orbitDbService.addSignedSubmission(submission.submissionId, submission.signature, {
        txHash: submission.txHash,
        submissionId: submission.submissionId,
        chainFrom: submission.chainFrom,
        chainTo: submission.chainTo,
        debridgeId: submission.debridgeId,
        receiverAddr: submission.receiverAddr,
        amount: submission.amount,
        eventRaw: submission.rawEvent,
      });
      this.logger.log(`uploaded ${submission.submissionId} hash: ${hash}`);
      await this.submissionsRepository.update(
        {
          submissionId: submission.submissionId,
        },
        {
          ipfsStatus: UploadStatusEnum.UPLOADED,
          ipfsHash: hash,
        },
      );
    }

    //Process Assets
    const assets = await this.confirmNewAssetEntityRepository.find({
      status: SubmisionStatusEnum.SIGNED,
      ipfsStatus: UploadStatusEnum.NEW,
    });

    for (const asset of assets) {
      const hash = await this.orbitDbService.addConfirmNewAssets(asset.deployId, asset.signature, {
        debridgeId: asset.debridgeId,
        deployId: asset.deployId,
        nativeChainId: asset.nativeChainId,
        tokenAddress: asset.tokenAddress,
        name: asset.name,
        symbol: asset.symbol,
        decimals: asset.decimals,
        submissionTxHash: asset.submissionTxHash,
        submissionChainFrom: asset.submissionChainFrom,
        submissionChainTo: asset.submissionChainTo,
      });

      this.logger.log(`uploaded deployId ${asset.deployId} ipfsHash: ${hash}`);
      await this.confirmNewAssetEntityRepository.update(
        {
          deployId: asset.deployId,
        },
        {
          ipfsStatus: UploadStatusEnum.UPLOADED,
          ipfsHash: hash,
        },
      );
    }
  }
}

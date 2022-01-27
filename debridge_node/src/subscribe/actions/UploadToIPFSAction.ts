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
      await this.orbitDbService.addSignedSubmission(
        submission.submissionId,
        submission.signature,
        submission.debridgeId,
        submission.txHash,
        submission.chainFrom,
        submission.chainTo,
        submission.amount,
        submission.receiverAddr,
      );
      this.logger.log(`uploaded ${submission.submissionId} ipfsLogHash`);
    }

    //Process Assets
    const assets = await this.confirmNewAssetEntityRepository.find({
      status: SubmisionStatusEnum.SIGNED,
      ipfsStatus: UploadStatusEnum.NEW,
    });

    for (const asset of assets) {
      const hash = await this.orbitDbService.addConfirmNewAssets(
        asset.deployId,
        asset.signature,
        asset.tokenAddress,
        asset.name,
        asset.symbol,
        asset.nativeChainId,
        asset.decimals,
      );

      this.logger.log(`uploaded deployId ${asset.deployId} ipfsLogHash: ${hash}`);
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

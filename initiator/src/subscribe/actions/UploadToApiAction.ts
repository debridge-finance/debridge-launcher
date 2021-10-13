import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';

//Action that update signatures to debridge API
@Injectable()
export class UploadToApiAction extends IAction {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly debridgeApiService: DebrdigeApiService,
  ) {
    super();
    this.logger = new Logger(UploadToApiAction.name);
  }

  async process(): Promise<void> {
    this.logger.log(`process UploadToApiAction`);

    const submissions = await this.submissionsRepository.find({
      status: SubmisionStatusEnum.SIGNED,
      apiStatus: UploadStatusEnum.NEW,
    });

    if (submissions.length > 0) {
      const resultSubmissionConfirmation = await this.debridgeApiService.uploadToApi(submissions);
      // Confirm only accepted records by api
      for (const submission of resultSubmissionConfirmation) {
        this.logger.log(`uploaded to debridgeAPI submissionId: ${submission.submissionId} externalId: ${submission.id}`);
        await this.submissionsRepository.update(
          {
            submissionId: submission.submissionId,
          },
          {
            apiStatus: UploadStatusEnum.UPLOADED,
            externalId: submission.id,
          },
        );
      }
    }
    //TODO: YARO
    /*
    //Process Assets
    const assets = await this.confirmNewAssetEntityRepository.find({
      status: SubmisionStatusEnum.SIGNED,
      ipfsStatus: UploadStatusEnum.NEW
    });

    for (const asset of assets) {
      const externalId = '';
      this.logger.log(`uploaded deployId to debridgeAPI ${asset.deployId} ${externalId}`);
      await this.confirmNewAssetEntityRepository.update(
        {
          deployId: asset.deployId,
        },
        {
          apiStatus: UploadStatusEnum.UPLOADED,
          externalId: externalId,
        },
      );
    }*/
  }
}

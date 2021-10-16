import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import * as Sentry from '@sentry/minimal';

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

  private readonly PAGE_SIZE = 100;

  private static paginate(array: any, pageSize: number, pageNumber: number) {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  }

  private async confirmSubmissions(submissions: SubmissionEntity[]) {
    try {
      const resultSubmissionConfirmation = await this.debridgeApiService.uploadToApi(submissions);
      // Confirm only accepted records by api
      for (const submission of resultSubmissionConfirmation) {
        this.logger.log(`uploaded to debridgeAPI submissionId: ${submission.submissionId} externalId: ${submission.registrationId}`);
        await this.submissionsRepository.update(
          {
            submissionId: submission.submissionId,
          },
          {
            apiStatus: UploadStatusEnum.UPLOADED,
            externalId: submission.registrationId,
          },
        );
      }
    } catch (e) {
      this.logger.error(e);
      Sentry.captureException(e);
    }
  }

  private async confirmAssets(assets: ConfirmNewAssetEntity[]) {
    for (const asset of assets) {
      try {
        const result = await this.debridgeApiService.uploadConfirmNewAssetsToApi(asset);
        this.logger.log(`uploaded deployId to debridgeAPI deployId: ${result.deployId} externalId: ${result.registrationId}`);
        await this.confirmNewAssetEntityRepository.update(
          {
            deployId: asset.deployId,
          },
          {
            apiStatus: UploadStatusEnum.UPLOADED,
            externalId: result.registrationId,
          },
        );
      } catch (e) {
        this.logger.error(e);
        Sentry.captureException(e);
      }
    }
  }

  async process(): Promise<void> {
    this.logger.log(`process UploadToApiAction`);

    try {
      const submissions = await this.submissionsRepository.find({
        status: SubmisionStatusEnum.SIGNED,
        apiStatus: UploadStatusEnum.NEW,
      });

      if (submissions.length > 0) {
        const size = Math.ceil(submissions.length / this.PAGE_SIZE);
        for (let part = 1; part <= size; part++) {
          await this.confirmSubmissions(UploadToApiAction.paginate(submissions, this.PAGE_SIZE, part));
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      this.logger.error(e);
    }

    try {
      //Process Assets
      const assets = await this.confirmNewAssetEntityRepository.find({
        status: SubmisionStatusEnum.SIGNED,
        apiStatus: UploadStatusEnum.NEW,
      });

      if (assets.length > 0) {
        const size = Math.ceil(assets.length / this.PAGE_SIZE);
        for (let part = 1; part <= size; part++) {
          await this.confirmAssets(UploadToApiAction.paginate(assets, this.PAGE_SIZE, part));
        }
      }
    } catch (e) {
      this.logger.error(e);
      Sentry.captureException(e);
    }
  }
}

import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';

@Injectable()
export class CheckAssetsEventAction implements IAction {
  private readonly logger = new Logger(CheckAssetsEventAction.name);

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
  ) {}

  async action() {
    this.logger.log(`Check assets event`);
    const submissions = await this.submissionsRepository.find({
      assetsStatus: SubmisionAssetsStatusEnum.NEW,
    });

    const newSubmitionIds = [];
    const assetsWasCreatedSubmitions = [];

    for (const submission of submissions) {
      if (!submission.debridgeId) {
        continue;
      }
      const confirmNewAction = await this.confirmNewAssetEntityRepository.findOne({
        debridgeId: submission.debridgeId,
      });
      if (!confirmNewAction) {
        newSubmitionIds.push(submission.submissionId);
        await this.confirmNewAssetEntityRepository.save({
          debridgeId: submission.debridgeId,
          chainFrom: submission.chainFrom,
          chainTo: submission.chainTo,
          status: SubmisionStatusEnum.NEW,
        });
      } else {
        assetsWasCreatedSubmitions.push(submission.submissionId);
      }
    }

    if (newSubmitionIds.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(newSubmitionIds),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_CREATED,
        },
      );
    }
    if (assetsWasCreatedSubmitions.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(assetsWasCreatedSubmitions),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_ALREADY_CREATED,
        },
      );
    }
    this.logger.log(`Finish Check assets event`);
  }
}

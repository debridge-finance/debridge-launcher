import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';

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
      status: SubmisionStatusEnum.ASSETS,
    });

    const newSubmitions = [];
    const assetsSubmitions = [];

    for (const submission of submissions) {
      const confirmNewAction = await this.confirmNewAssetEntityRepository.findOne({
        debridgeId: submission.debridgeId,
      });
      if (!confirmNewAction) {
        newSubmitions.push(submission.submissionId);
        await this.confirmNewAssetEntityRepository.save({
          debridgeId: submission.debridgeId,
          chainFrom: submission.chainFrom,
          chainTo: submission.chainTo,
          status: SubmisionStatusEnum.NEW,
        });
      } else {
        assetsSubmitions.push(submission.submissionId);
      }
    }

    await this.submissionsRepository.update(
      {
        submissionId: In(newSubmitions),
      },
      {
        status: SubmisionStatusEnum.NEW,
      },
    );

    await this.submissionsRepository.update(
      {
        submissionId: In(assetsSubmitions),
      },
      {
        status: SubmisionStatusEnum.ASSETS_CREATE,
      },
    );

    this.logger.log(`Finish Check assets event`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { OrbitDbService } from '../../services/OrbitDbService';
import { IAction } from './IAction';

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
    const pageSize = this.orbitDbService.getBatchSize();
    const size = Math.ceil(submissions.length / pageSize);
    this.logger.log(`process UploadToIPFSAction; pageSize: ${pageSize}`);
    this.logger.log(`process UploadToIPFSAction; size: ${size}`);
    for (let pageNumber = 0; pageNumber < size; pageNumber++) {
      const skip = pageNumber * pageSize;
      const end = Math.min((pageNumber + 1) * pageSize, submissions.length);
      const { hash, submissionIds } = await this.orbitDbService.addHashSubmissions(submissions.slice(skip, end));
      this.logger.log(`process UploadToIPFSAction; submissionIds.length: ${submissionIds.length}`);

      await this.submissionsRepository.update(
        {
          submissionId: In(submissionIds),
        },
        {
          ipfsStatus: UploadStatusEnum.UPLOADED,
          ipfsHash: hash,
        },
      );
      this.logger.log(`uploaded submissionIds to the orbitdb:${JSON.stringify(submissionIds)}`);
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

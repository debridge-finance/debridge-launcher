import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Not } from 'typeorm';

import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionBalanceStatusEnum } from '../../enums/SubmisionBalanceStatusEnum';
import { ChainConfigService } from '../../services/ChainConfigService';
import { ChainScanningService } from '../../services/ChainScanningService';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { ValidationBalanceService } from '../../services/ValidationBalanceService';
import { IAction } from './IAction';

@Injectable()
export class ValidationBalanceAction extends IAction {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly chainScanningService: ChainScanningService,
    private readonly validationBalanceService: ValidationBalanceService,
    private readonly debridgeApiService: DebrdigeApiService,
    private readonly chainConfigService: ChainConfigService,
  ) {
    super();
    this.logger = new Logger(ValidationBalanceAction.name);
  }

  async process(): Promise<void> {
    // TODO: probably we need to add limit here. to do it u need to use createQueryBuilder
    const submissions = await this.entityManager.find(SubmissionEntity, {
      where: [{ balanceStatus: In([SubmisionBalanceStatusEnum.RECIEVED, SubmisionBalanceStatusEnum.ON_HOLD]), blockTimestamp: Not(IsNull()) }],
      order: {
        blockTimestamp: 'ASC',
        nonce: 'ASC',
      },
      take: 100,
    });
    const configs = this.chainConfigService.getConfig();
    const firstMonitoringBlockConfigs = new Map<number, number>();

    configs.map(c => {
      firstMonitoringBlockConfigs.set(c.chainId, c.firstMonitoringBlock);
    });
    for (const submission of submissions) {
      await this.entityManager.transaction(async transactionManager => {
        const status = await this.validationBalanceService.calculate(transactionManager, submission, firstMonitoringBlockConfigs);
        if (status === SubmisionBalanceStatusEnum.ERROR) {
          const sendEvent = JSON.parse(submission.rawEvent);
          const errMsg = `incorrect balance: submissionId: ${submission.submissionId}; sendEventAmount: ${sendEvent.returnValues.amount}; sendEventExecutionFeeParams: ${submission.executionFee};`;
          this.logger.error(errMsg);
          await this.debridgeApiService.notifyError(errMsg);
          this.chainScanningService.pause(submission.chainFrom);
          throw new Error(`failed to proccess submission ${submission.submissionId}`);
        }
        submission.balanceStatus = status;
        await transactionManager.save(submission);
      });
    }
    return Promise.resolve(undefined);
  }
}

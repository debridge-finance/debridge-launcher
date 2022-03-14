import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

import { MonitoringSentEventEntity } from '../../entities/MonitoringSentEventEntity';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionBalanceStatusEnum } from '../../enums/SubmisionBalanceStatusEnum';
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
  ) {
    super();
    this.logger = new Logger(ValidationBalanceAction.name);
  }

  async process(): Promise<void> {
    // TODO: probably we need to add limit here. to do it u need to use createQueryBuilder
    const submissions = await this.entityManager.find(SubmissionEntity, {
      balanceStatus: In([SubmisionBalanceStatusEnum.RECIEVED, SubmisionBalanceStatusEnum.ON_HOLD]),
    });
    for (const submission of submissions) {
      const monitoringSentEvent = await this.entityManager.findOne(MonitoringSentEventEntity, {
        submissionId: submission.submissionId,
        nonce: submission.nonce,
      });
      if (!monitoringSentEvent) {
        break;
      }
      await this.entityManager.transaction(async transactionManager => {
        const status = await this.validationBalanceService.calculate(transactionManager, submission, monitoringSentEvent);
        if (status === SubmisionBalanceStatusEnum.ERROR) {
          // TODO: nontify about error to debridgeApiService
          const sendEvent = JSON.parse(submission.rawEvent);

          await this.debridgeApiService.notifyError(
            `incorrect balance: submissionId: ${submission.submissionId}; sendEventAmount: ${sendEvent.returnValues.amount}, sendEventAmountFeeParams:${sendEvent.returnValues.feeParams}; monitoringEventLockedOrMinted: ${monitoringSentEvent.lockedOrMintedAmount}; monitoringEventTotalSupply: ${monitoringSentEvent.totalSupply};`,
          );
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

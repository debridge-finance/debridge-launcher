import { Injectable, Logger } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { EntityManager } from 'typeorm';

import { MonitoringSentEventEntity } from '../entities/MonitoringSentEventEntity';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import { TokenBalanceHistory } from '../entities/TokenBalanceHistory';
import { SubmisionBalanceStatusEnum } from '../enums/SubmisionBalanceStatusEnum';

export class NewBalances {
  sender: BigNumber;
  reciever: BigNumber;
  status: SubmisionBalanceStatusEnum;
  constructor(status?: SubmisionBalanceStatusEnum) {
    if (status) {
      this.status = status;
    }
  }
}

@Injectable()
export class ValidationBalanceService {
  private readonly logger = new Logger(ValidationBalanceService.name);
  async calculate(
    manager: EntityManager,
    submission: SubmissionEntity,
    firstMonitoringBlockConfigs: Map<number, number>,
  ): Promise<SubmisionBalanceStatusEnum> {
    let newBalances = new NewBalances(SubmisionBalanceStatusEnum.ERROR);
    try {
      const { amount, executionFee, rawEvent, chainFrom, chainTo, debridgeId, blockTimestamp } = submission;
      const D = this.calculateDelta(amount, executionFee);

      const balanceSender = await this.getBalance(manager, chainFrom, debridgeId);
      const balanceReceiver = await this.getBalance(manager, chainTo, debridgeId);

      const sendEvent = JSON.parse(rawEvent);

      // For events which happend before monitoring events were implemented, we just need to calculate new balances without comparing with monitoringEvent.lockedOrMintedAmount
      if (submission.blockNumber < firstMonitoringBlockConfigs.get(submission.chainFrom)) {
        newBalances = this.calculateNewBalancesWithoutValidation(
          sendEvent.event,
          balanceSender.amount,
          balanceReceiver.amount,
          D,
          chainFrom,
          chainTo,
        );
      } else {
        const monitoringEvent = await manager.findOne(MonitoringSentEventEntity, {
          submissionId: submission.submissionId,
          nonce: submission.nonce,
        });
        if (!monitoringEvent) {
          return SubmisionBalanceStatusEnum.ON_HOLD;
        }
        newBalances = this.calculateNewBalances(
          sendEvent.event,
          balanceSender.amount,
          balanceReceiver.amount,
          D,
          chainFrom,
          chainTo,
          monitoringEvent,
        );
      }

      if (newBalances.status === SubmisionBalanceStatusEnum.CHECKED) {
        await this.setBalance(manager, chainFrom, debridgeId, blockTimestamp, newBalances.sender);
        await this.setBalance(manager, chainTo, debridgeId, blockTimestamp, newBalances.reciever);
      } else if (newBalances.status === SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION) {
        const isAllChainsSynced = await this.isAllChainsSynced(manager, blockTimestamp);
        if (isAllChainsSynced) {
          throw new Error('all chains already synced');
        }
        newBalances.status = SubmisionBalanceStatusEnum.ON_HOLD;
      }
    } catch (e) {
      this.logger.error(`failed to validate balance for submission: ${submission.submissionId}; err: ${e.message}`);
      newBalances.status = SubmisionBalanceStatusEnum.ERROR;
    }
    return newBalances.status;
  }

  calculateDelta(eventAmount: string, eventExectutionFee: string): BigNumber {
    const amount = new BigNumber(eventAmount);
    const fee = new BigNumber(eventExectutionFee);

    return amount.plus(fee);
  }

  calculateNewBalances(
    eventType: string,
    balanceSender: string,
    balanceReciever: string,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
    monitoringEvent: MonitoringSentEventEntity,
  ): NewBalances {
    let newBalances = new NewBalances();
    const senderAmount = new BigNumber(balanceSender);
    const recieverAmount = new BigNumber(balanceReciever);
    const lockedOrMintedAmount = new BigNumber(monitoringEvent.lockedOrMintedAmount);
    if (eventType === 'Sent') {
      newBalances = this.calculateNewBalancesSent(senderAmount, recieverAmount, D, lockedOrMintedAmount);
    } else if (eventType === 'Burn') {
      newBalances = this.calculateNewBalancesBurn(senderAmount, recieverAmount, D, chainFrom, chainTo, monitoringEvent.lockedOrMintedAmount);
    }
    return newBalances;
  }

  calculateNewBalancesSent(senderAmount: BigNumber, recieverAmount: BigNumber, D: BigNumber, lockedOrMintedAmount: BigNumber): NewBalances {
    const newBalances = new NewBalances();
    newBalances.sender = senderAmount.plus(D);
    newBalances.reciever = recieverAmount.plus(D);
    if (newBalances.sender.lte(lockedOrMintedAmount)) {
      newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
    } else {
      newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
    }

    return newBalances;
  }

  calculateNewBalancesBurn(
    recieverAmount: BigNumber,
    senderAmount: BigNumber,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
    lockedOrMintedAmount: string,
  ): NewBalances {
    const newBalances = new NewBalances();
    const monitoringEventLockedOrMintedAmount = new BigNumber(lockedOrMintedAmount);
    // is not return to native chain
    if (chainFrom !== chainTo) {
      newBalances.reciever = recieverAmount.plus(D);
      newBalances.sender = senderAmount.minus(D);
      if (newBalances.sender !== monitoringEventLockedOrMintedAmount || newBalances.sender.lt(0)) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
      // return to native chain
    } else {
      newBalances.reciever = recieverAmount.minus(D);
      newBalances.sender = senderAmount.minus(D);

      if (newBalances.reciever.lt(0) || newBalances.sender.lt(0) || newBalances.sender !== monitoringEventLockedOrMintedAmount) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
    }
    return newBalances;
  }
  calculateNewBalancesWithoutValidation(
    eventType: string,
    balanceSender: string,
    balanceReciever: string,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
  ): NewBalances {
    let newBalances = new NewBalances();
    const senderAmount = new BigNumber(balanceSender);
    const recieverAmount = new BigNumber(balanceReciever);

    if (eventType === 'Sent') {
      newBalances = this.calculateNewBalancesWithoutValidationSent(senderAmount, recieverAmount, D);
    } else if (eventType === 'Burn') {
      newBalances = this.calculateNewBalancesWithoutValidationBurn(senderAmount, recieverAmount, D, chainFrom, chainTo);
    }
    return newBalances;
  }

  calculateNewBalancesWithoutValidationSent(senderAmount: BigNumber, recieverAmount: BigNumber, D: BigNumber): NewBalances {
    const newBalances = new NewBalances();
    newBalances.sender = senderAmount.plus(D);
    newBalances.reciever = recieverAmount.plus(D);
    newBalances.status = SubmisionBalanceStatusEnum.CHECKED;

    return newBalances;
  }

  calculateNewBalancesWithoutValidationBurn(
    recieverAmount: BigNumber,
    senderAmount: BigNumber,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
  ): NewBalances {
    const newBalances = new NewBalances();
    // is not return to native chain
    if (chainFrom !== chainTo) {
      newBalances.reciever = recieverAmount.plus(D);
      newBalances.sender = senderAmount.minus(D);
      if (newBalances.sender.lt(0)) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
      // return to native chain
    } else {
      newBalances.reciever = recieverAmount.minus(D);
      newBalances.sender = senderAmount.minus(D);

      if (newBalances.reciever.lt(0) || newBalances.sender.lt(0)) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
    }
    return newBalances;
  }

  private async isAllChainsSynced(manager: EntityManager, currentTimestamp: number) {
    const chains = await manager.find(SupportedChainEntity, {});
    return chains.every(chain => {
      return currentTimestamp <= chain.validationTimestamp;
    });
  }

  private async getBalance(entityManager: EntityManager, chainId: number, debridgeId: string): Promise<TokenBalanceHistory> {
    const balance = await entityManager.findOne(TokenBalanceHistory, {
      where: {
        chainId,
        debridgeId,
      },
    });
    if (!balance) {
      const emptyBalance = {
        chainId,
        debridgeId,
        amount: '0',
      } as TokenBalanceHistory;
      await entityManager.save(TokenBalanceHistory, emptyBalance);
      return emptyBalance;
    }
    return balance;
  }

  private async setBalance(entityManager: EntityManager, chainId: number, debridgeId: string, blockTimestamp: number, amount: BigNumber) {
    return entityManager.update(
      TokenBalanceHistory,
      {
        chainId,
        debridgeId,
      },
      {
        amount: amount.toString(),
        blockTimestamp: blockTimestamp,
      },
    );
  }
}

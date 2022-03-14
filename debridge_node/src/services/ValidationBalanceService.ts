import { Injectable, Logger } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { EntityManager } from 'typeorm';

import { MonitoringSentEventEntity } from '../entities/MonitoringSentEventEntity';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import { TokenBalanceHistory } from '../entities/TokenBalanceHistory';
import { SubmisionBalanceStatusEnum } from '../enums/SubmisionBalanceStatusEnum';

export class NewBalances {
  reciever: BigNumber;
  sender: BigNumber;
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
    monitoringEvent: MonitoringSentEventEntity,
  ): Promise<SubmisionBalanceStatusEnum> {
    let newBalances = new NewBalances(SubmisionBalanceStatusEnum.ERROR);
    try {
      const { rawEvent, chainFrom, chainTo, debridgeId, updatedAt } = submission;
      const sendEvent = JSON.parse(rawEvent);

      const D = this.calculateDelta(sendEvent.returnValues.amount, sendEvent.returnValues.feeParams);

      const balanceSender = await this.getBalance(manager, chainFrom, debridgeId);
      const balanceReceiver = await this.getBalance(manager, chainTo, debridgeId);

      newBalances = this.calculateNewBalances(sendEvent.event, balanceSender.amount, balanceReceiver.amount, D, chainFrom, chainTo, monitoringEvent);
      if (newBalances.status === SubmisionBalanceStatusEnum.CHECKED) {
        await this.setBalance(manager, chainFrom, debridgeId, newBalances.sender);
        await this.setBalance(manager, chainTo, debridgeId, newBalances.reciever);
      } else if (newBalances.status === SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION) {
        const isAllChainsSynced = await this.isAllChainsSynced(manager, updatedAt);
        if (isAllChainsSynced) {
          throw new Error('all chains already synced');
        }
        newBalances.status = SubmisionBalanceStatusEnum.ON_HOLD;
      }
    } catch (e) {
      this.logger.error(`failed to validate balance: ${e.message}`);
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
    balanceSenderOld: string,
    balanceRecieverOld: string,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
    monitoringEvent: MonitoringSentEventEntity,
  ): NewBalances {
    let newBalances = new NewBalances();
    const balanceSenderAmountOld = new BigNumber(balanceSenderOld);
    const balanceReceiverAmountOld = new BigNumber(balanceRecieverOld);
    if (eventType === 'Sent') {
      newBalances = this.calculateNewBalancesSent(balanceSenderAmountOld, balanceReceiverAmountOld, D, monitoringEvent.lockedOrMintedAmount);
    } else if (eventType === 'Burn') {
      newBalances = this.calculateNewBalancesBurn(
        balanceSenderAmountOld,
        balanceReceiverAmountOld,
        D,
        chainFrom,
        chainTo,
        monitoringEvent.lockedOrMintedAmount,
      );
    }
    return newBalances;
  }

  calculateNewBalancesSent(recieverAmount: BigNumber, senderAmount: BigNumber, D: BigNumber, lockedOrMintedAmount: number): NewBalances {
    const newBalances = new NewBalances();
    const monitoringEventLockedOrMintedAmount = new BigNumber(lockedOrMintedAmount);
    newBalances.sender = senderAmount.plus(D);
    newBalances.reciever = recieverAmount.plus(D);
    if (newBalances.sender === monitoringEventLockedOrMintedAmount) {
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
    lockedOrMintedAmount: number,
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

  private async isAllChainsSynced(manager: EntityManager, currentTimestamp: Date) {
    const chains = await manager.find(SupportedChainEntity, {});
    return chains.every(chain => {
      return currentTimestamp.getTime() >= chain.validationTimestamp.getTime();
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

  private async setBalance(entityManager: EntityManager, chainId: number, debridgeId: string, amount: BigNumber) {
    return entityManager.update(
      TokenBalanceHistory,
      {
        chainId,
        debridgeId,
      },
      {
        amount: amount.toString(),
      },
    );
  }
}

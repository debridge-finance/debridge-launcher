import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { EntityManager } from 'typeorm';

import { MonitoringSentEventEntity } from '../entities/MonitoringSentEventEntity';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import { TokenBalanceHistory } from '../entities/TokenBalanceHistory';
import { SubmisionBalanceStatusEnum } from '../enums/SubmisionBalanceStatusEnum';

interface NewBalances {
  reciever: BigNumber;
  sender: BigNumber;
  status: SubmisionBalanceStatusEnum;
}

@Injectable()
export class ValidationBalanceService {
  async calculate(
    manager: EntityManager,
    submission: SubmissionEntity,
    monitoringEvent: MonitoringSentEventEntity,
  ): Promise<SubmisionBalanceStatusEnum> {
    let newBalances;
    try {
      const { rawEvent, chainFrom, chainTo, debridgeId, updatedAt } = submission;
      const sendEvent = JSON.parse(rawEvent);

      const D = this.calculateDelta(sendEvent.returnValues.amount, sendEvent.returnValues.feeParams);

      const balanceSender = await this.getBalance(manager, chainFrom, debridgeId);
      const balanceReceiver = await this.getBalance(manager, chainTo, debridgeId);
      const balanceSenderAmountOld = new BigNumber(balanceSender.amount);
      const balanceReceiverAmountOld = new BigNumber(balanceReceiver.amount);

      newBalances = this.calculateNewBalances(
        sendEvent.event,
        balanceSenderAmountOld,
        balanceReceiverAmountOld,
        D,
        chainFrom,
        chainTo,
        monitoringEvent,
      );
      if (newBalances.status === SubmisionBalanceStatusEnum.CHECKED) {
        await this.setBalance(manager, chainTo, debridgeId, newBalances.sender);
        await this.setBalance(manager, chainFrom, debridgeId, newBalances.reciever);
      } else if (newBalances.status === SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION) {
        const isAllChainsSynced = await this.isAllChainsSynced(manager, updatedAt);
        if (isAllChainsSynced) {
          throw new Error('all chains already synced');
        }
        newBalances.status = SubmisionBalanceStatusEnum.ON_HOLD;
      }
    } catch (e) {
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
    balanceSenderAmountOld: BigNumber,
    balanceReceiverAmountOld: BigNumber,
    D: BigNumber,
    chainFrom: number,
    chainTo: number,
    monitoringEvent: MonitoringSentEventEntity,
  ): NewBalances {
    let newBalances: NewBalances;
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
    let newBalances: NewBalances;
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
    let newBalances: NewBalances;
    const monitoringEventLockedOrMintedAmount = new BigNumber(lockedOrMintedAmount);
    // return to native chain
    if (chainFrom !== chainTo) {
      newBalances.reciever = recieverAmount.plus(D);
      newBalances.sender = senderAmount.minus(D);
      if (newBalances.sender !== monitoringEventLockedOrMintedAmount || newBalances.sender.lt(0)) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
    } else {
      newBalances.reciever = recieverAmount.minus(D);
      newBalances.sender = senderAmount.minus(D);

      if (newBalances.sender.lt(0) || newBalances.sender.lt(0) || newBalances.sender !== monitoringEventLockedOrMintedAmount) {
        newBalances.status = SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION;
      } else {
        newBalances.status = SubmisionBalanceStatusEnum.CHECKED;
      }
    }
    return newBalances;
  }

  //   if (balanceSenderAmountOld.gt(0)) {
  //     await this.setBalance(manager, chainTo, debridgeId, balanceSenderAmountOld);
  //   } else {
  //     const isAllChainsSynced = await this.checkTimestaps(manager, validationTime);
  //     if (isAllChainsSynced) {
  //       throw new Error('all chains synced');
  //     }
  //     result = SubmisionBalanceStatusEnum.ON_HOLD;
  //     return result;
  //   }
  //   if (balanceReceiverAmountOld.gt(0)) {
  //     await this.setBalance(manager, chainTo, debridgeId, balanceReceiverAmountOld);
  //   } else {
  //     const isAllChainsSynced = await this.checkTimestaps(manager, validationTime);
  //     if (isAllChainsSynced) {
  //       throw new Error('all chains synced');
  //     }
  //     result = SubmisionBalanceStatusEnum.ON_HOLD;
  //     return result;
  //   }
  // } else {
  //   balanceReceiverAmountOld.plus(D);
  //   balanceSenderAmountOld.minus(D);
  // }
  private async isAllChainsSynced(manager: EntityManager, currentTimestamp: Date) {
    const chains = await manager.find(SupportedChainEntity, {});
    return chains.every(chain => {
      return currentTimestamp.getTime() >= chain.validationTimestamp.getTime();
    });
  }

  //private readonly manager: EntityManager, private readonly event, private readonly monitoringEvent

  /*private async calculateBalance(manager: EntityManager, web3, chainId: string, event) {
    const submissionId = event.returnValues.submissionId;


    const debridgeId = event.returnValues.debridgeId;
    const chainIdTo = event.returnValues.chainIdTo;
    const balanceSender = await this.getBalance(manager, chainId, debridgeId);
    const balanceReceiver = await this.getBalance(manager, chainIdTo, debridgeId);



    const monitorSendEvent = await manager.findOne(MonitoringSendEventEntity, {
      submissionId,
    });

    if (!monitorSendEvent) {
      const message = `Not found monitoring event for submissionId ${submissionId}`;
      this.logger.warn(message);
      throw new Error(message);
    }
    if (monitorSendEvent.nonce !== event.nonce) {
      const message = `Monitring event nonce does not equal to send event nonce ${monitorSendEvent.nonce} !== ${event.nonce}`;
      this.logger.warn(message);
      throw new Error(message);
    }

    if (event.event === 'Sent') {
      this.getBalanceForSent(balanceSenderAmountOld, balanceReceiverAmountOld, D);
    } else if (event.event === 'Burn') {
      balanceSenderAmountOld.plus(D);
      balanceReceiverAmountOld.plus(D);
    }

    const useAssetFee = event.returnValues.feeParams[3];
    const transferFee = new BigNumber(event.returnValues.feeParams[2]);
    const fixFee = new BigNumber(event.returnValues.feeParams[1]);

    const assetComission = useAssetFee ? transferFee.plus(fixFee) : transferFee;
    const Dfrom = amount.plus(assetComission).plus(exectutionFee);
    const Dto = assetComission.plus(exectutionFee);
  }



  private async getBalanceForSend(balanceSenderAmountOld: BigNumber, balanceReceiverAmountOld: BigNumber, D: BigNumber) {
    return;
  }
  private async getBalanceForBurn() {
    return;
  }
  private async validateBalance(): Promise<SubmisionBalanceStatusEnum> {
    return SubmisionBalanceStatusEnum.CHECKED;
  }*/

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

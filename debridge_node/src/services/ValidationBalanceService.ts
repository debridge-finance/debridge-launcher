import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SubmisionBalanceStatusEnum } from '../enums/SubmisionBalanceStatusEnum';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { MonitoringSentEventEntity } from '../entities/MonitoringSentEventEntity';
import { BigNumber } from 'bignumber.js';
import { TokenBalanceHistory } from '../entities/TokenBalanceHistory';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';

@Injectable()
export class ValidationBalanceService {
  async calculate(
    manager: EntityManager,
    submission: SubmissionEntity,
    monitoringEvent: MonitoringSentEventEntity,
  ): Promise<SubmisionBalanceStatusEnum> {
    let result: SubmisionBalanceStatusEnum;
    try {
      const validationTime = new Date();
      const { rawEvent, chainFrom, debridgeId, chainTo, blockNumber } = submission;
      const event = JSON.parse(rawEvent);
      const amount = new BigNumber(event.returnValues.amount);
      const exectutionFee = new BigNumber(event.returnValues.feeParams);
      const balanceSender = await this.getBalance(manager, chainFrom, debridgeId);
      const balanceReceiver = await this.getBalance(manager, chainTo, debridgeId);
      const amountBalanceSender = new BigNumber(balanceSender.amount);
      const amountBalanceReceiver = new BigNumber(balanceReceiver.amount);
      const D = amount.plus(exectutionFee);

      const sendEventNonce = event.returnValues.nonce;
      const monitoringEventNonce = monitoringEvent.nonce;
      
      const lockedOrMintedAmount = monitoringEvent.lockedOrMintedAmount;

      if (event.event === 'Sent') {
        amountBalanceReceiver.plus(D);
        amountBalanceSender.plus(D);
        await this.setBalance(manager, chainTo, debridgeId, amountBalanceSender);
        await this.setBalance(manager, chainFrom, debridgeId, amountBalanceReceiver);
      } else if (event.event === 'Burn') {
        if (chainFrom === chainTo) {
          amountBalanceReceiver.plus(D);
          amountBalanceSender.minus(D);
          if (amountBalanceSender.gt(0)) {
            await this.setBalance(manager, chainTo, debridgeId, amountBalanceSender);
          } else {
            const isAllChainsSynced = await this.checkTimestaps(manager, validationTime);
            if (isAllChainsSynced) {
              throw new Error('all chains synced');
            }
            result = SubmisionBalanceStatusEnum.ON_HOLD;
            return result;
          }
          if (amountBalanceReceiver.gt(0)) {
            await this.setBalance(manager, chainTo, debridgeId, amountBalanceReceiver);
          } else {
            const isAllChainsSynced = await this.checkTimestaps(manager, validationTime);
            if (isAllChainsSynced) {
              throw new Error('all chains synced');
            }
            result = SubmisionBalanceStatusEnum.ON_HOLD;
            return result;
          }
        } else {
          amountBalanceReceiver.plus(D);
          amountBalanceSender.minus(D);
        }
      }

      result = SubmisionBalanceStatusEnum.CHECKED;
    } catch (e) {
      result = SubmisionBalanceStatusEnum.ERROR;
    }
    return result;
  }
  private async checkTimestaps(manager: EntityManager, currentTimestamp: Date) {
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
      this.getBalanceForSent(amountBalanceSender, amountBalanceReceiver, D);
    } else if (event.event === 'Burn') {
      amountBalanceSender.plus(D);
      amountBalanceReceiver.plus(D);
    }

    const useAssetFee = event.returnValues.feeParams[3];
    const transferFee = new BigNumber(event.returnValues.feeParams[2]);
    const fixFee = new BigNumber(event.returnValues.feeParams[1]);

    const assetComission = useAssetFee ? transferFee.plus(fixFee) : transferFee;
    const Dfrom = amount.plus(assetComission).plus(exectutionFee);
    const Dto = assetComission.plus(exectutionFee);
  }



  private async getBalanceForSend(amountBalanceSender: BigNumber, amountBalanceReceiver: BigNumber, D: BigNumber) {
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

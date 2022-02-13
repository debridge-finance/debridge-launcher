import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { EntityManager } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { Web3Service } from '../../services/Web3Service';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { ChainConfigService } from '../../services/ChainConfigService';
import { BigNumber } from 'bignumber.js';
import { TokenBalanceHistory } from '../../entities/TokenBalanceHistory';

@Injectable()
export class AddNewEventsAction {
  logger: Logger;
  private locker = new Map();

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
  ) {
    this.logger = new Logger(AddNewEventsAction.name);
  }

  async action(chainId: number) {
    if (this.locker.get(chainId)) {
      this.logger.warn(`Is working now. chainId: ${chainId}`);
      return;
    }
    try {
      this.locker.set(chainId, true);
      this.logger.log(`Is locked chainId: ${chainId}`);
      await this.process(chainId);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.locker.set(chainId, false);
      this.logger.log(`Is unlocked chainId: ${chainId}`);
    }
  }

  /**
   * Process new transfers
   * @param {EventData[]} events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(manager: EntityManager, events: any[], chainIdFrom: number) {
    if (!events) return true;
    const isOk = true;
    for (const sendEvent of events) {
      this.logger.log(`processNewTransfers chainIdFrom ${chainIdFrom}; submissionId: ${sendEvent.returnValues.submissionId}`);
      //this.logger.debug(JSON.stringify(sentEvents));
      const submissionId = sendEvent.returnValues.submissionId;
      const submission = await manager.findOne(SubmissionEntity, {
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        continue;
      }

      try {
        await manager.save(SubmissionEntity, {
          submissionId: submissionId,
          txHash: sendEvent.transactionHash,
          chainFrom: chainIdFrom,
          chainTo: sendEvent.returnValues.chainIdTo,
          debridgeId: sendEvent.returnValues.debridgeId,
          receiverAddr: sendEvent.returnValues.receiver,
          amount: sendEvent.returnValues.amount,
          status: SubmisionStatusEnum.NEW,
          ipfsStatus: UploadStatusEnum.NEW,
          apiStatus: UploadStatusEnum.NEW,
          assetsStatus: SubmisionAssetsStatusEnum.NEW,
          rawEvent: JSON.stringify(sendEvent),
        } as SubmissionEntity);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    return isOk;
  }

  async getEvents(registerInstance, fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    const sentEvents = await registerInstance.getPastEvents(
      'Sent',
      { fromBlock, toBlock }, //,
      //async (error, events) => {
      //    if (error) {
      //        this.log.error(error);
      //    }
      //    await this.processNewTransfers(events, supportedChain.chainId);
      //}
    );

    // this.logger.debug('getEvents: ' + JSON.stringify(sentEvents));

    return sentEvents;
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    await this.entityManager.transaction(async manager => {
      this.logger.verbose(`checkNewEvents ${chainId}`);
      const supportedChain = await this.entityManager.findOne(SupportedChainEntity, {
        where: {
          chainId,
        },
      });
      const chainDetail = this.chainConfigService.get(chainId);
      const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);
      const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
      const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
      let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

      this.logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);
      for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
        const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
        this.logger.log(`checkNewEvents ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

        const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
        const processSuccess = await this.processNewTransfers(manager, sentEvents, supportedChain.chainId);

        /* update lattest viewed block */
        if (processSuccess) {
          if (supportedChain.latestBlock != lastBlockOfPage) {
            this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: latestBlock; value: ${lastBlockOfPage}`);
            await manager.update(SupportedChainEntity, chainId, {
              latestBlock: lastBlockOfPage,
            });
          }
        } else {
          this.logger.error(`checkNewEvents. Last block not updated. Found error in processNewTransfers ${chainId}`);
          break;
        }
      }
    });
  }

  private async calculateBalance(entityManager: EntityManager, web3, chainId: string, event) {
    const debridgeId = event.returnValues.debridgeId;
    const chainIdTo = event.returnValues.chainIdTo;
    const useAssetFee = event.returnValues.feeParams[3];
    const transferFee = new BigNumber(event.returnValues.feeParams[2]);
    const fixFee = new BigNumber(event.returnValues.feeParams[1]);
    const amount = new BigNumber(event.amount);
    const exectutionFee = new BigNumber(event.returnValues['7'][0]); // not sure

    const assetComission = useAssetFee ? transferFee.plus(fixFee) : transferFee;
    const Dform = amount.plus(assetComission).plus(exectutionFee);
    const Dto = assetComission.plus(exectutionFee);

    const balanceSender = await this.getBalance(entityManager, chainId, debridgeId);
    const balanceReceiver = await this.getBalance(entityManager, chainIdTo, debridgeId);

    const amountBalanceSender = new BigNumber(balanceSender.amount);
    const amountBalanceReceiver = new BigNumber(balanceReceiver.amount);

    if (event.event === 'Sent') {
      amountBalanceSender.plus(Dform);
      amountBalanceReceiver.plus(Dto);
    } else if (event.event === 'Burn') {
      amountBalanceSender.plus(Dform);
      amountBalanceReceiver.plus(Dto);
    }
  }

  private async getBalance(entityManager: EntityManager, chainId: string, debridgeId: string): Promise<TokenBalanceHistory> {
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
    }
    return balance;
  }
}

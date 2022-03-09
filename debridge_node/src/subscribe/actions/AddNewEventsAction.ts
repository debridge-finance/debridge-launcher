import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
import { NonceControllingService } from './NonceControllingService';
import { ChainScanningService } from '../../services/ChainScanningService';
import { DebrdigeApiService } from '../../services/DebrdigeApiService';
import { MonitoringSendEventEntity } from '../../entities/MonitoringSendEventEntity';
import { BigNumber } from 'bignumber.js';
import { TokenBalanceHistory } from '../../entities/TokenBalanceHistory';

interface ProcessNewTransferResult {
  blockToOverwrite?: number;
  status: 'incorrect_nonce' | 'success' | 'empty';
  submissionId?: string;
  nonce?: number;
}

@Injectable()
export class AddNewEventsAction {
  private logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();
  private readonly chainingScanningMap = new Map<number, AddNewEventsAction>();

  constructor(
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
    private readonly nonceControllingService: NonceControllingService,
    private readonly debridgeApiService: DebrdigeApiService,
  ) {}

  async action(chainId: number) {
    if (this.locker.get(chainId)) {
      this.logger.warn(`Is working now. chainId: ${chainId}`);
      return;
    }
    try {
      this.locker.set(chainId, true);
      this.logger.log(`Is locked chainId: ${chainId}`);
      if (!this.chainingScanningMap.has(chainId)) {
        this.chainingScanningMap.set(
          chainId,
          new AddNewEventsAction(
            this.chainScanningService,
            this.entityManager,
            this.chainConfigService,
            this.web3Service,
            this.nonceControllingService,
            this.debridgeApiService,
          ),
        );
      }
      await this.chainingScanningMap.get(chainId).process(chainId);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.locker.set(chainId, false);
      this.logger.log(`Is unlocked chainId: ${chainId}`);
    }
  }

  /**
   * Process new transfers
   * @param manager
   * @param {EventData[]} events
   * @param {number} chainIdFrom
   * @private
   */
  async processNewTransfers(manager: EntityManager, events: any[], chainIdFrom: number): Promise<ProcessNewTransferResult> {
    let blockToOverwrite;
    if (!events) {
      return {
        status: 'empty',
      };
    }
    for (const sendEvent of events) {
      const submissionId = sendEvent.returnValues.submissionId;
      this.logger.log(`chainId: ${chainIdFrom}; submissionId: ${submissionId}`);
      const nonce = parseInt(sendEvent.returnValues.nonce);
      const submission = await manager.findOne(SubmissionEntity, {
        where: {
          submissionId,
        },
      });
      if (submission) {
        this.logger.verbose(`chainId: ${chainIdFrom}; Submission already found in db submissionId: ${submissionId}`);
        blockToOverwrite = submission.blockNumber;
        continue;
      }

      if (this.nonceControllingService.get(chainIdFrom) && nonce !== this.nonceControllingService.get(chainIdFrom) + 1) {
        const message = `Incorrect nonce ${nonce} in scanning from ${chainIdFrom}`;
        this.logger.error(message);
        return {
          blockToOverwrite,
          status: 'incorrect_nonce',
          submissionId,
          nonce,
        };
      }

      try {
        await manager.save({
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
          blockNumber: sendEvent.blockNumber,
          nonce,
        } as SubmissionEntity);
        blockToOverwrite = sendEvent.blockNumber;
        this.nonceControllingService.set(chainIdFrom, nonce);
      } catch (e) {
        this.logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
    }
    this.logger.log(`chainIdFrom: ${chainIdFrom}; blockToOverwrite ${blockToOverwrite}`);
    return {
      status: 'success',
    };
  }

  async getEvents(registerInstance, event: 'Sent' | 'MonitoringSend', fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    const sentEvents = await registerInstance.getPastEvents(event, { fromBlock, toBlock });

    return sentEvents;
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    this.logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);

    await this.entityManager.transaction(async transaction => {
      this.logger.verbose(`${chainId}> proceess> with> 0 checkNewEvents args: chainId: ${chainId}; from: ${from}; to: ${to}`);
      const supportedChain = await transaction.findOne(SupportedChainEntity, {
        where: {
          chainId,
        },
      });
      const chainDetail = this.chainConfigService.get(chainId);

      const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);

      const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);

      const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
      let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

      this.logger.debug(`chainId: ${chainDetail.chainId}; Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

      for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
        const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
        this.logger.log(`chainId: ${chainDetail.chainId}; supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);

        const monitoringSendEvents = await this.getEvents(registerInstance, 'MonitoringSend', fromBlock, lastBlockOfPage);
        await Promise.all(
          monitoringSendEvents.map(event => {
            return transaction.save({
              submissionId: event.returnValues.submissionId,
              nonce: event.returnValues.nonce,
              lockedOrMintedAmount: event.returnValues.lockedOrMintedAmount,
              chainId,
            } as MonitoringSendEventEntity);
          }),
        );

        const sentEvents = await this.getEvents(registerInstance, 'Sent', fromBlock, lastBlockOfPage);
        this.logger.log(`chainId: ${chainDetail.chainId}; sentEvents: ${JSON.stringify(sentEvents)}`);
        if (!sentEvents || sentEvents.length === 0) {
          this.logger.verbose(`chainId: ${chainDetail.chainId}; Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
          await transaction.update(SupportedChainEntity, chainId, {
            latestBlock: lastBlockOfPage,
          });
          continue;
        }

        const result = await this.processNewTransfers(transaction, sentEvents, supportedChain.chainId);

        if (result.status === 'incorrect_nonce') {
          this.logger.log(`chainId: ${chainDetail.chainId}; result.status: incorrect_nonce`);
          this.chainScanningService.pause(chainId);
          await this.debridgeApiService.notifyError(
            `incorrect nonce error: nonce: ${result.nonce}; chainId: ${chainId}; submissionId: ${result.submissionId}`,
          );
          break;
        }
        if (result) {
          const lastBlock = result.blockToOverwrite ? result.blockToOverwrite : toBlock;
          if (supportedChain.latestBlock !== lastBlockOfPage) {
            this.logger.log(`updateSupportedChainBlock chainId: ${chainId}; key: latestBlock; value: ${lastBlock}`);
            await transaction.update(SupportedChainEntity, chainId, {
              latestBlock: lastBlock,
            });
          }
        } else {
          this.logger.error(`chainId: ${chainId}; Last block not updated. Found error in processNewTransfers`);
          break;
        }
      }
    });
  }

  private async calculateBalance(manager: EntityManager, web3, chainId: string, event) {
    const submissionId = event.returnValues.submissionId;
    const amount = new BigNumber(event.amount);
    const exectutionFee = new BigNumber(event.returnValues['7'][0]); // not sure
    const debridgeId = event.returnValues.debridgeId;
    const chainIdTo = event.returnValues.chainIdTo;
    const balanceSender = await this.getBalance(manager, chainId, debridgeId);
    const balanceReceiver = await this.getBalance(manager, chainIdTo, debridgeId);

    const amountBalanceSender = new BigNumber(balanceSender.amount);
    const amountBalanceReceiver = new BigNumber(balanceReceiver.amount);

    const monitorSendEvent = await manager.findOne(MonitoringSendEventEntity, {
      submissionId,
    });

    if (!monitorSendEvent) {
      const message = `Not found monitor event for submissionId ${submissionId}`;
      this.logger.warn(message);
      throw new Error(message);
    }

    const D = amount.minus(exectutionFee);
    if (event.event === 'Sent') {
      amountBalanceSender.minus(D);
      amountBalanceReceiver.plus(D);
    } else if (event.event === 'Burn') {
      amountBalanceSender.plus(D);
      amountBalanceReceiver.plus(D);
    }

    const useAssetFee = event.returnValues.feeParams[3];
    const transferFee = new BigNumber(event.returnValues.feeParams[2]);
    const fixFee = new BigNumber(event.returnValues.feeParams[1]);

    const assetComission = useAssetFee ? transferFee.plus(fixFee) : transferFee;
    const Dform = amount.plus(assetComission).plus(exectutionFee);
    const Dto = assetComission.plus(exectutionFee);
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

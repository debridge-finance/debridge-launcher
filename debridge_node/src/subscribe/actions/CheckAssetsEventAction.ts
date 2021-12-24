import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../enums/UploadStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { abi as ERC20Abi } from '../../assets/ERC20.json';
import Web3 from 'web3';
import { readFileSync } from 'fs';
import { Account } from 'web3-core';
import { createProxy } from '../../utils/create.proxy';
import { getTokenName } from '../../utils/get.token.name';
import { Web3Service } from '../../services/Web3Service';

@Injectable()
export class CheckAssetsEventAction extends IAction {
  private account: Account;

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly web3Service: Web3Service,
  ) {
    super();
    this.logger = new Logger(CheckAssetsEventAction.name);
    this.account = createProxy(new Web3(), { logger: this.logger }).eth.accounts.decrypt(
      JSON.parse(readFileSync('./keystore.json', 'utf-8')),
      process.env.KEYSTORE_PASSWORD,
    );
  }

  async process() {
    this.logger.log(`Check assets event`);
    const submissions = await this.submissionsRepository.find({
      assetsStatus: SubmisionAssetsStatusEnum.NEW,
    });

    const newSubmitionIds = [];
    const assetsWasCreatedSubmitions = [];

    for (const submission of submissions) {
      if (!submission.debridgeId) {
        continue;
      }
      const confirmNewAction = await this.confirmNewAssetEntityRepository.findOne({
        where: {
          debridgeId: submission.debridgeId,
        },
      });
      if (!confirmNewAction) {
        try {
          this.logger.log(`Process debridgeId: ${submission.debridgeId}`);
          const chainDetail = ChainsConfig.find(item => {
            return item.chainId === submission.chainFrom;
          });
          this.logger.log(chainDetail.provider);

          const web3 = this.web3Service.web3HttpProvider(chainDetail.provider);
          const deBridgeGateInstance = createProxy(new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr), { logger: this.logger });
          // struct DebridgeInfo {
          //   uint256 chainId; // native chain id
          //   uint256 maxAmount; // maximum amount to transfer
          //   uint256 balance; // total locked assets
          //   uint256 lockedInStrategies; // total locked assets in strategy (AAVE, Compound, etc)
          //   address tokenAddress; // asset address on the current chain
          //   uint16 minReservesBps; // minimal hot reserves in basis points (1/10000)
          //   bool exist;
          // }
          const debridgeInfo = await deBridgeGateInstance.methods.getDebridge(submission.debridgeId).call();
          this.logger.log(JSON.stringify(debridgeInfo));
          // struct TokenInfo {
          //   uint256 nativeChainId;
          //   bytes nativeAddress;
          // }
          const nativeTokenInfo = await deBridgeGateInstance.methods.getNativeInfo(debridgeInfo.tokenAddress).call();
          this.logger.log(JSON.stringify(nativeTokenInfo));
          const tokenChainDetail = ChainsConfig.find(item => {
            return item.chainId === parseInt(nativeTokenInfo.nativeChainId);
          });
          const tokenWeb3 = this.web3Service.web3HttpProvider(tokenChainDetail.provider);
          this.logger.log(tokenChainDetail.provider);
          const nativeTokenInstance = createProxy(new tokenWeb3.eth.Contract(ERC20Abi as any, nativeTokenInfo.nativeAddress), {
            logger: this.logger,
          });

          const tokenName = await getTokenName(nativeTokenInstance, nativeTokenInfo.nativeAddress, { logger: this.logger });
          const tokenSymbol = await nativeTokenInstance.methods.symbol().call();
          const tokenDecimals = await nativeTokenInstance.methods.decimals().call();
          //keccak256(abi.encodePacked(debridgeId, _name, _symbol, _decimals));
          const deployId = web3.utils.soliditySha3(
            { t: 'bytes32', v: submission.debridgeId },
            { t: 'string', v: tokenName },
            { t: 'string', v: tokenSymbol },
            { t: 'uint8', v: tokenDecimals },
          );
          this.logger.log(`tokenName: ${tokenName}`);
          this.logger.log(`tokenSymbol: ${tokenSymbol}`);
          this.logger.log(`tokenDecimals: ${tokenDecimals}`);
          this.logger.log(`deployId: ${deployId}`);
          const signature = this.account.sign(deployId).signature;
          this.logger.log(`signature: ${signature}`);
          this.logger.log(`signed ${deployId} ${signature}`);

          await this.confirmNewAssetEntityRepository.save({
            debridgeId: submission.debridgeId,
            submissionTxHash: submission.txHash,
            nativeChainId: debridgeInfo.chainId,
            tokenAddress: nativeTokenInfo.nativeAddress,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            submissionChainFrom: submission.chainFrom,
            submissionChainTo: submission.chainTo,
            status: SubmisionStatusEnum.SIGNED,
            ipfsStatus: UploadStatusEnum.NEW,
            apiStatus: UploadStatusEnum.NEW,
            signature: signature,
            deployId: deployId,
          } as ConfirmNewAssetEntity);
          newSubmitionIds.push(submission.submissionId);
        } catch (e) {
          this.logger.error(`Error processing ${submission.submissionId} ${e.message}`);
          this.logger.error(e);
        }
      } else {
        assetsWasCreatedSubmitions.push(submission.submissionId);
      }
    }

    if (newSubmitionIds.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(newSubmitionIds),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_CREATED,
        },
      );
    }
    if (assetsWasCreatedSubmitions.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(assetsWasCreatedSubmitions),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_ALREADY_CREATED,
        },
      );
    }
    this.logger.log(`Finish Check assets event`);
  }
}

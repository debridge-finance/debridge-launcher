import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import ChainsConfig from '../../config/chains_config.json';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { abi as ERC20Abi } from '../../assets/ERC20.json';
import Web3 from 'web3';
import { OrbitDbService } from '../../services/OrbitDbService';


@Injectable()
export class CheckAssetsEventAction extends IAction<void> {

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly orbitDbService: OrbitDbService
  ) {
    super();
    this.logger = new Logger(CheckAssetsEventAction.name)
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
        debridgeId: submission.debridgeId,
      });
      if (!confirmNewAction) {
        try {

          this.logger.log(`Process debridgeId: ${submission.debridgeId}`);
          const chainDetail = ChainsConfig.find(item => {
            return item.chainId === submission.chainFrom;
          });
          this.logger.log(chainDetail.provider);
          const web3 = new Web3(chainDetail.provider);
          const deBridgeGateInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
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
          const tokenWeb3 = new Web3(tokenChainDetail.provider);
          this.logger.log(tokenChainDetail.provider);
          const nativeTokenInstance = new tokenWeb3.eth.Contract(ERC20Abi as any, nativeTokenInfo.nativeAddress);

          const tokenName = await nativeTokenInstance.methods.name().call();
          const tokenSymbol = await nativeTokenInstance.methods.symbol().call();
          const tokenDecimals = await nativeTokenInstance.methods.decimals().call();
          //keccak256(abi.encodePacked(debridgeId, _name, _symbol, _decimals));
          const deployId = web3.eth.abi.encodeParameters(
            ['bytes32', 'string', 'string', 'uint8'],
            [submission.debridgeId,
              tokenName,
              tokenSymbol,
              tokenDecimals
            ]);

          this.logger.log(`tokenName: ${tokenName}`);
          this.logger.log(`tokenSymbol: ${tokenSymbol}`);
          this.logger.log(`tokenDecimals: ${tokenDecimals}`);
          this.logger.log(`deployId: ${deployId}`);
          const signature = (await web3.eth.accounts.sign(deployId, process.env.SIGNATURE_PRIVATE_KEY)).signature;
          this.logger.log(`signature: ${signature}`);
          const [logHash, doscHash] = await this.orbitDbService.addConfirmNewAssets(deployId, signature,
            {
              txHash: submission.txHash,
              submissionId: submission.submissionId,
              debridgeId: submission.debridgeId,
              tokenAddress: nativeTokenInfo.nativeAddress,
              name: tokenName,
              symbol: tokenSymbol,
              decimals: tokenDecimals,
              chainFrom: submission.chainFrom,
              chainTo: submission.chainTo,
              deployId: deployId
            });
          this.logger.log(`signed ${deployId} ${signature}`);

          await this.confirmNewAssetEntityRepository.save({
            debridgeId: submission.debridgeId,
            tokenAddress: nativeTokenInfo.nativeAddress,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            chainFrom: submission.chainFrom,
            chainTo: submission.chainTo,
            status: SubmisionStatusEnum.SIGNED,
            signature: signature,
            deployId: deployId,
            ipfsLogHash: logHash,
            ipfsKeyHash: doscHash
          });
          newSubmitionIds.push(submission.submissionId);
        }
        catch (e) {
          this.logger.error(`Error processing ${submission.submissionId}`);
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

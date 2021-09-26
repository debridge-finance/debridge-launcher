import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { ConfigModule } from '@nestjs/config';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { In, Repository } from 'typeorm';
import { SubmisionStatusEnum } from '../../enums/SubmisionStatusEnum';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { AggregatorChainEntity } from '../../entities/AggregatorChainEntity';
import { ChainlinkConfigEntity } from '../../entities/ChainlinkConfigEntity';
import { ChainlinkServiceMock } from '../../chainlink/ChainlinkServiceMock';
import { ChainlinkService } from '../../chainlink/ChainlinkService';
import { HttpModule } from '@nestjs/axios';
import { CheckAssetsEventAction } from './CheckAssetsEventAction';
import { SubmisionAssetsStatusEnum } from '../../enums/SubmisionAssetsStatusEnum';
import { SetAllChainlinkCookiesAction } from './SetAllChainlinkCookiesAction';

describe('SetAllChainlinkCookiesAction', () => {
  let service: SetAllChainlinkCookiesAction;
  let repositoryChainlinkConfigEntity: Repository<ChainlinkConfigEntity>;
  let chainlinkService: ChainlinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AggregatorChainEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ChainlinkConfigEntity),
          useValue: {
            find: async () => {
              return [
                {
                  chainId: 97,
                  eiChainlinkUrl: 'test',
                  network: 'network',
                } as ChainlinkConfigEntity,
              ];
            },
            update: async (any, entity: Partial<ChainlinkConfigEntity>) => {
              return { affected: 1 };
            },
          },
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {},
        },
        {
          provide: ChainlinkService,
          useClass: ChainlinkServiceMock,
        },
        SetAllChainlinkCookiesAction,
      ],
    }).compile();
    service = module.get(SetAllChainlinkCookiesAction);
    repositoryChainlinkConfigEntity = module.get(getRepositoryToken(ChainlinkConfigEntity));
    chainlinkService = module.get(ChainlinkService);
  });

  describe('SetAllChainlinkCookiesAction', () => {
    it('SetAllChainlinkCookiesAction', async () => {
      jest.spyOn(repositoryChainlinkConfigEntity, 'update');
      jest.spyOn(repositoryChainlinkConfigEntity, 'find');
      jest.spyOn(chainlinkService, 'getChainlinkCookies');
      await service.action();

      expect(repositoryChainlinkConfigEntity.find).toHaveBeenCalled();
      expect(repositoryChainlinkConfigEntity.update).toHaveBeenCalledWith(
        { chainId: 97 },
        {
          cookie: await chainlinkService.getChainlinkCookies('test', 'test'),
        },
      );
      expect(chainlinkService.getChainlinkCookies).toHaveBeenCalledWith('test', 'test');
    });
  });
});

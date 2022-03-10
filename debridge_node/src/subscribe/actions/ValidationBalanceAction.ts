import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import {InjectEntityManager} from "@nestjs/typeorm";
import {EntityManager, In} from "typeorm";
import {SubmissionEntity} from "../../entities/SubmissionEntity";
import {SubmisionBalanceStatusEnum} from "../../enums/SubmisionBalanceStatusEnum";
import {ChainConfigService} from "../../services/ChainConfigService";

@Injectable()
export class ValidationBalanceAction extends IAction {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly chainConfigService: ChainConfigService,
  ) {
    super();
    this.logger = new Logger(ValidationBalanceAction.name);
  }

  async process(): Promise<void> {
    const submissions = await this.entityManager.find(SubmissionEntity, {
      balanceStatus: In([SubmisionBalanceStatusEnum.RECIEVED, SubmisionBalanceStatusEnum.ON_HOLD]),
    });
    for (const submission of submissions) {
      await this.entityManager.transaction(transactionManager => {
        //awa
      });
    }
    return Promise.resolve(undefined);
  }
}

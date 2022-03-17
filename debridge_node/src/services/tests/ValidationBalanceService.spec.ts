import { Test, TestingModule } from '@nestjs/testing';
import { NewBalances, ValidationBalanceService } from '../ValidationBalanceService';
import { BigNumber } from 'bignumber.js';
import { SubmisionBalanceStatusEnum } from '../../enums/SubmisionBalanceStatusEnum';

describe('ValidationBalanceService', () => {
  let service: ValidationBalanceService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [ValidationBalanceService],
    }).compile();

    service = module.get(ValidationBalanceService);
  });

  it('calculateNewBalancesSent', () => {
    const res1 = service.calculateNewBalancesSent(
      new BigNumber('1000000000000000000000'),
      new BigNumber('2'),
      new BigNumber('10'),
      new BigNumber('1000000000000000000010'),
    );
    expect(res1).toEqual(generateNewBalance('1000000000000000000010', '12', SubmisionBalanceStatusEnum.CHECKED));

    const res2 = service.calculateNewBalancesSent(new BigNumber('1'), new BigNumber('2'), new BigNumber('10'), new BigNumber('10'));
    expect(res2).toEqual(generateNewBalance('11', '12', SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION));
  });
});
// describe('ValidationBalanceService', () => {
//   let service: ValidationBalanceService;
//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       imports: [],
//       providers: [ValidationBalanceService],
//     }).compile();

//     service = module.get(ValidationBalanceService);
//   });

//   it('calculateNewBalancesSent', () => {
//     const res1 = service.calculateNewBalancesSent(
//       new BigNumber('1000000000000000000'), // senderAmount
//       new BigNumber('2000000000000000000'), // receiverAmount
//       new BigNumber('10'), // D
//       new BigNumber('1000000000000000010'), // lockedOrMintedAmount
//     );
//     const exp1 = generateNewBalance('1000000000000000010', '2000000000000000010', SubmisionBalanceStatusEnum.CHECKED);
//     expect(res1).toEqual(exp1);

//     // const res2 = service.calculateNewBalancesSent(
//     //   new BigNumber('2000000000000000000000'),
//     //   new BigNumber('1000000000000000000000'),
//     //   new BigNumber('10'),
//     //   new BigNumber('1000000000000000000000'),
//     // );
//     // expect(res2).toEqual(
//     //   generateNewBalance('2000000000000000000010', '1000000000000000000010', SubmisionBalanceStatusEnum.WHAIT_FOR_CHAINS_SYNCHRONIZATION),
//     // );
//   });
// });

// it('AddNewEventsAction validateNonce', () => {
//   expect(service.validateNonce(100, 90, false)).toBe(NonceValidationEnum.SUCCESS);
//   expect(service.validateNonce(10, 11, false)).toBe(NonceValidationEnum.SUCCESS);
//   expect(service.validateNonce(undefined, 0, false)).toBe(NonceValidationEnum.SUCCESS);
//   expect(service.validateNonce(0, 2, false)).toBe(NonceValidationEnum.MISSED_NONCE);
//   expect(service.validateNonce(10, 12, false)).toBe(NonceValidationEnum.MISSED_NONCE);
//   expect(service.validateNonce(10, 9, true)).toBe(NonceValidationEnum.DUPLICATED_NONCE);
//   expect(service.validateNonce(10, 10, true)).toBe(NonceValidationEnum.DUPLICATED_NONCE);
// });

function generateNewBalance(sender: string, reciever: string, status: SubmisionBalanceStatusEnum): NewBalances {
  const balance = new NewBalances(status);
  balance.sender = new BigNumber(sender);
  balance.reciever = new BigNumber(reciever);
  return balance;
}

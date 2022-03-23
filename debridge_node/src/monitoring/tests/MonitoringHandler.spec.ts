import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringHandler } from '../MonitoringHandler';
import * as fs from 'fs';

jest.mock('fs');
describe('MonitoringHandler', () => {
  let handler: MonitoringHandler;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [MonitoringHandler],
    }).compile();
    handler = module.get(MonitoringHandler);
  });

  it('handleHeapInfo', async () => {
    await handler.handleHeapInfo();
    expect(fs.writeFile).toHaveBeenCalled();
  });
});

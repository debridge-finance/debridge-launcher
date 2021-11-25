import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringHandler } from './MonitoringHandler';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [MonitoringHandler],
})
export class MonitoringModule {}

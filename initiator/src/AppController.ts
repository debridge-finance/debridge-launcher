import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ChainlinkDto } from './dto/ChainlinkDto';
import { ChainLinkConfigService } from './chainlink/ChainLinkConfigService';
import { ChainlinkConfigEntity } from './entities/ChainlinkConfigEntity';

@Controller()
export class AppController {
  constructor(private readonly chainLinkConfigService: ChainLinkConfigService) {}

  @Get()
  @HttpCode(200)
  main(): boolean {
    return true;
  }

  @Get('/jobs')
  @HttpCode(200)
  jobs(): boolean {
    return true;
  }

  @Post('/chainlink/config')
  @HttpCode(200)
  addConfig(@Body() dto: ChainlinkDto): Promise<ChainlinkConfigEntity> {
    return this.chainLinkConfigService.insert(dto as ChainlinkConfigEntity);
  }

  @Patch('/chainlink/config')
  @HttpCode(200)
  async updateConfig(@Body() dto: ChainlinkDto) {
    await this.chainLinkConfigService.update(dto as ChainlinkConfigEntity);
  }
}

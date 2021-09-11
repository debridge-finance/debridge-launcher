import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller()
export class AppController {
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
}

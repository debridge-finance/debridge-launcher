import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChainlinkDto } from './dto/ChainlinkDto';
import { ChainLinkConfigService } from './chainlink/ChainLinkConfigService';
import { ChainlinkConfigEntity } from './entities/ChainlinkConfigEntity';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserLoginDto } from './auth/user.login.dto';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly chainLinkConfigService: ChainLinkConfigService, private readonly authService: AuthService) {}

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
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addConfig(@Body() dto: ChainlinkDto): Promise<ChainlinkConfigEntity> {
    return this.chainLinkConfigService.insert(dto as ChainlinkConfigEntity);
  }

  @Patch('/chainlink/config')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async updateConfig(@Body() dto: ChainlinkDto) {
    await this.chainLinkConfigService.update(dto as ChainlinkConfigEntity);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Api for auth user',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  login(@Body() userLoginDto: UserLoginDto) {
    return this.authService.login(userLoginDto.login, userLoginDto.password);
  }
}

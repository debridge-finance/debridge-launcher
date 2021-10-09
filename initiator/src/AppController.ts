import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserLoginDto } from './auth/user.login.dto';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RescanDto } from './dto/RescanDto';
import { AddNewEventsAction } from './subscribe/actions/AddNewEventsAction';

@Controller()
export class AppController {
  constructor(
    private readonly authService: AuthService,
    private readonly addNewEventsAction: AddNewEventsAction,
  ) {}

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

  @Post('login')
  @ApiOperation({
    summary: 'Api for auth user',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  login(@Body() userLoginDto: UserLoginDto) {
    return this.authService.login(userLoginDto.login, userLoginDto.password);
  }

  @Post('rescan')
  @ApiOperation({
    summary: 'Api for rescan',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  restart(@Body() dto: RescanDto) {
    return this.addNewEventsAction.process(dto.chainId, dto.from, dto.to);
  }
}

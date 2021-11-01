import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrbitDbService } from '../services/OrbitDbService';
import { GetNamesResponseDTO } from '../dto/output/GetNamesResponseDTO';
import { AddSignedSubmissionRequestDTO } from '../dto/input/AddSignedSubmissionRequestDTO';
import { AddSignedSubmissionResponseDTO } from '../dto/output/AddSignedSubmissionResponseDTO';
import { AddLogSignedSubmissionRequestDTO } from '../dto/input/AddLogSignedSubmissionRequestDTO';
import { AddLogConfirmNewAssetsRequestDTO } from '../dto/input/AddLogConfirmNewAssetsRequestDTO';
import { AddDocsSignedSubmissionRequestDTO } from '../dto/input/AddDocsSignedSubmissionRequestDTO';
import { AddDocsConfirmNewAssetsRequestDTO } from '../dto/input/AddDocsConfirmNewAssetsRequestDTO';
import { AuthService } from './auth/auth.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserLoginDto } from './auth/user.login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class OrbitDbController {
  constructor(
    private orbitDbService: OrbitDbService,
    private readonly authService: AuthService,
  ) {}

  @Post('/login')
  @ApiOperation({
    summary: 'Api for auth user',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  login(@Body() userLoginDto: UserLoginDto) {
    return this.authService.login(userLoginDto.login, userLoginDto.password);
  }

  @Get('/names')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getNames(): Promise<GetNamesResponseDTO> {
    return this.orbitDbService.getNames();
  }

  @Post('/addSignedSubmission')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addSignedSubmission(
    @Body() body: AddSignedSubmissionRequestDTO,
  ): Promise<AddSignedSubmissionResponseDTO> {
    return this.orbitDbService.addSignedSubmission(
      body.submissionId,
      body.signature,
      body.sendEvent,
    );
  }

  @Post('/addLogSignedSubmission')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addLogSignedSubmission(
    @Body() body: AddLogSignedSubmissionRequestDTO,
  ): Promise<string> {
    return this.orbitDbService.addLogSignedSubmission(
      body.submissionId,
      body.signature,
      body.sendEvent,
    );
  }

  @Post('/addLogConfirmNewAssets')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addLogConfirmNewAssets(
    @Body() body: AddLogConfirmNewAssetsRequestDTO,
  ): Promise<string> {
    return this.orbitDbService.addLogConfirmNewAssets(
      body.deployId,
      body.signature,
      body.sendEvent,
    );
  }

  @Post('/addDocsSignedSubmission')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addDocsSignedSubmission(
    @Body() body: AddDocsSignedSubmissionRequestDTO,
  ): Promise<string> {
    return this.orbitDbService.addDocsSignedSubmission(
      body.submissionId,
      body.signature,
      body.sendEvent,
    );
  }

  @Post('/addDocsConfirmNewAssets')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  addDocsConfirmNewAssets(
    @Body() body: AddDocsConfirmNewAssetsRequestDTO,
  ): Promise<string> {
    return this.orbitDbService.addDocsConfirmNewAssets(
      body.deployId,
      body.signature,
      body.sendEvent,
    );
  }
}

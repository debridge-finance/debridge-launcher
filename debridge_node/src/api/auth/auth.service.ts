import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService, private readonly jwtServices: JwtService) {}

  login(login: string, password: string) {
    this.logger.verbose(`Authorization ${login} is started`);

    const res = login === this.configService.get('API_LOGIN') && password === this.configService.get('API_PASSWORD');
    this.logger.verbose(`Authorization ${login} is finished with ${res}`);

    if (res) {
      return {
        jwt: this.jwtServices.sign({ login }),
      };
    }

    throw new UnauthorizedException();
  }
}

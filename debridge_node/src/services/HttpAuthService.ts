import { lastValueFrom } from 'rxjs';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

export class HttpAuthService {
  private accessToken: string;

  constructor(
    readonly httpService: HttpService,
    readonly logger: Logger,
    readonly basicUrl: string,
    readonly loginApi: string,
    readonly loginDto?: any,
  ) {}

  protected async authRequest<T>(api: string, requestBody: T, loginDto?: any) {
    if (!this.accessToken) {
      this.accessToken = await this.getAuthToken(loginDto);
    }
    let httpResult;
    try {
      httpResult = await this.request(api, requestBody, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (e) {
      const response = e.response;
      if (response?.status === 401) {
        this.accessToken = await this.getAuthToken(loginDto);
        httpResult = await this.request(api, requestBody, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      }
    }
    return httpResult;
  }

  private async request<T>(api: string, requestBody: T, configs: RequestConfig) {
    const url = `${this.basicUrl}${api}`;
    let httpResult;
    try {
      httpResult = await lastValueFrom(this.httpService.post(`${this.basicUrl}${api}`, requestBody, configs));
    } catch (e) {
      const response = e.response;
      this.logger.error(
        `Error request to ${url} (status: ${response?.status}, message: ${response?.statusText}, data: ${JSON.stringify(response?.data)})`,
      );
      throw e;
    }
    return httpResult;
  }

  private async getAuthToken(loginDto?: any) {
    this.logger.debug('Getting auth token is started');
    const url = `${this.basicUrl}${this.loginApi}`;
    const requestBody = loginDto || this.loginDto;
    let accessToken = '';
    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, requestBody));
      accessToken = httpResult.data.accessToken;
      this.logger.debug('Getting auth token is finished');
    } catch (e) {
      const response = e.response;
      this.logger.error(
        `Error in getting auth token from ${url} (status: ${response?.status}, message: ${response?.statusText}, data: ${JSON.stringify(
          response?.data,
        )})`,
      );
      throw new Error(`Error in getting auth token`);
    }
    return accessToken;
  }
}

interface RequestConfig {
  headers: {
    Authorization: string;
  };
}

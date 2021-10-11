import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';

@Injectable()
export class DebrdigeApiService {
    private readonly logger = new Logger(DebrdigeApiService.name);

    async init() {
        this.logger.log(`DebrdigeApiService init`);
    }

    async uploadToApi(submissions: SubmissionEntity[]): Promise<string[]> {
        this.logger.log(`uploadToApi`);
        // TODO: create post reqeust to debridge API service
        return [];
    }
}

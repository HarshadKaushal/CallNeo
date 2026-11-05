import { Controller,Delete,Get,Param,ParseUUIDPipe } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service.js';

@Controller('mediasoup')
export class MediasoupController {
  constructor(private readonly mediasoup: MediasoupService) {}

  // GET /mediasoup/health
  @Get('health')
  health() {
    return this.mediasoup.getStats();
  }
}
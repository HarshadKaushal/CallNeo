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

  // GET /mediasoup/rooms/:roomId/rtp-capabilities
  @Get('rooms/:roomId/rtp-capabilities')
  async rtpCapabilities(@Param('roomId', ParseUUIDPipe) roomId: string) {
    const router = await this.mediasoup.getOrCreateRouter(roomId);
    return { routerId: router.id, rtpCapabilities: router.rtpCapabilities };
  }

  // DELETE /mediasoup/rooms/:roomId/router
  @Delete('rooms/:roomId/router')
  close(@Param('roomId', ParseUUIDPipe) roomId: string) {
    this.mediasoup.closeRouter(roomId);
    return { ok: true };
  }
}
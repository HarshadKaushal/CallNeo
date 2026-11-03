import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service.js';
import { MediasoupController } from './mediasoup.controller.js';

@Module({
    controllers:[MediasoupController],
    providers:[MediasoupService],
    exports:[MediasoupService],
})
export class MediasoupModule {}


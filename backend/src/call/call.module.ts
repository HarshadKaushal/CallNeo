import { Module } from '@nestjs/common';
  import { MediasoupModule } from '../mediasoup/mediasoup.module.js';
  import { RoomModule } from '../Rooms/room.module.js';
  import { CallGateway } from './call.gateway.js';

  @Module({
    imports: [RoomModule, MediasoupModule],
    providers: [CallGateway],
  })
  export class CallModule {}
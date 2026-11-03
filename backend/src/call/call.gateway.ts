import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import { RoomService } from '../Rooms/room.service.js';
import { JoinCallDto } from './dto/join-call.dto.js';
import { ConnectTransportDto, ConsumeDto, CreateTransportDto, ProduceDto, ResumeConsumerDto } from './dto/media.dto.js';

//this function basically catches the error from the server that the browser expects to see
//if we dont catch the error it will propogate to the WsException handling.
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000'] },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new WsException({
        status: 'error',
        message: errors.flatMap((error) => Object.values(error.constraints ?? {})),
      }),
  }),
)
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CallGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly rooms: RoomService,
    private readonly mediasoup: MediasoupService,
  ) { }

  handleConnection(socket: Socket) {
    this.logger.log(`socket ${socket.id} connected`);
  } // there is where jwt will be checked later 

  @SubscribeMessage('join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinCallDto) {
    if (socket.data.roomId) {
      return { ok: false, error: 'This connection is already in a room' };
    }

    const allowed = await this.rooms.isParticipant(body.roomId, body.userId);
    if (!allowed) {
      return { ok: false, error: 'You are not a participant of this room' };
    }

    const router = await this.mediasoup.getOrCreateRouter(body.roomId);

    socket.data.roomId = body.roomId;
    socket.data.userId = body.userId;

    const others = await this.server.in(body.roomId).fetchSockets();
    await socket.join(body.roomId);

    socket.to(body.roomId).emit('peer-joined', {
      socketId: socket.id,
      userId: body.userId,
    });
    this.logger.log(`user ${body.userId} joined room ${body.roomId} (socket ${socket.id})`);

    return {
      ok: true,
      rtpCapabilities: router.rtpCapabilities,
      peers: others.map((peer) => ({ socketId: peer.id, userId: peer.data.userId })),
      producers: this.mediasoup.getProducers(body.roomId,socket.id),
    };
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() socket: Socket) {
    await this.leaveRoom(socket);
    return { ok: true };
  }

  async handleDisconnect(socket: Socket) {
    this.logger.log(`socket ${socket.id} disconnected`);
    await this.leaveRoom(socket);
  }

  private async leaveRoom(socket: Socket) {
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) {
      return;
    }
    this.mediasoup.closePeer(socket.id);
    socket.to(roomId).emit('peer-left', {
      socketId: socket.id,
      userId: socket.data.userId,
    });
    await socket.leave(roomId);
    socket.data.roomId = undefined;
    socket.data.userId = undefined;

    const remaining = await this.server.in(roomId).fetchSockets();
    if (remaining.length === 0) {
      this.mediasoup.closeRouter(roomId);
    }
  }

  @SubscribeMessage('create-transport')
  async createTransport(@ConnectedSocket() socket: Socket, @MessageBody() body: CreateTransportDto) {
    const roomId: string | undefined = socket.data.roomId;//saved when joined, the browser never sends the roomid again saved by the server only
    if (!roomId) {
      return { ok: false, error: 'Join a room first' }
    }
    try {
      const transport = await this.mediasoup.createWebRtcTransport(roomId, socket.id, body.direction);
      //the 4 things mediasoup-client needs to build its side.
      return {
        ok: true,
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    }
    catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  @SubscribeMessage('connect-transport')
  async connectTransport(@ConnectedSocket() socket: Socket, @MessageBody() body: ConnectTransportDto) {
    try {
      await this.mediasoup.connectTransport(socket.id, body.transportId, body.dtlsParameters);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  @SubscribeMessage('produce')
  async produce(@ConnectedSocket() socket: Socket, @MessageBody() body: ProduceDto) {
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) {
      return { ok: false, error: 'Join a room first' }
    }
    try {
      const producer = await this.mediasoup.produce(socket.id, body.transportId, body.kind, body.rtpParameters);
      socket.to(roomId).emit('new-producer', {
        producerId: producer.id,
        socketId: socket.id,
        userId: socket.data.userId,
        kind: producer.kind,
      });

      return { ok: true, id: producer.id };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  @SubscribeMessage('consume')
  async consume(@ConnectedSocket() socket: Socket, @MessageBody() body: ConsumeDto) {
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) {
      return { ok: false, error: 'Join a room first' }
    }
    try {
      const consumer = await this.mediasoup.consume(socket.id, body.transportId, body.producerId, body.rtpCapabilities);
      function handleProducerClose() {
        const data = {
          consumerId: consumer.id,
          producerId: consumer.producerId,
        };

        socket.emit('consumer-closed', data);
      }
      consumer.on('producerclose', handleProducerClose);

      return {
        ok: true,
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      }
    }
    catch (error) {
      return {ok:false, error: errorMessage(error)};
    }
  }

  @SubscribeMessage('resume-consumer')
  async resumeConsumer(@ConnectedSocket() socket: Socket, @MessageBody() Body: ResumeConsumerDto) {
    try{
      await this.mediasoup.resumeConsumer(socket.id,Body.consumerId);
      return {ok:true};
    }
    catch(error){
      return {ok:false,error: errorMessage(error)};
    }
  }
}
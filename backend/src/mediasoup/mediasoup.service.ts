import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type { types } from 'mediasoup';
import {
    workerSettings,
    mediaCodecs,
    RoomRouterAppData,
    TransportAppData,
    TransportDirection,
    webRtcTransportOptions,
    PeerAppData
} from './mediasoup.config.js';

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MediasoupService.name);
    private worker: types.Worker; // this will hold the worker after it starts 
    private readonly routers = new Map<string, types.Router<RoomRouterAppData>>();
    private readonly pendingRouters = new Map<string, Promise<types.Router<RoomRouterAppData>>>();
    private readonly transports = new Map<string, types.WebRtcTransport<TransportAppData>>();
    private readonly producers = new Map<string, types.Producer<PeerAppData>>();
    private readonly consumers = new Map<string, types.Consumer<PeerAppData>>();

    async onModuleInit() {
        this.worker = await mediasoup.createWorker(workerSettings);
        this.logger.log(`mediasoup ${mediasoup.version} worker started (pid ${this.worker.pid})`);

        this.worker.on('died', (error) => {
            this.logger.error(`mediasoup worker died: ${error.message}`);
            setTimeout(() => process.exit(1), 2000);
        });
    }

    onModuleDestroy() {
        this.worker?.close();
    }

    async getOrCreateRouter(roomId: string): Promise<types.Router<RoomRouterAppData>> {
        //checks whether router is already created.
        const existing = this.routers.get(roomId);
        if (existing) {
            return existing;
        }
        //checks whether the router is in middle of creation
        const pending = this.pendingRouters.get(roomId);
        if (pending) {
            return pending;
        }

        const creating = this.worker
            .createRouter<RoomRouterAppData>({ mediaCodecs, appData: { roomId } })
            .then((router) => {
                this.routers.set(roomId, router);
                router.observer.once('close', () => {
                    this.routers.delete(roomId);
                    this.logger.log(`router closed for room ${roomId}`);
                });
                this.logger.log(`router ${router.id} created for room ${roomId}`);
                return router;
            })
            .finally(() => {
                this.pendingRouters.delete(roomId);
            }); //without a cleanup a failed creation could have handing promise

        this.pendingRouters.set(roomId, creating);
        return creating;
    }

    getRouter(roomId: string): types.Router<RoomRouterAppData> | undefined {
        return this.routers.get(roomId);
    }

    closeRouter(roomId: string): void {
        this.routers.get(roomId)?.close();
    }

    async createWebRtcTransport(roomId: string, socketId: string, direction: TransportDirection) {
        const router = this.routers.get(roomId);
        if (!router) {
            throw new Error('This room has no router');
        }

        //transport stores the roomid,socketid,direction direction will be used later.
        const transport = await router.createWebRtcTransport<TransportAppData>(
            webRtcTransportOptions({ roomId, socketId, direction }),
        );

        this.transports.set(transport.id, transport);
        transport.observer.once('close', () => {
            this.transports.delete(transport.id);
        });

        this.logger.log(`${direction} transport ${transport.id} created for socket ${socketId}`);
        return transport;
    }

    async connectTransport(socketId: string, transportId: string, dtlsParameters: types.DtlsParameters) {
        const transport = this.getOwnTransport(socketId, transportId);//tansport id is sent by the browser so servers checks whether it belongs to the the socket or not 
        await transport.connect({ dtlsParameters });
    }

    closePeer(socketId: string): void {
        for (const transport of [...this.transports.values()]) {
            if (transport.appData.socketId === socketId) {
                transport.close();
            }
        }
    }

    async produce(
        socketId: string,
        transportId: string,
        kind: types.MediaKind,
        rtpParameters: types.RtpParameters,
    ) {
        const transport = this.getOwnTransport(socketId, transportId);
        if (transport.appData.direction !== 'send') {
            throw new Error('Produce needs a send transport');
        }

        const producer = await transport.produce<PeerAppData>({
            kind, //audio or video
            rtpParameters, //built by mediasoupclient in the browser (not setup yet) from the real mic and camera track. it is checked by the server for codec if the router doesnt have this codec it will be rejected
            appData: { roomId: transport.appData.roomId, socketId },
        });

        this.producers.set(producer.id, producer);
        producer.observer.once('close', () => {
            this.producers.delete(producer.id);
        });

        this.logger.log(`${kind} producer ${producer.id} created for socket ${socketId}`);
        return producer;
    }

    async consume(
        socketId: string,
        transportId: string,
        producerId: string,
        rtpCapabilities: types.RtpCapabilities,
    ) {
        const transport = this.getOwnTransport(socketId, transportId);
        if (transport.appData.direction !== 'recv') {
            throw new Error('Consume needs a recv transport');
        }
        const roomId = transport.appData.roomId;
        const producer = this.producers.get(producerId);
        if (!producer || producer.appData.roomId !== roomId) {
            throw new Error('Producer not found in this room');
        }

        const router = this.routers.get(roomId);
        if (!router || !router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Your device cannot recieve this producer');
        }

        const consumer = await transport.consume<PeerAppData>({
            producerId,
            rtpCapabilities,
            paused: true,
            appData: { roomId, socketId },
        })

        this.consumers.set(consumer.id, consumer);
        consumer.observer.once('close', () => {
            this.consumers.delete(consumer.id);
        });
        return consumer;
    }

    async resumeConsumer(socketId: string, consumerId: string) {
        const consumer = this.consumers.get(consumerId);
        if (!consumer || consumer.appData.socketId !== socketId) {
            throw new Error('Consumer not found');
        }
        await consumer.resume();
    }

    getProducers(roomId: string, exceptSocketId: string) {

        const result = [];
    
        for (const producer of this.producers.values()) {
    
            // Check whether producer belongs to the requested room
            if (producer.appData.roomId !== roomId) {
                continue;
            }
    
            // Skip the current user's producers
            if (producer.appData.socketId === exceptSocketId) {
                continue;
            }
    
            // Add the required producer information
            result.push({
                producerId: producer.id,
                socketId: producer.appData.socketId,
                kind: producer.kind,
            });
        }
    
        return result;
    }

    private getOwnTransport(socketId: string, transportId: string) {
        const transport = this.transports.get(transportId);
        if (!transport || transport.appData.socketId !== socketId) {
            throw new Error('Transport not found');//the error message remains this to prevent attackers from getting further information.
        }
        return transport;
    }

    getStats() {
        return {
            workerPid: this.worker.pid,
            workerClosed: this.worker.closed,
            routerCount: this.routers.size,
            roomIds: [...this.routers.keys()],
            transportCount: this.transports.size,
            producerCount: this.producers.size,
            consumerCount: this.consumers.size,
        };
    }

}
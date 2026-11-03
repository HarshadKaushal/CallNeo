import { types } from 'mediasoup';

export const workerSettings: types.WorkerSettings = {
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
};

export const mediaCodecs: types.RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];

export type RoomRouterAppData = { 
  roomId: string;
}

export type TransportDirection = 'send' | 'recv';

export type PeerAppData = {
  roomId: string;
  socketId: string;
};

export type TransportAppData = PeerAppData & {
  direction: TransportDirection;
};


export function webRtcTransportOptions(
  appData: TransportAppData,
): types.WebRtcTransportOptions<TransportAppData> {
  const announcedAddress = '127.0.0.1'; //env file process.....later when env variable is created 
  const portRange = { min:4000, max:40100 };

  return {
    listenInfos: [
      {protocol: 'udp', ip:'0.0.0.0', announcedAddress, portRange}, //ip 0.0.0.0 listens on every network card on this pc 
      {protocol: 'tcp', ip:'0.0.0.0', announcedAddress, portRange},
    ],
    preferUdp:true,
    appData,
  };
}

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { Device } from 'mediasoup-client'
import type { types } from 'mediasoup-client'
import Player from './Player'
import { errorText, API_URL } from './api'
import type { Room, User } from './types'


type CallProps = {
    room: Room,
    user: User,
    onLeave: () => void
}

type Peer = {
    socketId: string,
    userId: string
}
//remoteTracks is the list and each item in that list holds a MediaStream 
//that is how this component remembers which stream belongs to whom.
//consumed media of other participants to show their tiles 
type RemoteTrack = {
    consumerId: string
    socketId: string
    kind: 'audio' | 'video'
    stream: MediaStream
}

// here we are using emitwithack because we expect a reply from the backend and the backend needs time to acknowledge the event
async function ack(socket: Socket, event: string, data: object) {
    const reply = await socket.timeout(5000).emitWithAck(event, data);

    if (!reply.ok) {
        throw new Error(reply.error);
    }

    return reply;
}

export default function Call({ room, user, onLeave }: CallProps) {
    const [error, setError] = useState('')
    const [peers, setPeers] = useState<Peer[]>([])
    const [remoteTracks, setRemoteTracks] = useState<RemoteTrack[]>([]) //keeps track of all audio video stream recieved from other participants 
    const [status, setStatus] = useState('Joining...')
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [micOn, setMicOn] = useState(true)
    const [camOn, setCamOn] = useState(true)

    useEffect(() => {

        // first we need to think about the cleanup as we dont want the camera to be staying on even though the user has left the page
        let cancelled = false;

        // attempts to establish a connection to server for signaling communication
        const socket = io(API_URL)

        // here the device will represent the clients capabilities for communicating with a mediasoup server
        // such as rtp codecs
        // mediaCapabilites and how the client can communicate
        const device = new Device();

        // sending and recieving the local audio/video streams to/from the mediasoup server
        let sendTransport: types.Transport | null = null
        let recvTransport: types.Transport | null = null

        // mediastream is a browser webapi
        // requests for permission to access the mic and cam
        let myStream: MediaStream | null = null

        //this will store all the consumer created by this browser 
        const consumers = new Map<string, types.Consumer>()
        //this stores the producer id that we already consumed 
        //prevents consuming the same producer twice 
        const consumedProducers = new Set<string>();
        //waiting array before transports setup, this will store any media
        const waitingProducers: {
            producerId: string
            socketId: string
        }[] = []


        // only handle this error if cancelled is still active
        function showError(err: unknown) {
            if (!cancelled) {
                setError(errorText(err));
            }
        }
        //asks backend to create consumer and creates corresponding browser consumer - stores it in our map
        //creates a mediastream adds that stream to remotetracks asks the server to resume consumer
        async function consume(producerId: string, socketId: string) {

            const transport = recvTransport;

            if (!transport || consumedProducers.has(producerId)) {
                return
            }

            consumedProducers.add(producerId)

            //ask the backend to create consumerId
            const data = await ack(socket, 'consume', {
                transportId: transport.id,
                producerId: producerId,
                rtpCapabilities: device.recvRtpCapabilities,
            })

            //create the browser side consumer 
            const consumer = await transport.consume(data)
            //storing the consumer in consumers map
            consumers.set(consumer.id, consumer)

            setRemoteTracks((old) => [
                ...old,
                {
                    consumerId: consumer.id,
                    socketId: socketId,
                    kind: consumer.kind,
                    stream: new MediaStream([consumer.track]), //we wrap consumer.track 
                    //inside a mediastream here because player component expects mediastream
                },
            ])
            //server made the consumer paused, now we are ready to start it 
            await ack(socket, 'resume-consumer', { consumerId: consumer.id })

        }

        // socket.on is basically listening for an event from the server named peer-joined
        // this callback will revieve and objec called peer and then we update the peer state
        socket.on('peer-joined', (peer: Peer) => {
            setPeers((old) => [...old, peer])
        })

        socket.on('peer-left', (peer: Peer) => {

            // Get the existing particiapants first
            setPeers((oldPeers) => {

                // keep everyone except the one who left
                const updatedPeers = oldPeers.filter((existingPeer) => {
                    return existingPeer.socketId !== peer.socketId
                })

                return updatedPeers
            })

            // get the existing remote tracks
            // remoteTacks are basically the audio/video streams recieved from the other people
            // and whenever a user leaves we must delete their tracks as well
            setRemoteTracks((oldTrack) => {

                // keep only tracks that dont belong to the person who left
                const updatedTracks = oldTrack.filter((track) => {
                    return track.socketId !== peer.socketId;
                });

                return updatedTracks
            })
        })

        socket.on('new-producer', (producer: { producerId: string; socketId: string }) => {
            if (!recvTransport) {
                waitingProducers.push(producer)
                return
            }
            consume(producer.producerId, producer.socketId).catch(showError)
        })

        socket.on('consumer-closed', (data: { consumerId: string }) => {
            consumers.get(data.consumerId)?.close()
            consumers.delete(data.consumerId)
            setRemoteTracks((old) => old.filter((t) => t.consumerId !== data.consumerId))
        })

        async function start() {

            // first function is join the room.
            const joined = await ack(socket, 'join', {
                roomId: room.id,
                userId: user.id
            });

            if (cancelled) return;

            setPeers(joined.peers);

            // second load the device
            await device.load({
                routerRtpCapabilities: joined.rtpCapabilities
            });

            if (cancelled) return;
            //creating the recieve transport 
            const recvParams = await ack(socket, 'create-transport', { direction: 'recv' })
            if (cancelled) return;

            //this will create the corresponding client side transport after the response from the backend in recvParams 
            const recv = device.createRecvTransport(recvParams)
            //we are telling mediasoup-client to listen for the transports connection request
            //this runs right after the line 109 transport.consume for the very first consumer
            recv.on('connect', ({ dtlsParameters }, callback, errorback) => {
                ack(socket, 'connect-transport', {
                    transportId: recv.id,
                    dtlsParameters: dtlsParameters,
                })
                    //callback method tells mediasoup that the connection succeded
                    .then(() => callback())
                    //for failure
                    .catch(errorback)
            })
            //save the transport so consume() and cleanup can access it
            recvTransport = recv;

            //consume what was already in the room if we joined late or setup was late 
            const toConsume = [...joined.producers, ...waitingProducers]
            for (const producer of toConsume) {
                await consume(producer.producerId, producer.socketId).catch(showError)
            }

            //send transport here...
            //the browser's persmission may take a while popup can take a while so basically this tells users to wait 
            setStatus('starting mic and camera')
            const sendParams = await ack(socket, 'create-transport', { direction: 'send' })
            if (cancelled) return;

            const send = device.createSendTransport(sendParams)
            send.on('connect', ({ dtlsParameters }, callback, errorback) => {
                ack(socket, 'connect-transport', {
                    transportId: send.id,
                    dtlsParameters: dtlsParameters,
                })
                    //callback method tells mediasoup that the connection succeded
                    .then(() => callback())
                    //for failure
                    .catch(errorback)
            })

            send.on('produce', ({ kind, rtpParameters }, callback, errback) => {
                ack(socket, 'produce', { transportId: send.id, kind: kind, rtpParameters: rtpParameters })
                    //reply.id is the server's producer's id created by the mediasoup 
                    .then((reply) => callback({ id: reply.id }))
                    .catch(errback)
            })
            sendTransport = send

            //capture my local media  
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })

            //if the user lefts while the popup was forming by the browser stop it here 
            if (cancelled) {
                stream.getTracks().forEach((track) => track.stop())
                return
            }
            myStream = stream
            setLocalStream(stream)

            //stream.getTrack() return [audioTrack, videoTrack]
            //on the first iteration the track is the audio track and await send.produce({track}) sends it to mediasoup
            //on the second iteration the track is the video track and await send.produce({track}) sends it to mediasoup
            for (const track of stream.getTracks()) {
                await send.produce({ track })
            }
            //user doesnt have a webcam it would avoid the stream.getAudioTracks()[0] undefined error 
            //and crash send.produce()   
            //await send.produce({ track: stream.getAudioTracks()[0] })
            //await send.produce({ track: stream.getVideoTracks()[0] })

            setStatus('');

        }

        // start is an asynchronous operation so basically we catch the error if it happens in the middle of the async execution.
        // it catches that and hands it over to the error handling fn at top.
        start().catch(showError)

        // we also need a cleanup function for useeffect later 
        return () => {
            cancelled = true
            myStream?.getTracks().forEach((track) => track.stop())
            sendTransport?.close()
            recvTransport?.close()
            socket.disconnect()
        }
    }, [room.id, user.id])

    //the peers state contains the information about the participants(socketId and userId) 
    // so when displaying we need to show their name but the remotetrack only has only has socketId not userId so we use that to get the userID and slice it 
    function nameOf(socketId: string) {
        const peer = peers.find((p) => p.socketId === socketId)
        return peer ? 'user' + peer.userId.slice(0, 8) : 'something broke'
    }
    function toggleMic() {
        if (!localStream) return
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
            //changing true to false and false to true
            if(audioTrack.enabled == true){
                audioTrack.enabled = false;
            }else{
                audioTrack.enabled = true;
            }
            setMicOn(audioTrack.enabled)
        }
    }
    function toggleCam() {
        if (!localStream) return
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
            if(videoTrack.enabled == true){
                videoTrack.enabled = false;
            }else{
                videoTrack.enabled = true;
            }
            setCamOn(videoTrack.enabled)
        }
    }
    return (
        <main className="call">
            <h1>Room {room.roomCode}</h1>
            <p className="hint">
                {peers.length === 0
                    ? 'Nobody else is here yet. Share the code.'
                    : `${peers.length + 1} people in the call`}
            </p>
            {status && <p className="hint">{status}</p>}
            {error && <p className="error">{error}</p>}

            <div className="tiles">
                {localStream && (
                    <Player stream={localStream} kind="video" label={`${user.name} (you)`} muted />
                )}
                {remoteTracks.map((track) => (
                    <Player
                        key={track.consumerId}
                        stream={track.stream}
                        kind={track.kind}
                        label={nameOf(track.socketId)}
                    />
                ))}
            </div>

            <div className="controls">
                <button type="button" onClick={toggleMic} disabled={!localStream}>
                    {micOn ? 'Mute mic' : 'UnmuteMic'}
                </button>
                <button type="button" onClick={toggleCam} disabled={!localStream}>
                    {camOn ? 'Turn Off Camera' : 'Turn On Camera'}
                </button>
                <button type="button" onClick={onLeave}>
                    Leave
                </button>
            </div>
        </main>
    )
}
import { useEffect, useRef } from 'react'
type PlayerProps = {
    stream: MediaStream
    kind: 'audio' | 'video'
    label?: string
    muted?: boolean
}

export default function Player({ stream, kind, label, muted }: PlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)

    //srcObject cant be set in JSX like src, so we set it on the element here 
    useEffect(() => {
        if (kind === 'video' && videoRef.current) {
            videoRef.current.srcObject = stream
        }
        if (kind === 'audio' && audioRef.current) {
            audioRef.current.srcObject = stream
        }
    }, [stream, kind])

    if (kind === 'audio') {
        return <audio ref={audioRef} autoPlay />
    }

    return (
        <div className="tile">
            <video ref={videoRef} autoPlay playsInline muted={muted} />
            {label && <p className="hint">{label}</p>}
        </div>
    )
}
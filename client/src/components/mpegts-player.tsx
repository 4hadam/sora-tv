import { useEffect, useRef, useState } from "react"
import mpegts from "mpegts.js"

interface MpegTsPlayerProps {
    src: string
    autoPlay?: boolean
    muted?: boolean
}

export default function MpegTsPlayer({
    src,
    autoPlay = true,
    muted = false,
}: MpegTsPlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const playerRef = useRef<mpegts.Player | null>(null)
    const [unsupported, setUnsupported] = useState(false)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (!mpegts.getFeatureList().mseLivePlayback) {
            setUnsupported(true)
            return
        }

        setUnsupported(false)

        if (playerRef.current) {
            playerRef.current.destroy()
            playerRef.current = null
        }

        const player = mpegts.createPlayer(
            {
                type: "mpegts",
                isLive: true,
                url: src,
            },
            {
                enableStashBuffer: false,
                autoCleanupSourceBuffer: true,
                liveBufferLatencyChasing: true,
            }
        )

        player.attachMediaElement(video)
        player.load()

        if (muted) {
            video.muted = true
        }

        if (autoPlay) {
            video.play().catch(() => { })
        }

        playerRef.current = player

        return () => {
            if (playerRef.current) {
                playerRef.current.unload()
                playerRef.current.detachMediaElement()
                playerRef.current.destroy()
                playerRef.current = null
            }
        }
    }, [src, autoPlay, muted])

    if (unsupported) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm p-4 text-center">
                This browser does not support live MPEG-TS playback.
            </div>
        )
    }

    return (
        <video
            ref={videoRef}
            controls
            playsInline
            className="w-full h-full bg-black"
        />
    )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

interface HybridPlayerProps {
    src: string
    autoPlay?: boolean
    muted?: boolean
}

export default function HybridPlayer({
    src,
    autoPlay = true,
    muted = false,
}: HybridPlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const hlsRef = useRef<Hls | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        setError(null)
        setLoading(true)

        // Cleanup previous instance
        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        // Check if native HLS is supported (Safari)
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src
            video.addEventListener("loadeddata", () => setLoading(false))
            video.addEventListener("error", () => {
                setError("Stream unavailable")
                setLoading(false)
            })
            if (autoPlay) {
                video.play().catch(() => { })
            }
            return
        }

        // Use HLS.js for other browsers
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                // For IPTV streams
                xhrSetup: (xhr) => {
                    xhr.withCredentials = false
                }
            })

            hls.loadSource(src)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false)
                if (autoPlay) {
                    video.play().catch(() => { })
                }
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("HLS error:", data.type, data.details)
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Try to recover
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            setError("Stream unavailable")
                            setLoading(false)
                            break
                    }
                }
            })

            hlsRef.current = hls

            return () => {
                hls.destroy()
            }
        }

        // Fallback: try native video
        video.src = src
        video.addEventListener("loadeddata", () => setLoading(false))
        video.addEventListener("error", () => {
            setError("Your browser doesn't support this stream type")
            setLoading(false)
        })
        if (autoPlay) {
            video.play().catch(() => { })
        }

    }, [src, autoPlay])

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muted
        }
    }, [muted])

    return (
        <div className="relative w-full h-full bg-black">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm z-10">
                    {error}
                </div>
            )}
            <video
                ref={videoRef}
                controls
                playsInline
                muted={muted}
                className="w-full h-full"
            />
        </div>
    )
}

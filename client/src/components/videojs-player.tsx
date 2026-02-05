"use client"

import React, { useEffect, useRef } from "react"
import videojs from "video.js"
import Player from "video.js/dist/types/player"

// (هام) استيراد CSS الأساسي لـ Video.js
import "video.js/dist/video-js.css"

// (هام) استيراد محرك HLS/DASH (لإنشاء 'blob:')
import "@videojs/http-streaming"

interface VideoJsPlayerProps {
  src: string
  isLive: boolean
  autoPlay?: boolean
  muted?: boolean
  isMobile?: boolean 
}

const VideoJsPlayer: React.FC<VideoJsPlayerProps> = ({
  src,
  isLive,
  autoPlay = true,
  muted = false,
  isMobile = false, 
}) => {
  const videoNodeRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<Player | null>(null)

  // (1) 💡 التأثير الأول: لإنشاء المشغل وتدميره (مرة واحدة فقط)
  useEffect(() => {
    // نتأكد من عدم وجود مشغل حالي وأن العنصر موجود
    if (!playerRef.current && videoNodeRef.current) {
      const videoElement = videoNodeRef.current
      
      const options = {
        autoplay: autoPlay,
        muted: muted,
        controls: true,
        responsive: true,
        fluid: true, // 👈🔴 (التعديل) يجب أن تكون true دائماً
        liveui: isLive,
        controlBar: {
          progressControl: false, 
        },
        html5: {
          vhs: { 
            overrideNative: true,
            withCredentials: false 
          },
        },
        playsinline: true,
      }

      // تهيئة المشغل
      const player = videojs(videoElement, options, () => {
        // Player initialized
      })

      playerRef.current = player
    }

    // (2) 💡 دالة التنظيف: (تم حل مشكلة removeChild)
    return () => {
      const player = playerRef.current
      if (player && !player.isDisposed()) {
        // Cleanup Video.js player
        // player.dispose() // (مُعطل عن قصد)
        playerRef.current = null
      }
    }
  }, []) // 👈🔴 (التعديل) إزالة isMobile من الاعتماديات

  // (3) 💡 التأثير الثاني: لتحديث الخصائص (مثل تغيير القناة)
  useEffect(() => {
    const player = playerRef.current

    // نتأكد أن المشغل جاهز
    if (player && !player.isDisposed()) {
      
      const currentSrc = player.currentSrc() 
      
      if (currentSrc !== src) {
        
        let sourceType = "";
        if (src.endsWith('.m3u8')) {
          sourceType = "application/x-mpegURL"; // HLS
        } else if (src.endsWith('.mpd')) {
          sourceType = "application/dash+xml"; // DASH
        } else if (src.includes("easybroadcast.io")) {
          sourceType = "application/x-mpegURL"; 
        }

        player.src({
          src: src,
          type: sourceType 
        })
        
        if (autoPlay) {
          player.play()?.catch(() => {
            // Autoplay blocked
          });
        }
      }
      
      // تحديث الخصائص الأخرى
      player.autoplay(autoPlay || false)
      player.muted(muted || false)
    }
  }, [src, autoPlay, muted, isLive]) 

  return (
    <div data-vjs-player className="w-full h-full">
      <video
        ref={videoNodeRef}
        className="video-js vjs-big-play-centered vjs-fill vjs-theme-city"
      />
    </div>
  )
}

export default VideoJsPlayer
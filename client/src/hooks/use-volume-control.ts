import { useEffect, useState } from 'react'

const VOLUME_STORAGE_KEY = 'app_video_volume'
const DEFAULT_VOLUME = 0.8

export const useVolumeControl = () => {
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read volume level from localStorage on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY)
      if (savedVolume) {
        const parsedVolume = parseFloat(savedVolume)
        if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
          setVolume(parsedVolume)
        }
      }
      setIsHydrated(true)
    }
  }, [])

  // Save volume level to localStorage on change
  const updateVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOLUME_STORAGE_KEY, clampedVolume.toString())
    }
  }

  return {
    volume,
    updateVolume,
    isHydrated
  }
}

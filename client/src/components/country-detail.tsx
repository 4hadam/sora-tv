import { useState, useEffect, lazy, Suspense } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, X, Star } from "lucide-react"

// 🚀 Lazy-load video players — defers 969KB video.js bundle until user actually watches a stream
const VideoPlayer = lazy(() => import("@/components/video-player"))
const VideoJsPlayer = lazy(() => import("@/components/videojs-player"))

interface Channel {
  name: string;
  url: string;
}

interface CountryDetailProps {
  country: string
  channel: string
  onBack: () => void
  isMobile: boolean
  activeCategory: string
}

export default function CountryDetail({ country, channel, onBack, isMobile, activeCategory }: CountryDetailProps) {
  const [streamUrl, setStreamUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFavorited, setIsFavorited] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isYouTube, setIsYouTube] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setIsLandscape(false)
      return
    }

    const media = window.matchMedia("(orientation: landscape)")
    const update = () => setIsLandscape(media.matches)
    update()

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }

    media.addListener(update)
    return () => media.removeListener(update)
  }, [isMobile])

  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = isLandscape ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, isLandscape])

  useEffect(() => {
    if (!isMounted) return
    try {
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      const keyCountry = activeCategory !== "all-channels" && !country.startsWith('all-channels') ? activeCategory : country;
      const favoriteKey = `${keyCountry}:${channel}`
      setIsFavorited(favorites.includes(favoriteKey))
    } catch (error) {
      // Error loading favorites - ignored
    }
  }, [country, channel, isMounted, activeCategory])

  const toggleFavorite = () => {
    if (!isMounted) return
    try {
      const keyCountry = activeCategory !== "all-channels" && !country.startsWith('all-channels') ? activeCategory : country;
      const favoriteKey = `${keyCountry}:${channel}`
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      if (favorites.includes(favoriteKey)) {
        const updated = favorites.filter((fav: string) => fav !== favoriteKey)
        localStorage.setItem("favorites", JSON.stringify(updated))
        setIsFavorited(false)
      } else {
        favorites.push(favoriteKey)
        localStorage.setItem("favorites", JSON.stringify(favorites))
        setIsFavorited(true)
      }
    } catch (error) {
      // Error toggling favorite - ignored
    }
  }

  useEffect(() => {
    setLoading(true)
    setError("")
    setStreamUrl("")
    setIsYouTube(false)

    const fetchChannels = async () => {
      try {
        let channels: Channel[] = []
        let channelSource: string = country

        if (country && country !== "") {
          const res = await fetch(`/api/channels/${encodeURIComponent(country)}`)
          if (!res.ok) throw new Error(`API error ${res.status}`)
          channels = (await res.json()).channels
          channelSource = country
          // If not found in country channels and category is set, also check category
          if (activeCategory && activeCategory !== "all-channels") {
            const inCountry = channels.filter(Boolean).find((c) => c.name === channel)
            if (!inCountry) {
              const catRes = await fetch(`/api/channels-by-category?category=${encodeURIComponent(activeCategory)}`)
              if (catRes.ok) channels = (await catRes.json()).channels
              channelSource = activeCategory
            }
          }
        } else if (activeCategory && activeCategory !== "all-channels") {
          const res = await fetch(`/api/channels-by-category?category=${encodeURIComponent(activeCategory)}`)
          if (!res.ok) throw new Error(`API error ${res.status}`)
          channels = (await res.json()).channels
          channelSource = activeCategory
        }

        // Filter out any null/undefined entries to prevent crashes
        channels = channels.filter((c): c is Channel => c != null && typeof c.name === "string")

        const selectedChannel = channels.find((c) => c.name === channel)
        if (selectedChannel && selectedChannel.url) {
          const url = selectedChannel.url.trim()
          if (url.startsWith("http://") || url.startsWith("https://")) {

            if (url.includes("youtube.com") || url.includes("youtube-nocookie.com")) {
              setIsYouTube(true)
              setStreamUrl(url)
            } else {
              setIsYouTube(false)
              setStreamUrl(url)
            }
          } else {
            setError("Invalid stream URL format. Only HTTP/HTTPS streams are supported.")
          }
        } else {
          // Fallback: search across all countries
          const fallback = await fetch(`/api/channel-search?name=${encodeURIComponent(channel)}`)
          if (fallback.ok) {
            const data = await fallback.json()
            // Backwards compatibility: older API returned { url }
            const singleUrl = data.url?.trim()
            if (singleUrl && (singleUrl.startsWith("http://") || singleUrl.startsWith("https://"))) {
              if (singleUrl.includes("youtube.com") || singleUrl.includes("youtube-nocookie.com")) {
                setIsYouTube(true)
              } else {
                setIsYouTube(false)
              }
              setStreamUrl(singleUrl)
            } else if (Array.isArray(data.channels) && data.channels.length > 0) {
              // New API returns channels array; pick first match
              const first = data.channels[0]
              const url = first.url?.trim()
              if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                if (url.includes("youtube.com") || url.includes("youtube-nocookie.com")) {
                  setIsYouTube(true)
                } else {
                  setIsYouTube(false)
                }
                setStreamUrl(url)
              } else {
                setError(`Stream not found in database for ${channel}`)
              }
            } else {
              setError(`Stream not found in database for ${channel}`)
            }
          } else {
            setError(`Stream not found in database for ${channel} in ${channelSource}`)
          }
        }
      } catch (err) {
        setError("Failed to load stream list or channels: " + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchChannels()
  }, [country, channel, activeCategory])

  const playerShellClass = isMobile
    ? isLandscape
      ? "group w-full h-full bg-black"
      : "group relative w-full aspect-video bg-black"
    : "group relative w-[90%] sm:w-[85%] lg:w-[82%] max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-xl bg-black"

  const playerContent = (
    <div className={playerShellClass}>
        {loading ? (
          <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4" />
            <div className="text-slate-400">Loading stream...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <div className="text-red-400 mb-2 font-medium">Stream Error</div>
            <p className="text-sm text-slate-500 max-w-xs text-center">{error}</p>
          </div>
        ) : streamUrl ? (
          <Suspense fallback={
            <div className="flex items-center justify-center w-full h-full bg-black text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
            </div>
          }>
            {isYouTube ? (
              <VideoPlayer
                src={streamUrl}
                autoPlay
                muted={false}
                isMobile={isMobile}
              />
            ) : (
              <VideoJsPlayer
                src={streamUrl}
                isLive={true}
                autoPlay={true}
                muted={false}
                isMobile={isMobile}
              />
            )}
          </Suspense>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white">
            <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
            <div className="text-slate-400 mb-2 font-medium">Stream Unavailable</div>
            <p className="text-sm text-slate-600 max-w-xs">
              This channel is not currently available.
            </p>
          </div>
        )}

        {/* ⭐ أزرار المفضلة والإغلاق */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={toggleFavorite}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`w-5 h-5 transition-all ${isFavorited ? "fill-yellow-400 text-yellow-400" : "text-white"
                }`}
            />
          </button>
          <button
            onClick={onBack}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
  )

  if (isMobile && isLandscape) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
        {playerContent}
      </div>,
      document.body,
    )
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
      {playerContent}
    </div>
  )
}

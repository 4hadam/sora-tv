import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import TopNavbar from "@/components/top-navbar"
import MpegTsPlayer from "@/components/mpegts-player"
import { ArrowLeft, Tv2 } from "lucide-react"

interface FootballChannel {
    name: string
    url: string
    logo: string
    category: string
}

export default function Football() {
    const [, setLocation] = useLocation()
    const [channels, setChannels] = useState<FootballChannel[]>([])
    const [selected, setSelected] = useState<FootballChannel | null>(null)
    const [loading, setLoading] = useState(true)
    const [unavailable, setUnavailable] = useState(false)

    useEffect(() => {
        fetch("/api/football")
            .then(r => {
                if (r.status === 503) { setUnavailable(true); return null }
                return r.json()
            })
            .then(data => {
                if (data) setChannels(data.channels.map((ch: FootballChannel) => ({
                    ...ch,
                    url: `/api/stream?url=${encodeURIComponent(ch.url)}`
                })))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-[#0B0D11] text-white flex flex-col">
            <TopNavbar />
            <main className="flex-1 pt-16">
                <div className="px-4 sm:px-8 py-6 flex items-center gap-3 border-b border-white/5">
                    <button
                        onClick={() => setLocation("/")}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <span className="text-2xl">&#x26BD;</span>
                    <h1 className="text-xl font-bold text-white">Football Channels</h1>
                    <span className="text-xs text-white/40 ml-1 mt-1">{channels.length} channels</span>
                </div>

                {unavailable && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/40">
                        <Tv2 className="w-10 h-10" />
                        <p className="text-sm">Football channels are not configured yet.</p>
                    </div>
                )}

                {loading && !unavailable && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4 sm:p-8">
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && !unavailable && (
                    <div className="flex flex-col lg:flex-row gap-0">
                        <div className="flex-1 p-4 sm:p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {channels.map((ch) => (
                                    <button
                                        key={ch.name}
                                        onClick={() => setSelected(ch)}
                                        className={[
                                            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-center",
                                            selected?.name === ch.name
                                                ? "border-red-500/60 bg-red-500/10"
                                                : "border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10"
                                        ].join(" ")}
                                    >
                                        <img
                                            src={ch.logo}
                                            alt={ch.name}
                                            className="w-10 h-10 object-contain rounded"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                                        />
                                        <span className="text-xs text-white/80 leading-tight line-clamp-2">{ch.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selected && (
                            <div className="lg:w-[520px] xl:w-[620px] shrink-0 p-4 sm:p-6 lg:border-l border-white/5">
                                <div className="sticky top-20">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={selected.logo}
                                                alt={selected.name}
                                                className="w-7 h-7 object-contain rounded"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                                            />
                                            <span className="font-semibold text-sm">{selected.name}</span>
                                        </div>
                                        <button
                                            onClick={() => setSelected(null)}
                                            className="text-white/40 hover:text-white/80 transition text-lg leading-none"
                                        >?</button>
                                    </div>
                                    <div className="rounded-xl overflow-hidden bg-black aspect-video">
                                        <MpegTsPlayer
                                            key={selected.url}
                                            src={selected.url}
                                            autoPlay={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

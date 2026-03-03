import { useState } from "react"
import { ChevronDown, ChevronUp, Tv, Globe, Shield, HelpCircle } from "lucide-react"
import { Link } from "wouter"

interface FAQItem {
    question: string
    answer: string
}

const faqData: FAQItem[] = [
    {
        question: "What is Sora.tv?",
        answer:
            "Sora.tv is a free, browser-based platform for streaming live TV channels from around the world. Explore global news, sports, culture, and entertainment through an interactive 3D globe or a simple country list. No account, no signup, and zero ads — just instant access to thousands of live streams.",
    },
    {
        question: "How can I watch world TV channels for free?",
        answer:
            "Simply open Sora.tv, spin the 3D globe or browse the country list, pick a region, and tap any channel in the sidebar. We link directly to publicly available streams so you can start watching in seconds — completely free.",
    },
    {
        question: "Is Sora.tv free to use?",
        answer:
            "100% free. No subscription, no account, no hidden fees, and no ads. Just pick a channel and enjoy.",
    },
    {
        question: "What is IPTV?",
        answer:
            "IPTV (Internet Protocol Television) means delivering TV content over the internet rather than cable or satellite. Sora.tv aggregates publicly available IPTV streams, giving you access to local and international news, sports, movies, and more — from anywhere in the world.",
    },
    {
        question: "Where do the TV channels come from?",
        answer:
            "Our channel listings are sourced from the open-source IPTV community. We curate and verify streams to maintain the best possible quality and reliability. If you want to contribute or suggest new channels, you can reach out to the IPTV-org team on GitHub.",
    },
    {
        question: "Can I suggest a TV channel?",
        answer:
            "Of course! While we don't manage the full channel database ourselves, you can suggest channels to the IPTV-org community on GitHub. Their contributions help keep the lineup fresh and diverse for everyone.",
    },
    {
        question: "How often is the channel list updated?",
        answer:
            "The channel list is updated regularly thanks to the global IPTV community. New channels get added and broken links get removed on an ongoing basis, so you can always find something new.",
    },
    {
        question: "Is Sora.tv legal and safe?",
        answer:
            "Sora.tv only links to streams that are already publicly available on the internet — we don't host any video content ourselves. All connections use HTTPS for security. We do not use third-party trackers and we do not collect any personal data. See the About section for the full legal disclaimer.",
    },
    {
        question: "Why are some channels not available?",
        answer:
            "We maintain strict HTTPS requirements and only list channels that allow external embedding via their Cross-Origin Resource Sharing (CORS) settings. Channels that don't meet these standards are excluded to protect your security and privacy.",
    },
    {
        question: "Why is a channel not working?",
        answer:
            "Live streams can go offline temporarily due to server issues or scheduled maintenance. If a channel is down, try again later. If the problem persists, the IPTV-org team on GitHub is the best place to report it — they maintain the stream database.",
    },
    {
        question: "Are there geographic restrictions?",
        answer:
            "Some channels are licensed for specific regions and may not be accessible from all countries. Channels with geographic restrictions are marked with a lock icon.",
    },
    {
        question: "How does Sora.tv protect my privacy?",
        answer:
            "Your privacy matters to us. We do not collect, store, or share any personal information. There are no third-party trackers or analytics on Sora.tv. You can watch freely knowing your data stays entirely your own.",
    },
]

function FAQAccordion({ item, index }: { item: FAQItem; index: number }) {
    const [open, setOpen] = useState(false)

    return (
        <div
            className="border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20"
            style={{ background: open ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)" }}
        >
            <button
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none group"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                <span className="flex items-center gap-3">
                    <span className="text-xs font-mono text-yellow-500/60 w-5 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-white/90 group-hover:text-white transition-colors">
                        {item.question}
                    </span>
                </span>
                <span className="shrink-0 text-white/40 group-hover:text-white/70 transition-colors">
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
            </button>

            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-white/5">
                    <p className="text-sm sm:text-base text-white/60 leading-relaxed pl-8">{item.answer}</p>
                </div>
            )}
        </div>
    )
}

export default function FAQ() {
    return (
        <div className="min-h-screen bg-[#0B0D11] text-white">
            {/* Navbar */}
            <header className="fixed top-0 left-0 w-full z-50 bg-[#0B0D11] border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <a href="/" className="text-white font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                        sora<span className="text-red-500">.</span>tv
                    </a>
                    <nav className="flex items-center gap-6 text-sm text-white/50">
                        <Link href="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <span className="text-white/20">·</span>
                        <span className="text-white/80">FAQ</span>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <div className="pt-32 pb-12 px-4 sm:px-6 text-center">
                <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 text-xs text-yellow-400 mb-6">
                    <HelpCircle size={13} />
                    Frequently Asked Questions
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    How can we help?
                </h1>
                <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto">
                    Everything you need to know about watching free live TV on Sora.tv.
                </p>
            </div>

            {/* Stats bar */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-10">
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { icon: <Tv size={16} />, label: "Free forever", sub: "No subscription" },
                        { icon: <Globe size={16} />, label: "8,000+ channels", sub: "190+ countries" },
                        { icon: <Shield size={16} />, label: "100% private", sub: "No tracking" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center gap-1 bg-white/3 border border-white/8 rounded-xl py-4 px-3"
                        >
                            <span className="text-yellow-400/80">{stat.icon}</span>
                            <span className="text-xs sm:text-sm font-semibold text-white/90 text-center">{stat.label}</span>
                            <span className="text-xs text-white/40 text-center">{stat.sub}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ list */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 space-y-3">
                {faqData.map((item, i) => (
                    <FAQAccordion key={i} item={item} index={i} />
                ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 py-8 text-center text-xs text-white/25">
                <p>© {new Date().getFullYear()} Sora.tv — Watch live TV from anywhere, for free.</p>
            </div>
        </div>
    )
}

import { Lock, Link2, ShieldCheck, Eye, EyeOff, Star, RefreshCw, Globe, Mail } from "lucide-react"

interface PolicySection {
    icon: React.ReactNode
    title: string
    body: string
}

const sections: PolicySection[] = [
    {
        icon: <Lock size={18} />,
        title: "Introduction",
        body: "We understand how important privacy is. This policy outlines our practices — primarily that we don't collect personal data. By using Sora tv, you agree to these terms.",
    },
    {
        icon: <Link2 size={18} />,
        title: "Use of External Links",
        body: "Our links point to video streams hosted on external websites, which we believe are safe. However, their privacy policies may differ from ours. We recommend reviewing those sites' policies if you have any concerns.",
    },
    {
        icon: <ShieldCheck size={18} />,
        title: "Security",
        body: "We use HTTPS to encrypt and protect every connection. Your browsing and viewing activity on Sora tv is kept secure end-to-end.",
    },
    {
        icon: <EyeOff size={18} />,
        title: "No Personal Data Collection",
        body: "We never ask for personal information or track your activity. You can explore free live TV from anywhere in the world without creating an account or providing any personal details.",
    },
    {
        icon: <Eye size={18} />,
        title: "No Third-Party Trackers",
        body: "Sora tv has zero third-party trackers embedded. Your visits are completely unmonitored — we don't use analytics, ad networks, or any tracking pixels.",
    },
    {
        icon: <Star size={18} />,
        title: "Favorite Channels Storage",
        body: "Any channels you save as favorites are stored exclusively in your browser's local storage. We never receive or store this data on our servers. Your list persists between visits but is device-specific. You can clear favorites at any time through your browser settings.",
    },
    {
        icon: <Globe size={18} />,
        title: "Compliance with Data Protection",
        body: "Because Sora tv does not collect or process personal data, we naturally align with global privacy standards including GDPR and CCPA. Your privacy isn't just a policy — it's built into how the platform works.",
    },
    {
        icon: <RefreshCw size={18} />,
        title: "Policy Updates",
        body: "We may update this policy as Sora tv evolves. Any changes will be reflected on this page. We recommend checking back occasionally to stay informed.",
    },
    {
        icon: <Mail size={18} />,
        title: "Contact Us",
        body: "Have a question or concern about privacy? We're happy to help. Reach out to us and we'll respond as soon as possible.",
    },
]

export default function Privacy() {
    return (
        <div className="min-h-screen bg-[#0B0D11] text-white">
            {/* Navbar */}
            <header className="fixed top-0 left-0 w-full z-50 bg-[#0B0D11] border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <a href="/" className="text-white font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                        sora<span className="text-red-500">.</span>tv
                    </a>
                    <nav className="flex items-center gap-6 text-sm text-white/50">
                        <a href="/" className="hover:text-white transition-colors">
                            Home
                        </a>
                        <span className="text-white/20">·</span>
                        <a href="/faq" className="hover:text-white transition-colors">
                            FAQ
                        </a>
                        <span className="text-white/20">·</span>
                        <span className="text-white/80">Privacy</span>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <div className="pt-32 pb-12 px-4 sm:px-6 text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-xs text-green-400 mb-6">
                    <ShieldCheck size={13} />
                    Privacy Policy
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Your privacy, protected.
                </h1>
                <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto">
                    Sora tv is built from the ground up with privacy in mind. No tracking, no data collection, no compromises.
                </p>
                <p className="text-white/25 text-xs mt-4">
                    Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
            </div>

            {/* Highlight bar */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-10">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "No accounts", sub: "Ever" },
                        { label: "No trackers", sub: "Zero" },
                        { label: "No data stored", sub: "On our servers" },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="flex flex-col items-center gap-1 bg-green-500/5 border border-green-500/10 rounded-xl py-4 px-3"
                        >
                            <span className="text-xs sm:text-sm font-semibold text-white/90 text-center">{item.label}</span>
                            <span className="text-xs text-white/35 text-center">{item.sub}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Policy sections */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 space-y-4">
                {sections.map((section, i) => (
                    <div
                        key={i}
                        className="bg-white/2 border border-white/8 rounded-xl px-5 py-5 hover:border-white/15 transition-colors"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-green-400/80 shrink-0">{section.icon}</span>
                            <h2 className="text-sm sm:text-base font-semibold text-white/90">{section.title}</h2>
                        </div>
                        <p className="text-sm sm:text-base text-white/55 leading-relaxed pl-7">{section.body}</p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 py-8 text-center text-xs text-white/25 space-y-2">
                <p>© {new Date().getFullYear()} Sora tv — Watch live TV from anywhere, for free.</p>
                <p>
                    <a href="/faq" className="hover:text-white/50 transition-colors underline underline-offset-2">
                        FAQ
                    </a>
                    {" · "}
                    <a href="/privacy" className="hover:text-white/50 transition-colors underline underline-offset-2">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    )
}

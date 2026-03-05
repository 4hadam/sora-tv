"use client"

import { useState, useEffect, useRef } from "react"
import { Menu, X, History } from "lucide-react"

interface TopNavbarProps {
  onMenuClick?: () => void
  isMenuOpen?: boolean
  selectedCountry?: string | null
  onSelectChannel?: (channel: string, country?: string) => void
}

export default function TopNavbar({
  onMenuClick,
  isMenuOpen = false,
  selectedCountry = null,
  onSelectChannel,
}: TopNavbarProps) {

  // 🔴 تم حذف 'scrolled' لأن الخلفية أصبحت ثابتة
  // const [scrolled, setScrolled] = useState(false)
  // gradient reference works directly without full base URL in non-hash routing
  const tvFill = "url(#tvGradient)"

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<{ name: string; country: string }[]>([])
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem("soratv_history")
    if (stored) setHistory(JSON.parse(stored))
  }, [showHistory])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header
      // 🔴🔴🔴 التعديل هنا: تغيير الخلفية 🔴🔴🔴
      // تم تغيير 'bg-transparent' و 'bg-black/80' إلى 'bg-[#0B0D11]'
      // وتمت إزالة 'backdrop-blur-sm' و 'shadow-md'
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 bg-[#0B0D11]`}
    >
      <div className="relative px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        {/* ✨ Logo & Country (on the left) */}
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="flex items-center"
            aria-label="Home - Sora tv"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 480 140"
              role="img"
              aria-label="Sora tv logo Caros Soft Bold"
              // 🔴 تم حذف التعديل على 'scale' الخاص بـ 'scrolled'
              className={`h-14 w-auto transition-transform duration-500 hover:scale-105`}
            >
              {/* ... (باقي محتوى الشعار SVG) ... */}
              <desc>شعار Sora tv بخط Caros Soft Bold...</desc>
              <defs>
                <linearGradient id="tvGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FF4B2B" />
                  <stop offset="25%" stopColor="#FF7A2B" />
                  <stop offset="50%" stopColor="#FFD75A" />
                  <stop offset="70%" stopColor="#62E3C6" />
                  <stop offset="100%" stopColor="#27A9E1" />
                </linearGradient>
              </defs>
              <style>
                {`
                @font-face {
                  font-family: 'CarosSoft';
                  src: url('https://files.catbox.moe/9195h1.woff') format('woff');
                  font-weight: 700;
                  font-style: normal;
                  font-display: swap;
                }
                text {
                  font-family: 'CarosSoft', sans-serif;
                  font-weight: 700;
                  font-size: 48px;
                  letter-spacing: -0.4px;
                }
              `}
              </style>
              <text x="87.5" y="84" fill="#FFFFFF">sora</text>
              <circle cx="210" cy="73" r="7" fill="#FF4B2B" />
              <text x="219" y="84" fill={tvFill}>tv</text>
              <rect x="0" y="0" width="480" height="140" fill="transparent" />
            </svg>
          </a>
        </div>

        {/* Right side: menu button */}
        <div className="flex items-center gap-4">

          {/* 🕐 History Button */}
          <div className="relative flex items-center" ref={historyRef}>
            <button
              onClick={() => setShowHistory((p) => !p)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-white/80 focus:outline-none transition-colors"
              aria-label="Watch history"
            >
              <History size={22} />
            </button>

            {showHistory && (
              <div className="absolute right-0 top-10 w-72 bg-[#111318] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-white text-sm font-semibold">Recently Watched</span>
                  {history.length > 0 && (
                    <button
                      onClick={() => { localStorage.removeItem("soratv_history"); setHistory([]) }}
                      className="text-white/70 hover:text-white text-xs transition-colors px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="px-4 py-6 text-center text-white/60 text-sm">No history yet</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto custom-scroll">
                    {history.map((item, i) => (
                      <li key={i}>
                        <button
                          onClick={() => { onSelectChannel?.(item.name, item.country); setShowHistory(false) }}
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <History size={14} className="text-white/60 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{item.name}</p>
                            <p className="text-white/70 text-xs">{item.country}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onMenuClick}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

      </div>
    </header>
  )
}
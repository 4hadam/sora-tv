"use client"

import { Menu, X } from "lucide-react"

interface TopNavbarProps {
  onMenuClick?: () => void
  isMenuOpen?: boolean
  selectedCountry?: string | null
}

export default function TopNavbar({
  onMenuClick,
  isMenuOpen = false,
  selectedCountry = null,
}: TopNavbarProps) {

  // 🔴 تم حذف 'scrolled' لأن الخلفية أصبحت ثابتة
  // const [scrolled, setScrolled] = useState(false)
  // gradient reference works directly without full base URL in non-hash routing
  const tvFill = "url(#tvGradient)"

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

        {/* Right side: football link + menu button */}
        <div className="flex items-center gap-4">
          <a
            href="/football"
            className="hidden sm:flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition font-medium"
            aria-label="Football Channels"
          >
            <span>⚽</span>
            <span>Football</span>
          </a>
          <button
            onClick={onMenuClick}
            className="text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

      </div>
    </header>
  )
}
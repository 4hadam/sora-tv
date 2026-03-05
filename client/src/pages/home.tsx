import { useState, useEffect, lazy, Suspense, useRef, type ComponentType } from "react"
import { useLocation } from "wouter"
import TopNavbar from "@/components/top-navbar"
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device"
import { countryCodeMap } from "@/lib/country-flags"

// Globe viewer loaded manually (not via React.lazy) to avoid Vite modulepreload injection
type GlobeViewerType = ComponentType<{
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
}>

// 🚀 Lazy-load heavy components that import 1.7MB iptv-channels.ts
// This keeps the initial bundle lean and defers channel-data parsing to after first paint
const CountrySidebar = lazy(() => import("@/components/country-sidebar"))
const CountryDetail = lazy(() => import("@/components/country-detail"))

// CategorySidebar is tiny — keep static
import CategorySidebar from "@/components/CategorySidebar"

// CSS-only globe — shown on mobile (no Three.js loaded = TBT stays at 20ms)
// Also used as placeholder on desktop while globe.gl is loading
const GlobePlaceholder = ({ isMobile = false }: { isMobile?: boolean }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0D11] relative overflow-hidden select-none">
    {/* Outer glow ring */}
    <div style={{
      position: 'absolute',
      width: isMobile ? 320 : 280,
      height: isMobile ? 320 : 280,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 50%, transparent 48%, rgba(68,120,255,0.07) 52%, transparent 58%)',
      animation: 'pulse 3s ease-in-out infinite',
    }} />
    {/* Globe sphere */}
    <div style={{
      width: isMobile ? 280 : 240,
      height: isMobile ? 280 : 240,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 32%, #1b3d7a 0%, #0d1f45 45%, #060d1f 100%)',
      boxShadow: 'inset -12px -12px 40px rgba(0,0,0,0.7), inset 6px 6px 20px rgba(68,120,255,0.1), 0 0 80px rgba(40,80,200,0.12)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Latitude lines */}
      {[-55, -30, 0, 30, 55].map((pct) => (
        <div key={pct} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${50 + pct}%`, height: 1,
          background: 'rgba(80,140,255,0.14)',
        }} />
      ))}
      {/* Longitude lines (ellipses) */}
      {[20, 40, 60, 80].map((pct) => (
        <div key={pct} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${pct}%`, width: 1,
          background: 'rgba(80,140,255,0.14)',
        }} />
      ))}
      {/* Continent blobs */}
      <div style={{ position: 'absolute', top: '22%', left: '30%', width: '18%', height: '22%', borderRadius: '40% 60% 50% 50%', background: 'rgba(60,180,100,0.22)', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', top: '30%', left: '52%', width: '22%', height: '28%', borderRadius: '50% 40% 60% 45%', background: 'rgba(60,180,100,0.20)', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '20%', width: '16%', height: '20%', borderRadius: '45% 55% 40% 60%', background: 'rgba(60,180,100,0.18)', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', top: '48%', left: '55%', width: '12%', height: '18%', borderRadius: '50%', background: 'rgba(60,180,100,0.17)', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', top: '38%', left: '10%', width: '10%', height: '16%', borderRadius: '50%', background: 'rgba(60,180,100,0.16)', filter: 'blur(2px)' }} />
      {/* Atmosphere edge */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 70% 70%, transparent 55%, rgba(40,90,220,0.18) 75%, rgba(20,60,180,0.08) 90%)',
      }} />
      {/* Specular highlight */}
      <div style={{
        position: 'absolute', top: '8%', left: '18%',
        width: '28%', height: '22%', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)',
      }} />
    </div>
    {/* Mobile hint */}
    {isMobile && (
      <p style={{ marginTop: 28, color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: '0.02em' }}>
        Tap ☰ to explore channels
      </p>
    )}
  </div>
)

export default function Home() {
  const [location, setLocation] = useLocation()
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [GlobeViewer, setGlobeViewer] = useState<GlobeViewerType | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all-channels")
  const skipChannelReset = useRef(false)

  // ✅ Use optimized mobile detection hook
  const isMobile = useIsMobileDevice()

  useEffect(() => {
    const loadGlobe = () => {
      import("@/components/globe-viewer").then((mod) => {
        setGlobeViewer(() => mod.default)
      })
    }

    // Small delay so the page renders first, then load globe
    if (isMobile) {
      const t = setTimeout(loadGlobe, 500)
      return () => clearTimeout(t)
    } else if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(loadGlobe, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    } else {
      const t = setTimeout(loadGlobe, 300)
      return () => clearTimeout(t)
    }
  }, [isMobile])

  // Handle URL-based country selection
  useEffect(() => {
    const pathSegments = location.split("/").filter(Boolean)
    const countryCode = pathSegments[0]

    if (countryCode) {
      // Reverse lookup: find country name by code
      const countryName = Object.entries(countryCodeMap).find(
        ([_, code]) => code === countryCode.toLowerCase()
      )?.[0]

      if (countryName) {
        setSelectedCountry(countryName)
        setActiveCategory("all-channels")
        if (!skipChannelReset.current) setSelectedChannel(null)
        skipChannelReset.current = false
      }
    } else {
      setSelectedCountry(null)
    }
  }, [location])

  useEffect(() => {
    // عندما يتم تحديد دولة على الموبايل، افتح الـ sidebar تلقائياً
    if (isMobile && selectedCountry) {
      setMobileSidebarOpen(true)
    }
  }, [selectedCountry, isMobile])

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // GeoJSON ADMIN names → app country names
  const geoJsonAliases: Record<string, string> = {
    "United States of America": "United States",
    "Russian Federation": "Russia",
    "Iran (Islamic Republic of)": "Iran",
    "Syrian Arab Republic": "Syria",
    "Lao PDR": "Laos",
    "Korea, Republic of": "South Korea",
    "Korea, Democratic People's Republic of": "North Korea",
    "Bolivia (Plurinational State of)": "Bolivia",
    "Venezuela (Bolivarian Republic of)": "Venezuela",
    "Tanzania, United Republic of": "Tanzania",
    "Congo, Democratic Republic of the": "Congo",
    "Central African Rep.": "Central African Republic",
    "W. Sahara": "Western Sahara",
    "Dem. Rep. Congo": "Congo",
    "Dominican Rep.": "Dominican Republic",
    "Eq. Guinea": "Equatorial Guinea",
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    "S. Sudan": "South Sudan",
    "Czech Rep.": "Czech Republic",
    "Czechia": "Czech Republic",
    "Macedonia": "North Macedonia",
  }

  // 🎯 --- Event Handlers ---
  const handleGlobeCountryClick = (countryName: string) => {
    const resolvedName = geoJsonAliases[countryName] || countryName
    const countryCode = countryCodeMap[resolvedName]
    if (countryCode) {
      setLocation(`/${countryCode}`)
    }
  }

  const handleSelectCountry = (country: string | null) => {
    if (country) {
      const countryCode = countryCodeMap[country]
      if (countryCode) {
        setLocation(`/${countryCode}`)
      }
    } else {
      setLocation("/")
    }
    setSelectedChannel(null)
    setActiveCategory("all-channels")
    if (isMobile && !country) setMobileSidebarOpen(false)
  }

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category)
    setSelectedCountry(null)
    setSelectedChannel(null)
    setIsCategorySidebarOpen(false)

    if (isMobile && !mobileSidebarOpen) {
      setMobileSidebarOpen(true)
    }
  }

  const handleSelectChannel = (channel: string, fromCountry?: string) => {
    // If coming from history with a country, navigate there first
    if (fromCountry && fromCountry !== "all-channels" && fromCountry !== "Unknown") {
      const countryCode = countryCodeMap[fromCountry]
      if (countryCode) {
        skipChannelReset.current = true
        setSelectedCountry(fromCountry)
        setLocation(`/${countryCode}`)
      }
    }
    setSelectedChannel(channel)
    // Save to watch history
    const country = fromCountry || selectedCountry || activeCategory || "Unknown"
    const stored = localStorage.getItem("soratv_history")
    const hist: { name: string; country: string }[] = stored ? JSON.parse(stored) : []
    const updated = [{ name: channel, country }, ...hist.filter((h) => h.name !== channel)].slice(0, 30)
    localStorage.setItem("soratv_history", JSON.stringify(updated))
  }
  const handleBackFromPlayer = () => setSelectedChannel(null)
  const toggleMobileSidebar = () => {
    if (isMobile) setMobileSidebarOpen((prev) => !prev)
  }
  const toggleCategorySidebar = () => {
    setIsCategorySidebarOpen((prev) => !prev)
  }


  return (
    <div className="flex flex-col h-screen w-full bg-transparent text-white overflow-hidden">
      <TopNavbar
        onMenuClick={toggleCategorySidebar}
        isMenuOpen={isCategorySidebarOpen}
        selectedCountry={selectedCountry}
        onSelectChannel={handleSelectChannel}
      />

      <div className="flex-1 overflow-hidden relative">

        {/* 🌍 Globe Viewer */}
        <div className="absolute inset-0 z-10 sm:right-[320px] lg:right-[340px]">
          {GlobeViewer ? (
            <GlobeViewer
              selectedCountry={selectedCountry}
              onCountryClick={handleGlobeCountryClick}
              isMobile={isMobile}
            />
          ) : (
            <GlobePlaceholder isMobile={isMobile} />
          )}
        </div>

        {/* 📊 Stats Counter + Credits - Bottom Left (aria-hidden: decorative only) */}
        {!selectedChannel && (
          <div className="fixed bottom-5 left-5 z-50 pointer-events-none flex flex-col gap-1" aria-hidden="true">
            {/* Credits */}
            <div className="flex flex-col gap-0.5">
              <a href="https://iptv-org.github.io/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">⬡</span>
                <span className="text-blue-200/50 font-light">IPTV-org Database</span>
              </a>
              <a href="https://iptv-org.github.io/api/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">⬡</span>
                <span className="text-blue-200/50 font-light">IPTV-org API</span>
              </a>
              <a href="https://threejs.org/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">⬡</span>
                <span className="text-blue-200/50 font-light">Three.js</span>
              </a>
            </div>
            {/* Counter */}
            <div className="flex items-center gap-1">
              <span className="text-blue-200/70 font-light" style={{ fontSize: "10px" }}>153</span>
              <span className="text-blue-200/50 font-light" style={{ fontSize: "10px" }}>countries</span>
              <span className="text-blue-200/30 font-light mx-0.5" style={{ fontSize: "10px" }}>•</span>
              <span className="text-blue-200/70 font-light" style={{ fontSize: "10px" }}>9,022</span>
              <span className="text-blue-200/50 font-light" style={{ fontSize: "10px" }}>channels</span>
            </div>
          </div>
        )}
        {/* 🎥 Video Player (Desktop Only) */}
        {!isMobile && selectedChannel && (selectedCountry || activeCategory !== "all-channels") && (
          <div
            className="absolute top-0 bottom-0 z-30 flex items-center justify-center p-4 sm:p-8 
                      left-0 right-0 sm:right-[320px] lg:right-[340px]"
          >
            <Suspense fallback={null}>
              <CountryDetail
                country={selectedCountry ?? activeCategory}
                channel={selectedChannel}
                onBack={handleBackFromPlayer}
                isMobile={isMobile}
                activeCategory={activeCategory}
              />
            </Suspense>
          </div>
        )}

        {/* 🖥️ Desktop Sidebar (Countries - Right) */}
        {!isMobile && (
          <div
            className="absolute right-0 top-16 bottom-0 w-[320px] lg:w-[340px] z-20 bg-gray-900/90 backdrop-blur-md"
            role="complementary"
          >
            <Suspense fallback={null}>
              <CountrySidebar
                selectedCountry={selectedCountry}
                onSelectCountry={handleSelectCountry}
                onSelectChannel={handleSelectChannel}
                onClose={() => { }}
                externalSearch={searchQuery}
                currentTime={currentTime}
                isMobile={isMobile}
                activeCategory={activeCategory}
                selectedChannel={selectedChannel}
              />
            </Suspense>
          </div>
        )}

        {/* 📱 🖥️  Category Sidebar (All Sizes) */}
        <>
          <div
            className={`fixed top-16 left-0 bottom-0 z-40 w-64 bg-[#0B0D11] shadow-lg transform transition-transform duration-300 ease-in-out
              ${isCategorySidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <CategorySidebar
              activeCategory={activeCategory}
              onCategorySelect={handleCategorySelect}
              onClose={toggleCategorySidebar}
            />
          </div>
          {isCategorySidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30"
              onClick={toggleCategorySidebar}
            />
          )}
        </>


        {/* 📱 Mobile Sidebar (Channels) */}
        {isMobile && (
          <>
            <div
              className={`fixed left-0 right-0 z-20 bg-[#0B0D11] transition-transform duration-500 
                ${mobileSidebarOpen ? "translate-y-0" : "translate-y-full"} 
                top-16 bottom-0 flex flex-col`}
            >
              {selectedChannel && (
                // Note 1:
                <div className="w-full bg-black flex-shrink-0 relative">
                  <Suspense fallback={null}>
                    <CountryDetail
                      country={selectedCountry ?? activeCategory}
                      channel={selectedChannel}
                      onBack={handleBackFromPlayer}
                      isMobile={isMobile}
                      activeCategory={activeCategory}
                    />
                  </Suspense>
                </div>
              )}

              <div
                onClick={toggleMobileSidebar}
                className={`w-full flex items-center justify-center cursor-grab flex-shrink-0 ${selectedChannel ? 'py-0' : 'py-1.5' // Previous margin adjustment
                  }`}
                aria-label="Toggle sidebar"
              >
                <span className="w-12 h-1.5 bg-gray-700 rounded-full" />
              </div>

              {/* Note 2: Change h-[60%] to flex-1 */}
              <div className="flex-1 overflow-y-auto custom-scroll">
                <Suspense fallback={null}>
                  <CountrySidebar
                    selectedCountry={selectedCountry}
                    onSelectCountry={handleSelectCountry}
                    onSelectChannel={handleSelectChannel}
                    onClose={toggleMobileSidebar}
                    externalSearch={searchQuery}
                    currentTime={currentTime}
                    isMobile={isMobile}
                    activeCategory={activeCategory}
                    selectedChannel={selectedChannel}
                  />
                </Suspense>
              </div>
            </div>
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-10"
                onClick={toggleMobileSidebar}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
import { useState, useEffect, lazy, Suspense, useRef, useCallback, type ComponentType } from "react"
import { useLocation } from "wouter"
import TopNavbar from "@/components/top-navbar"
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device"
import { countryCodeMap } from "@/lib/country-flags"

// Globe viewer loaded manually (not via React.lazy) to avoid Vite modulepreload injection
type GlobeViewerType = ComponentType<{
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
  onReady?: () => void
}>

// ── CSS Globe Placeholder ─────────────────────────────────────────────────────
// Pure-CSS static globe — renders in 0 ms with zero main-thread blocking.
// Shown while globe.gl (Three.js / WebGL) initialises in the background.
function GlobePlaceholder({ onActivate }: { onActivate?: () => void }) {
  return (
    <div
      aria-hidden="true"
      onPointerDown={onActivate}
      style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden', cursor: 'default' }}
    >
      {/* Star field: a 1×1 px div with box-shadow dots */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 1, height: 1,
        boxShadow:
          '8vw 6vh 0 1px #aaccff, 22vw 14vh 0 1px #fff, 44vw 4vh 0 1px #ffeeaa,' +
          '68vw 11vh 0 1px #fff, 83vw 2vh 0 1px #aaccff, 92vw 19vh 0 1px #ffaabb,' +
          '4vw 33vh 0 1px #fff, 18vw 41vh 0 1px #aaffee, 37vw 29vh 0 1px #fff,' +
          '54vw 37vh 0 1px #ffeeaa, 71vw 44vh 0 1px #fff, 87vw 31vh 0 1px #aaccff,' +
          '2vw 64vh 0 1px #fff, 27vw 71vh 0 1px #aaccff, 47vw 57vh 0 1px #ffaabb,' +
          '62vw 74vh 0 1px #fff, 76vw 61vh 0 1px #ffeeaa, 94vw 54vh 0 1px #fff,' +
          '14vw 84vh 0 1px #aaccff, 34vw 89vh 0 1px #fff, 57vw 87vh 0 1px #aaffee,' +
          '74vw 81vh 0 1px #ffeeaa, 89vw 91vh 0 1px #fff, 1vw 96vh 0 1px #aaccff,' +
          '41vw 21vh 0 2px #aaccff, 59vw 27vh 0 2px #ffeeaa, 79vw 15vh 0 2px #aaffee,' +
          '11vw 51vh 0 2px #fff, 29vw 59vh 0 2px #ffaabb, 51vw 49vh 0 2px #aaccff,' +
          '69vw 57vh 0 2px #ffeeaa, 86vw 47vh 0 2px #fff, 19vw 77vh 0 2px #aaffee,' +
          '32vw 24vh 0 1px #fff, 55vw 17vh 0 1px #ffaabb, 73vw 34vh 0 1px #aaccff,' +
          '7vw 47vh 0 1px #ffeeaa, 43vw 67vh 0 1px #fff, 81vw 73vh 0 1px #aaffee,' +
          '24vw 93vh 0 1px #aaccff, 66vw 96vh 0 1px #fff, 97vw 38vh 0 1px #ffeeaa',
      }} />
      {/* Globe sphere */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 'min(68vw, 68vh)', height: 'min(68vw, 68vh)',
        transform: 'translate(-50%, -50%)',
      }}>
        {/* Atmosphere glow — matches globe.gl atmosphereColor #4488FF */}
        <div style={{
          position: 'absolute', inset: '-16%', borderRadius: '50%',
          background: 'radial-gradient(circle, transparent 59%, rgba(68,136,255,0.27) 68%, rgba(68,136,255,0.08) 83%, transparent 100%)',
        }} />
        {/* Sphere base with directional lighting illusion */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
          background: 'radial-gradient(circle at 37% 34%, #1e3060 0%, #0c1a38 32%, #07121f 58%, #03080f 82%, #000 100%)',
        }}>
          {/* Country blobs — approximate orthographic positions centred on Atlantic */}
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }} aria-hidden="true">
            {/* North America */}
            <path d="M40,38 Q28,52 30,70 Q33,86 47,91 Q63,94 71,78 Q79,60 71,42 Q61,30 45,32 Z" fill="#FF5722" opacity="0.64" />
            {/* South America */}
            <path d="M57,103 Q45,116 47,133 Q50,149 62,152 Q75,153 80,138 Q85,122 77,106 Z" fill="#E91E63" opacity="0.64" />
            {/* Europe */}
            <path d="M92,57 Q83,64 86,74 Q92,82 106,80 Q115,76 113,64 Q109,55 97,54 Z" fill="#2196F3" opacity="0.64" />
            {/* Africa */}
            <path d="M97,83 Q87,94 88,113 Q90,132 101,137 Q114,139 121,124 Q127,107 122,90 Q116,80 104,80 Z" fill="#4CAF50" opacity="0.64" />
            {/* Eurasia */}
            <path d="M118,50 Q109,54 112,65 Q117,73 131,72 Q152,70 158,57 Q163,45 150,41 Q136,39 122,45 Z" fill="#9C27B0" opacity="0.64" />
            {/* SE Asia / Indian subcontinent */}
            <path d="M133,76 Q124,82 127,92 Q133,99 144,97 Q154,92 152,81 Q149,72 138,71 Z" fill="#00BCD4" opacity="0.64" />
            {/* Australia */}
            <path d="M147,118 Q137,122 137,133 Q138,142 149,143 Q162,142 164,131 Q164,120 153,117 Z" fill="#FFC107" opacity="0.64" />
            {/* Greenland */}
            <ellipse cx="72" cy="20" rx="11" ry="8" fill="#03A9F4" opacity="0.48" />
            {/* Antarctica */}
            <ellipse cx="100" cy="183" rx="58" ry="11" fill="#00BCD4" opacity="0.20" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ≡اأ Lazy-load heavy components that import 1.7MB iptv-channels.ts
// This keeps the initial bundle lean and defers channel-data parsing to after first paint
const CountrySidebar = lazy(() => import("@/components/country-sidebar"))
const CountryDetail = lazy(() => import("@/components/country-detail"))

// CategorySidebar is tiny ظ¤ keep static
import CategorySidebar from "@/components/CategorySidebar"

export default function Home() {
  const [location, setLocation] = useLocation()
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [GlobeViewer, setGlobeViewer] = useState<GlobeViewerType | null>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const globeTriggeredRef = useRef(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all-channels")
  const skipChannelReset = useRef(false)

  // ظ£à Use optimized mobile detection hook
  const isMobile = useIsMobileDevice()

  // Load globe automatically on both desktop and mobile.
  useEffect(() => {
    const loadGlobe = () =>
      import("@/components/globe-viewer").then((mod) => setGlobeViewer(() => mod.default))
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(loadGlobe, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    }
    const t = setTimeout(loadGlobe, 800)
    return () => clearTimeout(t)
  }, [isMobile])

  const triggerGlobeLoad = useCallback(() => {
    if (!globeTriggeredRef.current) {
      globeTriggeredRef.current = true
      import("@/components/globe-viewer").then((mod) => setGlobeViewer(() => mod.default))
    }
  }, [])

  // Fallback: reveal globe after 12 s even if onReady never fires
  useEffect(() => {
    if (!GlobeViewer || globeReady) return
    const t = setTimeout(() => setGlobeReady(true), 12000)
    return () => clearTimeout(t)
  }, [GlobeViewer, globeReady])

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
    // ╪╣┘╪»┘à╪د ┘è╪ز┘à ╪ز╪ص╪»┘è╪» ╪»┘ê┘╪ر ╪╣┘┘ë ╪د┘┘à┘ê╪ذ╪د┘è┘╪î ╪د┘╪ز╪ص ╪د┘┘ sidebar ╪ز┘┘é╪د╪خ┘è╪د┘ï
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

  // GeoJSON ADMIN names ظْ app country names
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

  // ≡ا» --- Event Handlers ---
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

        {/* ≡اî Globe Viewer */}
        <div className="absolute inset-0 z-10 sm:right-[320px] lg:right-[340px]">
          {/* CSS placeholder — always on top, fades out when real globe signals onReady */}
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 1,
              opacity: globeReady ? 0 : 1,
              transition: 'opacity 0.8s ease',
              pointerEvents: globeReady ? 'none' : 'auto',
            }}
          >
            <GlobePlaceholder />
          </div>
          {/* Real globe — renders underneath, revealed as placeholder fades out */}
          {GlobeViewer && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <GlobeViewer
                selectedCountry={selectedCountry}
                onCountryClick={handleGlobeCountryClick}
                isMobile={isMobile}
                onReady={() => setGlobeReady(true)}
              />
            </div>
          )}
        </div>

        {/* ≡اôè Stats Counter + Credits - Bottom Left (aria-hidden: decorative only) */}
        {!selectedChannel && (
          <div className="fixed bottom-5 left-5 z-50 pointer-events-none flex flex-col gap-1" aria-hidden="true">
            {/* Credits */}
            <div className="flex flex-col gap-0.5">
              <a href="https://iptv-org.github.io/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">ظشة</span>
                <span className="text-blue-200/50 font-light">IPTV-org Database</span>
              </a>
              <a href="https://iptv-org.github.io/api/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">ظشة</span>
                <span className="text-blue-200/50 font-light">IPTV-org API</span>
              </a>
              <a href="https://threejs.org/" target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: "10px" }} tabIndex={-1}>
                <span className="text-blue-200/40">ظشة</span>
                <span className="text-blue-200/50 font-light">Three.js</span>
              </a>
            </div>
            {/* Counter */}
            <div className="flex items-center gap-1">
              <span className="text-blue-200/70 font-light" style={{ fontSize: "10px" }}>153</span>
              <span className="text-blue-200/50 font-light" style={{ fontSize: "10px" }}>countries</span>
              <span className="text-blue-200/30 font-light mx-0.5" style={{ fontSize: "10px" }}>ظت</span>
              <span className="text-blue-200/70 font-light" style={{ fontSize: "10px" }}>9,022</span>
              <span className="text-blue-200/50 font-light" style={{ fontSize: "10px" }}>channels</span>
            </div>
          </div>
        )}
        {/* ≡اح Video Player (Desktop Only) */}
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

        {/* ≡اûحي╕ Desktop Sidebar (Countries - Right) */}
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

        {/* ≡اô▒ ≡اûحي╕  Category Sidebar (All Sizes) */}
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


        {/* ≡اô▒ Mobile Sidebar (Channels) */}
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

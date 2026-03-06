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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all-channels")
  const skipChannelReset = useRef(false)

  // ظ£à Use optimized mobile detection hook
  const isMobile = useIsMobileDevice()

  useEffect(() => {
    const loadGlobe = () => {
      import("@/components/globe-viewer").then((mod) => {
        setGlobeViewer(() => mod.default)
      })
    }

    // On mobile: longer delay so page renders + TBT stays low
    // On desktop: use requestIdleCallback to avoid blocking main thread
    if (isMobile) {
      const t = setTimeout(loadGlobe, 2000)
      return () => clearTimeout(t)
    } else if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(loadGlobe, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    } else {
      const t = setTimeout(loadGlobe, 1500)
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
          {GlobeViewer ? (
            <GlobeViewer
              selectedCountry={selectedCountry}
              onCountryClick={handleGlobeCountryClick}
              isMobile={isMobile}
            />
          ) : (
            <div className="w-full h-full bg-[#0B0D11]" />
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

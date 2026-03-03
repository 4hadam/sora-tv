import { useState, useEffect, Suspense, lazy } from "react"
import { useLocation } from "wouter"
import TopNavbar from "@/components/top-navbar"
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device"
import { countryCodeMap } from "@/lib/country-flags"

// ✅ Lazy load only heavy components (globe.gl is ~300KB)
const GlobeViewer = lazy(() => import("@/components/globe-viewer"))

// Regular imports for other components
import CountrySidebar from "@/components/country-sidebar"
import CountryDetail from "@/components/country-detail"
import CategorySidebar from "@/components/CategorySidebar"

// Globe placeholder — shown while globe.gl hasn't loaded yet
const GlobePlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#0B0D11]">
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 opacity-30">
      <div className="absolute inset-0 rounded-full border border-white/10 animate-pulse" />
      <div className="absolute inset-4 rounded-full border border-white/10" />
      <div className="absolute inset-8 rounded-full border border-white/10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-white/30 animate-ping" />
      </div>
    </div>
  </div>
)

// ✅ Loading indicator for lazy components
const ComponentLoader = () => (
  <div className="w-full h-full flex items-center justify-center bg-black/20">
    <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
  </div>
)

export default function Home() {
  const [location, setLocation] = useLocation()
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all-channels")

  // ✅ Use optimized mobile detection hook
  const isMobile = useIsMobileDevice()

  useEffect(() => {
    setMounted(true)
    // Defer globe load until after first paint — prevents blocking the main thread
    const schedule = (cb: () => void) => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(cb, { timeout: 3000 })
      } else {
        setTimeout(cb, 200)
      }
    }
    schedule(() => setGlobeReady(true))
  }, [])

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
        setSelectedChannel(null)
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

  if (!mounted) return null

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

  const handleSelectChannel = (channel: string) => setSelectedChannel(channel)
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
      />

      <div className="flex-1 overflow-hidden relative">

        {/* 🌍 Globe Viewer */}
        <div className="absolute inset-0 z-10 sm:right-[320px] lg:right-[340px]">
          {globeReady ? (
            <Suspense fallback={<ComponentLoader />}>
              <GlobeViewer
                selectedCountry={selectedCountry}
                onCountryClick={handleGlobeCountryClick}
                isMobile={isMobile}
              />
            </Suspense>
          ) : (
            <GlobePlaceholder />
          )}
        </div>
        {/* 🎥 Video Player (Desktop Only) */}
        {!isMobile && selectedChannel && (selectedCountry || activeCategory !== "all-channels") && (
          <div
            className="absolute top-0 bottom-0 z-30 flex items-center justify-center p-4 sm:p-8 
                      left-0 right-0 sm:right-[320px] lg:right-[340px]"
          >
            <CountryDetail
              country={selectedCountry ?? activeCategory}
              channel={selectedChannel}
              onBack={handleBackFromPlayer}
              isMobile={isMobile}
              activeCategory={activeCategory}
            />
          </div>
        )}

        {/* 🖥️ Desktop Sidebar (Countries - Right) */}
        {!isMobile && (
          <div
            className="absolute right-0 top-16 bottom-0 w-[320px] lg:w-[340px] z-20 bg-gray-900/90 backdrop-blur-md"
            role="complementary"
          >
            <CountrySidebar
              selectedCountry={selectedCountry}
              onSelectCountry={handleSelectCountry}
              onSelectChannel={handleSelectChannel}
              onClose={() => { }}
              externalSearch={searchQuery}
              currentTime={currentTime}
              isMobile={isMobile}
              activeCategory={activeCategory}
            />
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
                  <CountryDetail
                    country={selectedCountry ?? activeCategory}
                    channel={selectedChannel}
                    onBack={handleBackFromPlayer}
                    isMobile={isMobile}
                    activeCategory={activeCategory}
                  />
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
                <CountrySidebar
                  selectedCountry={selectedCountry}
                  onSelectCountry={handleSelectCountry}
                  onSelectChannel={handleSelectChannel}
                  onClose={toggleMobileSidebar}
                  externalSearch={searchQuery}
                  currentTime={currentTime}
                  isMobile={isMobile}
                  activeCategory={activeCategory}
                />
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
"use client"

import { useEffect, useRef } from "react"
import createGlobe from "cobe"

interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
}

// Map country names to approximate lat/lng for markers
const countryCoordinates: Record<string, [number, number]> = {
  "Morocco": [31.7917, -7.0926],
  "United States": [37.0902, -95.7129],
  "United Kingdom": [55.3781, -3.4360],
  "France": [46.2276, 2.2137],
  "Germany": [51.1657, 10.4515],
  "Italy": [41.8719, 12.5674],
  "Spain": [40.4637, -3.7492],
  "Russia": [61.5240, 105.3188],
  "China": [35.8617, 104.1954],
  "Japan": [36.2048, 138.2529],
  "India": [20.5937, 78.9629],
  "Brazil": [-14.2350, -51.9253],
  "Canada": [56.1304, -106.3468],
  "Australia": [-25.2744, 133.7751],
  "Mexico": [23.6345, -102.5528],
  "South Africa": [-30.5595, 22.9375],
  "Egypt": [26.8206, 30.8025],
  "Saudi Arabia": [23.8859, 45.0792],
  "Turkey": [38.9637, 35.2433],
  "Argentina": [-38.4161, -63.6167],
  "South Korea": [35.9078, 127.7669],
  "Indonesia": [-0.7893, 113.9213],
  "Netherlands": [52.1326, 5.2913],
  "Switzerland": [46.8182, 8.2275],
  "Sweden": [60.1282, 18.6435],
  "Poland": [51.9194, 19.1451],
  "Belgium": [50.5039, 4.4699],
  "Austria": [47.5162, 14.5501],
  "Norway": [60.4720, 8.4689],
  "Denmark": [56.2639, 9.5018],
  "Greece": [39.0742, 21.8243],
  "Portugal": [39.3999, -8.2245],
  "Czech Republic": [49.8175, 15.4730],
  "Romania": [45.9432, 24.9668],
  "Hungary": [47.1625, 19.5033],
  "Ireland": [53.1424, -7.6921],
  "Finland": [61.9241, 25.7482],
  "Ukraine": [48.3794, 31.1656],
  "Thailand": [15.8700, 100.9925],
  "Malaysia": [4.2105, 101.9758],
  "Singapore": [1.3521, 103.8198],
  "Philippines": [12.8797, 121.7740],
  "Vietnam": [14.0583, 108.2772],
  "Pakistan": [30.3753, 69.3451],
  "Bangladesh": [23.6850, 90.3563],
  "Nigeria": [9.0820, 8.6753],
  "Kenya": [-0.0236, 37.9062],
  "Ghana": [7.9465, -1.0232],
  "Colombia": [4.5709, -74.2973],
  "Peru": [-9.1900, -75.0152],
  "Chile": [-35.6751, -71.5430],
  "Venezuela": [6.4238, -66.5897],
  "Algeria": [28.0339, 1.6596],
  "Tunisia": [33.8869, 9.5375],
  "Iraq": [33.2232, 43.6793],
  "Iran": [32.4279, 53.6880],
  "Israel": [31.0461, 34.8516],
  "Jordan": [30.5852, 36.2384],
  "Lebanon": [33.8547, 35.8623],
  "Kuwait": [29.3117, 47.4818],
  "Qatar": [25.3548, 51.1839],
  "United Arab Emirates": [23.4241, 53.8478],
  "Oman": [21.4735, 55.9754],
  "Yemen": [15.5527, 48.5164],
  "Syria": [34.8021, 38.9968],
  "Palestine": [31.9522, 35.2332],
  "Libya": [26.3351, 17.2283],
  "Sudan": [12.8628, 30.2176],
  "Ethiopia": [9.1450, 40.4897],
  "Tanzania": [-6.3690, 34.8888],
  "Uganda": [1.3733, 32.2903],
  "Cameroon": [7.3697, 12.3547],
  "Congo": [-4.0383, 21.7587],
  "Ivory Coast": [7.5400, -5.5471],
  "Senegal": [14.4974, -14.4524],
  "Mali": [17.5707, -3.9962],
  "Niger": [17.6078, 8.0817],
  "Burkina Faso": [12.2383, -1.5616],
  "Chad": [15.4542, 18.7322],
  "Mauritania": [21.0079, -10.9408],
  "Zimbabwe": [-19.0154, 29.1549],
  "Zambia": [-13.1339, 27.8493],
  "Mozambique": [-18.6657, 35.5296],
  "Madagascar": [-18.7669, 46.8691],
  "Angola": [-11.2027, 17.8739],
  "Namibia": [-22.9576, 18.4904],
  "Botswana": [-22.3285, 24.6849],
  "New Zealand": [-40.9006, 174.8860],
  "Iceland": [64.9631, -19.0208],
  "Cuba": [21.5218, -77.7812],
  "Jamaica": [18.1096, -77.2975],
  "Dominican Republic": [18.7357, -70.1627],
  "Haiti": [18.9712, -72.2852],
  "Guatemala": [15.7835, -90.2308],
  "Honduras": [15.2000, -86.2419],
  "El Salvador": [13.7942, -88.8965],
  "Nicaragua": [12.8654, -85.2072],
  "Costa Rica": [9.7489, -83.7534],
  "Panama": [8.5380, -80.7821],
  "Puerto Rico": [18.2208, -66.5901],
  "Trinidad and Tobago": [10.6918, -61.2225],
  "Bahamas": [25.0343, -77.3963],
  "Barbados": [13.1939, -59.5432],
  "Bahrain": [26.0667, 50.5577],
  "Sri Lanka": [7.8731, 80.7718],
  "Nepal": [28.3949, 84.1240],
  "Myanmar": [21.9162, 95.9560],
  "Cambodia": [12.5657, 104.9910],
  "Laos": [19.8563, 102.4955],
  "Mongolia": [46.8625, 103.8467],
  "Kazakhstan": [48.0196, 66.9237],
  "Uzbekistan": [41.3775, 64.5853],
  "Afghanistan": [33.9391, 67.7100],
  "Azerbaijan": [40.1431, 47.5769],
  "Georgia": [42.3154, 43.3569],
  "Armenia": [40.0691, 45.0382],
  "Serbia": [44.0165, 21.0059],
  "Croatia": [45.1000, 15.2000],
  "Bosnia and Herzegovina": [43.9159, 17.6791],
  "Slovenia": [46.1512, 14.9955],
  "Slovakia": [48.6690, 19.6990],
  "Bulgaria": [42.7339, 25.4858],
  "North Macedonia": [41.5124, 21.7453],
  "Albania": [41.1533, 20.1683],
  "Montenegro": [42.7087, 19.3744],
  "Kosovo": [42.6026, 20.9030],
  "Moldova": [47.4116, 28.3699],
  "Belarus": [53.7098, 27.9534],
  "Lithuania": [55.1694, 23.8813],
  "Latvia": [56.8796, 24.6032],
  "Estonia": [58.5953, 25.0136],
  "Luxembourg": [49.8153, 6.1296],
  "Malta": [35.9375, 14.3754],
  "Cyprus": [35.1264, 33.4299],
  "Taiwan": [23.6978, 120.9605],
  "Hong Kong": [22.3193, 114.1694],
  "Macau": [22.1987, 113.5439],
  "Brunei": [4.5353, 114.7277],
  "East Timor": [-8.8742, 125.7275],
  "Papua New Guinea": [-6.3150, 143.9555],
  "Fiji": [-17.7134, 178.0650],
  "Solomon Islands": [-9.6457, 160.1562],
  "Vanuatu": [-15.3767, 166.9592],
  "Samoa": [-13.7590, -172.1046],
  "Tonga": [-21.1790, -175.1982],
}

export default function GlobeViewer({
  selectedCountry,
  onCountryClick,
  isMobile = false,
}: GlobeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const phiRef = useRef(0)

  useEffect(() => {
    if (!canvasRef.current) return

    let phi = 0
    let width = 0

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth
      }
    }
    window.addEventListener("resize", onResize)
    onResize()

    // Get marker for selected country
    const markers = selectedCountry && countryCoordinates[selectedCountry]
      ? [{ location: countryCoordinates[selectedCountry], size: 0.12 }]
      : []

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: isMobile ? 12000 : 16000,
      mapBrightness: 1.2,
      baseColor: [0.1, 0.1, 0.15],
      markerColor: [1, 0.85, 0.3],
      glowColor: [0.15, 0.4, 1],
      markers,
      onRender: (state) => {
        // Auto-rotate when not interacting
        if (!pointerInteracting.current) {
          phi += 0.003
        }
        state.phi = phi + phiRef.current
        state.width = width * 2
        state.height = width * 2
      },
    })

    // Handle interactions
    const handlePointerDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX - phiRef.current * (width / Math.PI)
      pointerInteractionMovement.current = 0
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing"
      }
    }

    const handlePointerUp = () => {
      pointerInteracting.current = null
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grab"
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const delta = e.clientX - pointerInteracting.current
        phiRef.current = delta / (width / Math.PI)
        pointerInteractionMovement.current += Math.abs(e.movementX) + Math.abs(e.movementY)
      }
    }

    const handlePointerOut = () => {
      pointerInteracting.current = null
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grab"
      }
    }

    // Touch events for mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && pointerInteracting.current !== null) {
        const touch = e.touches[0]
        const delta = touch.clientX - pointerInteracting.current
        phiRef.current = delta / (width / Math.PI)
      }
    }

    if (canvasRef.current) {
      canvasRef.current.style.cursor = "grab"
      canvasRef.current.addEventListener("pointerdown", handlePointerDown)
      canvasRef.current.addEventListener("pointerup", handlePointerUp)
      canvasRef.current.addEventListener("pointermove", handlePointerMove)
      canvasRef.current.addEventListener("pointerout", handlePointerOut)
      canvasRef.current.addEventListener("touchmove", handleTouchMove)
    }

    return () => {
      globe.destroy()
      window.removeEventListener("resize", onResize)
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("pointerdown", handlePointerDown)
        canvasRef.current.removeEventListener("pointerup", handlePointerUp)
        canvasRef.current.removeEventListener("pointermove", handlePointerMove)
        canvasRef.current.removeEventListener("pointerout", handlePointerOut)
        canvasRef.current.removeEventListener("touchmove", handleTouchMove)
      }
    }
  }, [isMobile, selectedCountry])

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[800px] max-h-[800px] aspect-square"
        style={{
          contain: "layout paint size",
          touchAction: "none",
        }}
      />
    </div>
  )
}

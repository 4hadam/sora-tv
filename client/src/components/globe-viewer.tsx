"use client"

import { useEffect, useRef, useCallback } from "react"
import * as THREE from "three"
import type { GlobeInstance } from "globe.gl"

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const VIVID_PALETTE = [
  "#FFEB3B", "#FF5722", "#2196F3", "#4CAF50", "#E91E63",
  "#9C27B0", "#00BCD4", "#FFC107", "#FF9800", "#8BC34A",
  "#03A9F4", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]

function countryColor(name: string): string {
  let h = 0
  for (const c of name) h += c.charCodeAt(0)
  return VIVID_PALETTE[h % VIVID_PALETTE.length]
}

// ─── Stars ────────────────────────────────────────────────────────────────────
// Realistic star spectrum: blue → cyan → yellow → orange → red (arccos distribution)
const STAR_COLORS = [
  { hue: 240, prob: 0.05 },
  { hue: 220, prob: 0.10 },
  { hue: 200, prob: 0.15 },
  { hue: 170, prob: 0.20 },
  { hue:  60, prob: 0.25 },
  { hue:  30, prob: 0.15 },
  { hue:   0, prob: 0.10 },
]

function pickStarHue(): number {
  const r = Math.random()
  let acc = 0
  for (const c of STAR_COLORS) {
    acc += c.prob
    if (r < acc) return c.hue
  }
  return 0
}

function makeSpherePoints(radius: number, count: number): Float32Array {
  const pts = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const phi   = Math.acos(2 * Math.random() - 1)
    const theta = 2 * Math.PI * Math.random()
    pts[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
    pts[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    pts[i * 3 + 2] = radius * Math.cos(phi)
  }
  return pts
}

function createStarLayer(count: number, size: number): THREE.Points {
  const geo  = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(makeSpherePoints(1000, count), 3))

  const cols = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const L = Math.min((Math.random() * 20 + 70) * (Math.random() * 0.5 + 0.75), 100)
    const c = new THREE.Color(`hsl(${pickStarHue()}, 100%, ${L}%)`)
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3))

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size, sizeAttenuation: true, vertexColors: true, depthWrite: false, depthTest: false }),
  )
}

function addStarsToScene(scene: THREE.Scene, isMobile: boolean) {
  const group = new THREE.Group()
  group.renderOrder = -1
  if (isMobile) {
    group.add(createStarLayer(500, 1.0))
    group.add(createStarLayer(600, 3.5))
    group.add(createStarLayer(200, 5.0))
  } else {
    group.add(createStarLayer(700, 1.0))
    group.add(createStarLayer(800, 3.5))
    group.add(createStarLayer(300, 5.0))
  }
  scene.add(group)
  return group
}

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────
function mergeWesternSahara(features: any[]): any[] {
  const morocco = features.find((f: any) => f.properties.ADMIN === "Morocco")
  const sahara  = features.find((f: any) => f.properties.ADMIN === "Western Sahara")
  if (!morocco || !sahara) return features

  const coords = (f: any) =>
    f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates

  morocco.geometry.type        = "MultiPolygon"
  morocco.geometry.coordinates = [...coords(morocco), ...coords(sahara)]
  return features.filter((f: any) => f.properties.ADMIN !== "Western Sahara")
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlobeViewer({ selectedCountry, onCountryClick, isMobile = false }: GlobeViewerProps) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const globeRef        = useRef<GlobeInstance | null>(null)
  const polygonsRef     = useRef<any[]>([])
  const starsRef        = useRef<THREE.Group | null>(null)
  const resizeRef       = useRef<ResizeObserver | null>(null)
  const touchStartRef   = useRef<{ x: number; y: number; t: number } | null>(null)
  const touchIdRef      = useRef<number | null>(null)

  // Color getter — recomputed when selectedCountry changes
  const getColor = useCallback((d: any) => {
    const name = d?.properties?.ADMIN || ""
    return name === selectedCountry ? "rgba(255,255,255,0.95)" : countryColor(name)
  }, [selectedCountry])

  // ── Init globe ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let aborted = false
    const ac = new AbortController()

    ;(async () => {
      if (!containerRef.current) return

      const GlobeFactory = (await import("globe.gl")).default
      if (aborted) return

      const globe = GlobeFactory()(containerRef.current)
        .globeImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
        .showAtmosphere(true)
        .atmosphereColor("#4488FF")
        .atmosphereAltitude(0.28)
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => isMobile ? false : "rgba(0,0,0,0.3)")

      globe.scene().background = new THREE.Color(0x000000)
      globe.renderer().setClearColor(0x000000, 1)
      globe.renderer().antialias = false
      globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      globeRef.current = globe

      // Size
      const resize = () => {
        if (!containerRef.current || !globeRef.current) return
        globeRef.current.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight)
      }
      resize()
      resizeRef.current = new ResizeObserver(resize)
      resizeRef.current.observe(containerRef.current)
      window.addEventListener("resize", resize)

      // Controls
      const ctrl = globe.controls()
      ctrl.autoRotate  = false
      ctrl.enableZoom  = true
      ctrl.minDistance = 150
      ctrl.maxDistance = 500
      globe.pointOfView({ altitude: isMobile ? 3.5 : 2.5 }, 0)

      // Stars
      starsRef.current = addStarsToScene(globe.scene(), isMobile)

      // Load countries
      try {
        const res  = await fetch(
          "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson",
          { signal: ac.signal },
        )
        const data = await res.json()
        if (aborted) return

        const valid = data.features.filter(
          (f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
        )
        const features = mergeWesternSahara(valid)
        polygonsRef.current = features

        globe
          .polygonsData(features)
          .polygonGeoJsonGeometry((d: any) => d.geometry)
          .polygonCapColor(getColor)
          .polygonAltitude(0.01)
          .polygonLabel((d: any) => `<span style="font-size:13px;font-weight:600">${d?.properties?.ADMIN ?? ""}</span>`)
          .onPolygonClick((d: any) => {
            const name = d?.properties?.ADMIN || ""
            if (name) onCountryClick?.(name)
          })
      } catch {
        // Network error — globe still shows without country polygons
      }
    })()

    return () => {
      aborted = true
      ac.abort()
      resizeRef.current?.disconnect()
      starsRef.current?.children.forEach((c: any) => { c.geometry?.dispose(); c.material?.dispose() })
      globeRef.current?.scene().remove(starsRef.current!)
      window.removeEventListener("resize", () => {})
    }
  }, [isMobile])

  // ── Update colors when selection changes ────────────────────────────────────
  useEffect(() => {
    if (globeRef.current && polygonsRef.current.length > 0) {
      globeRef.current.polygonCapColor(getColor)
    }
  }, [selectedCountry, getColor])

  // ── Adjust camera distance on mobile/desktop switch ─────────────────────────
  useEffect(() => {
    globeRef.current?.pointOfView({ altitude: isMobile ? 3.5 : 2.5 }, 400)
  }, [isMobile])

  // ── Mobile tap → country click ──────────────────────────────────────────────
  useEffect(() => {
    if (!isMobile || !containerRef.current) return

    const el = containerRef.current

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touchIdRef.current    = t.identifier
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return
      const start = touchStartRef.current
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== touchIdRef.current) continue
        const dx = Math.abs(t.clientX - start.x)
        const dy = Math.abs(t.clientY - start.y)
        if (dx < 15 && dy < 15 && Date.now() - start.t < 300 && globeRef.current) {
          const rect = el.getBoundingClientRect()
          const mx   = ((t.clientX - rect.left)  / rect.width)  * 2 - 1
          const my   = -((t.clientY - rect.top) / rect.height) * 2 + 1

          const ray = new THREE.Raycaster()
          ray.setFromCamera(new THREE.Vector2(mx, my), globeRef.current.camera())

          const hits = ray.intersectObjects(globeRef.current.scene().children, true)
          for (const hit of hits) {
            const name = (hit.object as any).userData?.feature?.properties?.ADMIN
            if (name) { onCountryClick?.(name); break }
          }
        }
        touchIdRef.current = null; touchStartRef.current = null
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchend",   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchend",   onTouchEnd)
    }
  }, [isMobile, onCountryClick])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent pointer-events-auto"
      aria-label="interactive globe"
      style={{ touchAction: "none" }}
    />
  )
}

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import * as THREE from "three"
import type { GlobeInstance } from "globe.gl"

interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
  onReady?: () => void
}

// 15-color vivid palette — hash-based per country
const PALETTE = [
  "#FF5722", "#2196F3", "#4CAF50", "#E91E63", "#9C27B0",
  "#00BCD4", "#FFC107", "#FF9800", "#8BC34A", "#03A9F4",
  "#FFEB3B", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]
function countryColor(name: string): string {
  let h = 0; for (const c of name) h = (h + c.charCodeAt(0)) & 0xffff
  return PALETTE[h % PALETTE.length]
}

// Star field helpers
const STAR_SPECTRUM = [
  { hue: 220, p: 0.12 }, { hue: 200, p: 0.15 }, { hue: 170, p: 0.20 },
  { hue: 60, p: 0.25 }, { hue: 30, p: 0.15 }, { hue: 0, p: 0.13 },
]
function starHue(): number {
  let r = Math.random(), acc = 0
  for (const s of STAR_SPECTRUM) { acc += s.p; if (r < acc) return s.hue }
  return 60
}
function spherePts(r: number, n: number): Float32Array {
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(2 * Math.random() - 1), th = Math.PI * 2 * Math.random()
    a[i * 3] = r * Math.sin(phi) * Math.cos(th)
    a[i * 3 + 1] = r * Math.sin(phi) * Math.sin(th)
    a[i * 3 + 2] = r * Math.cos(phi)
  }
  return a
}
function starLayer(n: number, sz: number): THREE.Points {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(spherePts(1000, n), 3))
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const L = Math.min(70 + Math.random() * 25, 100)
    const c = new THREE.Color(`hsl(${starHue()},100%,${L}%)`)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: sz, sizeAttenuation: true, vertexColors: true, depthWrite: false, depthTest: false,
  }))
}
function addStars(scene: THREE.Scene, mobile: boolean): THREE.Group {
  const g = new THREE.Group(); g.renderOrder = -1
  const counts = mobile ? [500, 600, 200] : [700, 800, 300]
  const sizes = [1.0, 3.5, 5.0]
  counts.forEach((n, i) => g.add(starLayer(n, sizes[i])))
  scene.add(g); return g
}

export default function GlobeViewer({ selectedCountry, onCountryClick, isMobile = false, onReady }: GlobeViewerProps) {
  const el = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeInstance | null>(null)
  const polys = useRef<any[]>([])
  const stars = useRef<THREE.Group | null>(null)
  const ro = useRef<ResizeObserver | null>(null)
  const tapStart = useRef<{ x: number; y: number; t: number; id: number } | null>(null)
  // Hidden until globe.gl's internal scale-in animation finishes
  const [visible, setVisible] = useState(false)

  const capColor = useCallback((d: any) => {
    const n = d?.properties?.ADMIN ?? ""
    return n === selectedCountry ? "rgba(255,255,255,0.95)" : countryColor(n)
  }, [selectedCountry])

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false
    const ac = new AbortController()
      ; (async () => {
        if (!el.current) return
        const Factory = (await import("globe.gl")).default
        if (dead) return

        const g = Factory()(el.current)
          .globeImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
          .showAtmosphere(true)
          .atmosphereColor("#4488FF")
          .atmosphereAltitude(0.28)
          .polygonSideColor(() => "rgba(0,0,0,0)")
          .polygonStrokeColor(() => isMobile ? false : "rgba(0,0,0,0.25)")
          .polygonAltitude(0.01)

        g.scene().background = new THREE.Color(0x000000)
        g.renderer().setClearColor(0x000000, 1)
        g.renderer().setPixelRatio(Math.min(devicePixelRatio, 1.5))
        globe.current = g

        // responsive resize
        const resize = () => {
          if (!el.current || !globe.current) return
          globe.current.width(el.current.clientWidth).height(el.current.clientHeight)
        }
        resize()
        ro.current = new ResizeObserver(resize)
        ro.current.observe(el.current)
        window.addEventListener("resize", resize)

        // controls
        const ctrl = g.controls()
        ctrl.autoRotate = false; ctrl.enableZoom = true
        ctrl.minDistance = 150; ctrl.maxDistance = 500

        // Set camera immediately — no animation
        const targetAlt = isMobile ? 3.5 : 2.5
        g.pointOfView({ altitude: targetAlt }, 0)

        // stars
        stars.current = addStars(g.scene(), isMobile)

        // load GeoJSON via Web Worker — keeps main thread free
        const worker = new Worker(
          new URL("../workers/geojson.worker.ts", import.meta.url),
          { type: "module" }
        )
        worker.postMessage(null)
        worker.onmessage = (e) => {
          worker.terminate()
          if (dead || !e.data.ok) return
          const features = e.data.features
          polys.current = features
          if (!globe.current) return
          globe.current
            .polygonsData(features)
            .polygonGeoJsonGeometry((d: any) => d.geometry)
            .polygonCapColor(capColor)
            .polygonLabel((d: any) => {
              const name = d?.properties?.ADMIN ?? ""
              return name ? `<span style="font-size:13px;font-weight:600;color:#fff">${name}</span>` : ""
            })
            .onPolygonClick((d: any) => {
              const name = d?.properties?.ADMIN ?? ""
              if (name) onCountryClick?.(name)
            })
          // Signal home.tsx that the globe is fully rendered with countries
          // Show the canvas now — animation has already finished internally
          setVisible(true)
          onReady?.()
        }
        worker.onerror = () => worker.terminate()
      })()

    return () => {
      dead = true; ac.abort()
      ro.current?.disconnect()
      window.removeEventListener("resize", () => { })
      if (stars.current) {
        stars.current.children.forEach((c: any) => {
          c.geometry?.dispose(); c.material?.dispose()
        })
        globe.current?.scene().remove(stars.current)
      }
    }
  }, [isMobile])

  // ── update cap colors on selection change ─────────────────────────────────
  useEffect(() => {
    if (globe.current && polys.current.length > 0)
      globe.current.polygonCapColor(capColor)
  }, [selectedCountry, capColor])

  // ── altitude on mobile/desktop switch ─────────────────────────────────────
  useEffect(() => {
    globe.current?.pointOfView({ altitude: isMobile ? 3.5 : 2.5 }, 400)
  }, [isMobile])

  // ── mobile tap → raycasting country click ─────────────────────────────────
  useEffect(() => {
    if (!isMobile || !el.current) return
    const div = el.current

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      tapStart.current = { x: t.clientX, y: t.clientY, t: Date.now(), id: t.identifier }
    }
    const onEnd = (e: TouchEvent) => {
      if (!tapStart.current || !globe.current) return
      const s = tapStart.current
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== s.id) continue
        if (Math.abs(t.clientX - s.x) < 15 && Math.abs(t.clientY - s.y) < 15 && Date.now() - s.t < 300) {
          const rect = div.getBoundingClientRect()
          const mx = ((t.clientX - rect.left) / rect.width) * 2 - 1
          const my = -((t.clientY - rect.top) / rect.height) * 2 + 1
          const ray = new THREE.Raycaster()
          ray.setFromCamera(new THREE.Vector2(mx, my), globe.current.camera())
          const hits = ray.intersectObjects(globe.current.scene().children, true)
          for (const hit of hits) {
            const name = (hit.object as any).userData?.feature?.properties?.ADMIN
            if (name) { onCountryClick?.(name); break }
          }
        }
        tapStart.current = null
      }
    }

    div.addEventListener("touchstart", onStart, { passive: true })
    div.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      div.removeEventListener("touchstart", onStart)
      div.removeEventListener("touchend", onEnd)
    }
  }, [isMobile, onCountryClick])

  return (
    <div
      ref={el}
      className="w-full h-full bg-transparent"
      style={{ touchAction: "none", opacity: visible ? 1 : 0 }}
      aria-label="interactive globe"
    />
  )
}

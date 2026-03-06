"use client"

import { useEffect, useRef } from "react"

interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
}

// Detect OffscreenCanvas support (Safari < 17 lacks it)
function supportsOffscreen(): boolean {
  try {
    return typeof OffscreenCanvas !== "undefined" &&
      !!HTMLCanvasElement.prototype.transferControlToOffscreen
  } catch { return false }
}

export default function GlobeViewer({ selectedCountry, onCountryClick, isMobile = false }: GlobeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const offscreenStarted = useRef(false)

  // Tap tracking (touch → click for mobile)
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null)

  // ── init worker + offscreen canvas ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    if (!supportsOffscreen()) {
      // Fallback: load globe.gl on main thread (old behaviour, rare path)
      loadGlobeGlFallback(canvas, container, isMobile, selectedCountry, onCountryClick)
      return
    }

    const offscreen = canvas.transferControlToOffscreen()
    offscreenStarted.current = true

    const worker = new Worker(
      new URL("../workers/globe.worker.ts", import.meta.url),
      { type: "module" }
    )
    workerRef.current = worker

    const dpr = devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    // Set canvas CSS size explicitly
    canvas.style.width = w + "px"
    canvas.style.height = h + "px"

    worker.postMessage({
      type: "init",
      canvas: offscreen,
      width: Math.floor(w * dpr),
      height: Math.floor(h * dpr),
      devicePixelRatio: dpr,
      isMobile,
    }, [offscreen])

    worker.onmessage = (e) => {
      if (e.data?.type === "countryClick") {
        onCountryClick?.(e.data.name)
      }
    }

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container || !workerRef.current) return
      const dpr = devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.style.width = w + "px"
      canvas.style.height = h + "px"
      workerRef.current.postMessage({
        type: "resize",
        width: Math.floor(w * dpr),
        height: Math.floor(h * dpr),
      })
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      workerRef.current?.postMessage({ type: "destroy" })
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── sync selected country to worker ───────────────────────────────────────
  useEffect(() => {
    workerRef.current?.postMessage({ type: "selectCountry", name: selectedCountry })
  }, [selectedCountry])

  // ── mouse events → worker ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const send = (type: string, extra?: object) =>
      workerRef.current?.postMessage({ type, ...extra })

    const onMouseDown = (e: MouseEvent) => send("mousedown", { x: e.clientX, y: e.clientY })
    const onMouseUp = (e: MouseEvent) => send("mouseup", { x: e.clientX, y: e.clientY })
    const onMouseMove = (e: MouseEvent) => send("mousemove", { x: e.clientX, y: e.clientY })
    const onMouseLeave = () => send("mouseleave")
    const onWheel = (e: WheelEvent) => { e.preventDefault(); send("wheel", { delta: e.deltaY }) }

    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("mouseup", onMouseUp)
    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("mouseleave", onMouseLeave)
    canvas.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown)
      canvas.removeEventListener("mouseup", onMouseUp)
      canvas.removeEventListener("mousemove", onMouseMove)
      canvas.removeEventListener("mouseleave", onMouseLeave)
      canvas.removeEventListener("wheel", onWheel)
    }
  }, [])

  // ── touch events → worker + tap-to-click ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const send = (type: string, extra?: object) =>
      workerRef.current?.postMessage({ type, ...extra })

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      tapStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
      send("touchstart", { x: t.clientX, y: t.clientY })
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      send("touchmove", { x: t.clientX, y: t.clientY })
    }

    const onTouchEnd = (e: TouchEvent) => {
      send("touchend")
      if (!tapStart.current) return
      const s = tapStart.current
      const ct = e.changedTouches[0]
      if (ct && Math.abs(ct.clientX - s.x) < 12 && Math.abs(ct.clientY - s.y) < 12 && Date.now() - s.t < 300) {
        const rect = canvas.getBoundingClientRect()
        const ndcX = ((ct.clientX - rect.left) / rect.width) * 2 - 1
        const ndcY = -((ct.clientY - rect.top) / rect.height) * 2 + 1
        send("click", { x: ndcX, y: ndcY })
      }
      tapStart.current = null
    }

    // Translate desktop click to NDC click for worker raycast
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
      send("click", { x: ndcX, y: ndcY })
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: true })
    canvas.addEventListener("touchmove", onTouchMove, { passive: true })
    canvas.addEventListener("touchend", onTouchEnd, { passive: true })
    canvas.addEventListener("click", onClick)

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
      canvas.removeEventListener("click", onClick)
    }
  }, [onCountryClick])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ touchAction: "none" }}
      aria-label="interactive globe"
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  )
}

// ─── Fallback: globe.gl on main thread (browsers without OffscreenCanvas) ────
async function loadGlobeGlFallback(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  isMobile: boolean,
  selectedCountry: string | null,
  onCountryClick?: (name: string) => void,
) {
  const GEOJSON_URL =
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson"
  const PALETTE = [
    "#FF5722", "#2196F3", "#4CAF50", "#E91E63", "#9C27B0",
    "#00BCD4", "#FFC107", "#FF9800", "#8BC34A", "#03A9F4",
    "#FFEB3B", "#F44336", "#FF4081", "#CDDC39", "#00E676",
  ]
  const countryColor = (name: string) => {
    let h = 0; for (const c of name) h = (h + c.charCodeAt(0)) & 0xffff
    return PALETTE[h % PALETTE.length]
  }

  try {
    const { default: THREE } = await import("three")
    const { default: Factory } = await import("globe.gl")
    const g = Factory()(container)
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
    g.controls().enableZoom = true
    g.pointOfView({ altitude: isMobile ? 3.5 : 2.5 }, 0)

    const res = await fetch(GEOJSON_URL)
    const data = await res.json()
    const features = (data.features as any[]).filter(
      f => f.geometry != null &&
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
    )
    g.polygonsData(features)
      .polygonGeoJsonGeometry((d: any) => d.geometry)
      .polygonCapColor((d: any) => {
        const name = d?.properties?.ADMIN ?? ""
        return name === selectedCountry ? "rgba(255,255,255,0.95)" : countryColor(name)
      })
      .onPolygonClick((d: any) => {
        const name = d?.properties?.ADMIN ?? ""
        if (name) onCountryClick?.(name)
      })

    const resize = () => {
      g.width(container.clientWidth).height(container.clientHeight)
    }
    resize()
    new ResizeObserver(resize).observe(container)
  } catch (err) {
    console.error("Globe fallback error:", err)
  }
}

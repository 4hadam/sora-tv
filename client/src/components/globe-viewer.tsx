"use client"

/**
 * GlobeViewer — OffscreenCanvas + Web Worker
 * Main thread: zero Three.js, only forwards pointer events to worker.
 * Worker: full Three.js rendering (see globe.worker.ts).
 */
import { useEffect, useRef } from "react"

interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
}

export default function GlobeViewer({
  selectedCountry,
  onCountryClick,
  isMobile = false,
}: GlobeViewerProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const workerRef      = useRef<Worker | null>(null)
  const workerReadyRef = useRef(false)
  const pendingHlRef   = useRef<string | null>(null)

  // ── Globe init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    // OffscreenCanvas is required
    const canvas = document.createElement("canvas")
    canvas.style.cssText = "display:block;width:100%;height:100%;"
    container.appendChild(canvas)

    if (typeof (canvas as any).transferControlToOffscreen !== "function") {
      // Browser doesn't support OffscreenCanvas (old Safari) — show nothing
      return
    }

    const offscreen = (canvas as any).transferControlToOffscreen() as OffscreenCanvas
    const w   = container.clientWidth  || 300
    const h   = container.clientHeight || 300
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // ── Spawn worker ───────────────────────────────────────────────────────────
    const worker = new Worker(
      new URL("../workers/globe.worker.ts", import.meta.url),
      { type: "module" },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "ready") {
        workerReadyRef.current = true
        if (pendingHlRef.current !== null) {
          worker.postMessage({ type: "highlight", name: pendingHlRef.current })
          pendingHlRef.current = null
        }
      } else if (e.data.type === "countryClick") {
        onCountryClick?.(e.data.name as string)
      }
    }

    // ── Mouse drag ─────────────────────────────────────────────────────────────
    let isMouseDown   = false
    let mouseDownPos  = { x: 0, y: 0 }

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown   = true
      mouseDownPos  = { x: e.clientX, y: e.clientY }
      worker.postMessage({ type: "dragStart", x: e.clientX, y: e.clientY })
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return
      worker.postMessage({ type: "dragMove", x: e.clientX, y: e.clientY })
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return
      isMouseDown = false
      worker.postMessage({ type: "dragEnd" })
      // Treat as click if movement was < 5px
      if (
        Math.abs(e.clientX - mouseDownPos.x) < 5 &&
        Math.abs(e.clientY - mouseDownPos.y) < 5
      ) {
        const rect = canvas.getBoundingClientRect()
        const x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
        const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
        worker.postMessage({ type: "click", x, y })
      }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      worker.postMessage({ type: "wheel", delta: e.deltaY })
    }

    // ── Touch ──────────────────────────────────────────────────────────────────
    let touchId: number | null = null
    let touchStart: { x: number; y: number; t: number } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t     = e.touches[0]
        touchId     = t.identifier
        touchStart  = { x: t.clientX, y: t.clientY, t: Date.now() }
        worker.postMessage({ type: "dragStart", x: t.clientX, y: t.clientY })
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === touchId) {
          worker.postMessage({ type: "dragMove", x: t.clientX, y: t.clientY })
          break
        }
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== touchId) continue
        worker.postMessage({ type: "dragEnd" })
        if (touchStart) {
          const dx = Math.abs(t.clientX - touchStart.x)
          const dy = Math.abs(t.clientY - touchStart.y)
          if (dx < 15 && dy < 15 && Date.now() - touchStart.t < 300) {
            const rect = canvas.getBoundingClientRect()
            const x =  ((t.clientX - rect.left) / rect.width)  * 2 - 1
            const y = -((t.clientY - rect.top)  / rect.height) * 2 + 1
            worker.postMessage({ type: "click", x, y })
          }
        }
        touchId = null; touchStart = null; break
      }
    }

    canvas.addEventListener("mousedown",  onMouseDown)
    window.addEventListener("mousemove",  onMouseMove)
    window.addEventListener("mouseup",    onMouseUp)
    canvas.addEventListener("wheel",      onWheel,      { passive: false })
    canvas.addEventListener("touchstart", onTouchStart, { passive: true })
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: true })
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: true })

    // ── Resize ─────────────────────────────────────────────────────────────────
    resizeObserver = new ResizeObserver(() => {
      if (disposed || !container) return
      const nw = container.clientWidth
      const nh = container.clientHeight
      const nd = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.width  = `${nw}px`
      canvas.style.height = `${nh}px`
      worker.postMessage({
        type: "resize",
        width:           Math.floor(nw * nd),
        height:          Math.floor(nh * nd),
        devicePixelRatio: nd,
      })
    })
    resizeObserver.observe(container)

    // ── Transfer canvas to worker ──────────────────────────────────────────────
    worker.postMessage(
      {
        type:             "init",
        canvas:           offscreen,
        width:            Math.floor(w * dpr),
        height:           Math.floor(h * dpr),
        devicePixelRatio: dpr,
        isMobile,
      },
      [offscreen as unknown as Transferable],
    )

    return () => {
      disposed = true
      canvas.removeEventListener("mousedown",  onMouseDown)
      window.removeEventListener("mousemove",  onMouseMove)
      window.removeEventListener("mouseup",    onMouseUp)
      canvas.removeEventListener("wheel",      onWheel)
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove",  onTouchMove)
      canvas.removeEventListener("touchend",   onTouchEnd)
      resizeObserver?.disconnect()
      worker.terminate()
      workerRef.current      = null
      workerReadyRef.current = false
      canvas.remove()
    }
  }, [isMobile])

  // ── Highlight sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (workerRef.current && workerReadyRef.current) {
      workerRef.current.postMessage({ type: "highlight", name: selectedCountry })
    } else {
      pendingHlRef.current = selectedCountry
    }
  }, [selectedCountry])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent pointer-events-auto"
      aria-label="interactive globe"
      style={{ touchAction: "none" }}
    />
  )
}

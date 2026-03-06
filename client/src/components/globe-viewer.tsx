"use client"

import { useEffect, useRef } from "react"

interface GlobeViewerProps {
  selectedCountry: string | null
  onCountryClick?: (countryName: string) => void
  isMobile?: boolean
  onReady?: () => void
}

/**
 * Lightweight globe component — zero Three.js on main thread.
 * All 3D rendering happens inside an OffscreenCanvas Web Worker.
 * Main thread only forwards DOM events via postMessage.
 */
export default function GlobeViewer({ selectedCountry, onCountryClick, isMobile = false, onReady }: GlobeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const readyFired = useRef(false)

  // ── init worker + OffscreenCanvas ─────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement("canvas")
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    canvas.style.touchAction = "none"
    container.appendChild(canvas)
    canvasRef.current = canvas

    // OffscreenCanvas check
    if (!canvas.transferControlToOffscreen) {
      console.error("OffscreenCanvas not supported")
      onReady?.()
      return
    }

    const offscreen = canvas.transferControlToOffscreen()
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight

    const worker = new Worker(
      new URL("../workers/globe.worker.ts", import.meta.url),
      { type: "module" }
    )
    workerRef.current = worker

    // Send init with OffscreenCanvas (transferred)
    // NOTE: send CSS pixels — worker calls renderer.setPixelRatio(dpr) internally
    // Sending physical pixels causes double-scaling: controls feel 3x too slow on DPR=3 phones
    worker.postMessage({
      type: "init",
      canvas: offscreen,
      width: w,
      height: h,
      devicePixelRatio: dpr,
      isMobile,
    }, [offscreen])

    // Listen for messages from worker
    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === "ready" && !readyFired.current) {
        readyFired.current = true
        onReady?.()
      }
      if (msg.type === "countryClick" && msg.name) {
        onCountryClick?.(msg.name)
      }
      if (msg.type === "hover") {
        canvas.style.cursor = msg.name ? "pointer" : "grab"
      }
    }

    // ── Forward DOM events to worker ──────────────────────────────────────
    const post = (data: any) => worker.postMessage(data)

    const onMouseDown = (e: MouseEvent) => {
      post({ type: "mousedown", x: e.clientX, y: e.clientY })
    }
    const onMouseUp = () => post({ type: "mouseup" })
    const onMouseLeave = () => post({ type: "mouseleave" })
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
      post({ type: "mousemove", x: e.clientX, y: e.clientY, ndcX, ndcY })
    }
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      post({ type: "click", x, y })
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      post({ type: "wheel", delta: e.deltaY })
    }

    // Touch events
    let touchStartX = 0, touchStartY = 0, touchMoved = false
    let lastPinchDist = 0, isPinching = false
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.sqrt(dx * dx + dy * dy)
        post({ type: "touchend" })
        return
      }
      if (e.touches.length !== 1) return
      isPinching = false
      const t = e.touches[0]
      touchStartX = t.clientX
      touchStartY = t.clientY
      touchMoved = false
      post({ type: "touchstart", x: t.clientX, y: t.clientY })
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && isPinching) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const delta = (lastPinchDist - dist) * 3
        lastPinchDist = dist
        post({ type: "wheel", delta })
        return
      }
      if (e.touches.length !== 1 || isPinching) return
      const t = e.touches[0]
      touchMoved = true
      post({ type: "touchmove", x: t.clientX, y: t.clientY })
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) isPinching = false
      post({ type: "touchend" })
      // Tap detection: if didn't move, treat as click
      if (!touchMoved && !isPinching && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]
        const dx = t.clientX - touchStartX
        const dy = t.clientY - touchStartY
        if (dx * dx + dy * dy < 225) {
          const rect = canvas.getBoundingClientRect()
          const x = ((t.clientX - rect.left) / rect.width) * 2 - 1
          const y = -((t.clientY - rect.top) / rect.height) * 2 + 1
          post({ type: "click", x, y })
        }
      }
    }

    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("mouseup", onMouseUp)
    canvas.addEventListener("mouseleave", onMouseLeave)
    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("click", onClick)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("touchstart", onTouchStart, { passive: false })
    canvas.addEventListener("touchmove", onTouchMove, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd, { passive: true })

    // ── Resize observer ────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      worker.postMessage({
        type: "resize",
        width: cw,
        height: ch,
      })
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      canvas.removeEventListener("mousedown", onMouseDown)
      canvas.removeEventListener("mouseup", onMouseUp)
      canvas.removeEventListener("mouseleave", onMouseLeave)
      canvas.removeEventListener("mousemove", onMouseMove)
      canvas.removeEventListener("click", onClick)
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
      worker.postMessage({ type: "destroy" })
      worker.terminate()
      workerRef.current = null
      if (canvasRef.current && container.contains(canvasRef.current)) {
        container.removeChild(canvasRef.current)
      }
      canvasRef.current = null
    }
  }, [isMobile])

  // ── Forward country selection to worker ───────────────────────────────────
  useEffect(() => {
    workerRef.current?.postMessage({ type: "selectCountry", name: selectedCountry })
  }, [selectedCountry])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ touchAction: "none" }}
      aria-label="interactive globe"
    />
  )
}

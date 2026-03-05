"use client"

/**
 * GlobeViewer — Web Worker + OffscreenCanvas edition
 *
 * Architecture:
 *  - Main thread: canvas DOM + THREE.OrbitControls (camera only, no WebGL)
 *  - Worker thread: THREE.WebGLRenderer on OffscreenCanvas (TBT ≈ 0ms)
 *  - Camera state synced main→worker each frame via postMessage
 *
 * Gracefully degrades when OffscreenCanvas is unsupported (old Safari).
 */
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

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
  const animIdRef      = useRef<number>(0)

  // ── Main setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let canvas: HTMLCanvasElement | null = null
    let resizeObserver: ResizeObserver | null = null
    let controls: OrbitControls | null = null

    const init = async () => {
      canvas = document.createElement("canvas")
      canvas.style.cssText = "display:block;width:100%;height:100%;"
      container.appendChild(canvas)

      // Degrade gracefully when OffscreenCanvas is unsupported
      if (typeof (canvas as any).transferControlToOffscreen !== "function") {
        console.warn("[GlobeViewer] OffscreenCanvas not supported — globe skipped")
        return
      }

      const offscreen = (canvas as any).transferControlToOffscreen()
      const w   = container.clientWidth
      const h   = container.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      // Camera lives on the main thread (OrbitControls needs DOM events)
      const camera = new THREE.PerspectiveCamera(45, w / h, 10, 2000)
      camera.position.set(0, 0, isMobile ? 310 : 260)

      controls = new OrbitControls(camera, canvas)
      controls.enablePan     = false
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.minDistance   = 150
      controls.maxDistance   = 500

      // Worker carries the WebGL renderer + scene
      const worker = new Worker(
        new URL("../workers/globe.worker.ts", import.meta.url),
        { type: "module" },
      )
      workerRef.current = worker

      const syncCamera = () => {
        if (!workerReadyRef.current) return
        worker.postMessage({
          type:            "updateCamera",
          position:        camera.position.toArray(),
          quaternion:      camera.quaternion.toArray(),
          projectionMatrix: Array.from(camera.projectionMatrix.elements),
        })
      }
      controls.addEventListener("change", syncCamera)

      // Minimal animation loop — only keeps damping alive and camera synced
      const tick = () => {
        if (disposed) return
        animIdRef.current = requestAnimationFrame(tick)
        controls!.update()
      }
      tick()

      // Worker messages
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === "ready") {
          workerReadyRef.current = true
          syncCamera()
          if (pendingHlRef.current !== null) {
            worker.postMessage({ type: "highlight", name: pendingHlRef.current })
            pendingHlRef.current = null
          }
        } else if (e.data.type === "countryClick") {
          onCountryClick?.(e.data.name as string)
        }
      }

      // Desktop click → raycasting in worker
      const handleClick = (ev: MouseEvent) => {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x =  ((ev.clientX - rect.left) / rect.width)  * 2 - 1
        const y = -((ev.clientY - rect.top)  / rect.height) * 2 + 1
        worker.postMessage({ type: "click", x, y })
      }
      canvas.addEventListener("click", handleClick)

      // Mobile tap → raycasting in worker
      let touchStart: { x: number; y: number; t: number } | null = null
      const onTouchStart = (ev: TouchEvent) => {
        if (ev.touches.length === 1)
          touchStart = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, t: Date.now() }
      }
      const onTouchEnd = (ev: TouchEvent) => {
        if (!touchStart || !canvas || ev.changedTouches.length === 0) return
        const t = ev.changedTouches[0]
        if (Math.abs(t.clientX - touchStart.x) < 15 &&
            Math.abs(t.clientY - touchStart.y) < 15 &&
            Date.now() - touchStart.t < 300) {
          const rect = canvas.getBoundingClientRect()
          const x =  ((t.clientX - rect.left) / rect.width)  * 2 - 1
          const y = -((t.clientY - rect.top)  / rect.height) * 2 + 1
          worker.postMessage({ type: "click", x, y })
        }
        touchStart = null
      }
      canvas.addEventListener("touchstart", onTouchStart, { passive: true })
      canvas.addEventListener("touchend",   onTouchEnd,   { passive: true })

      // Resize — update camera aspect + notify worker
      resizeObserver = new ResizeObserver(() => {
        if (!container || !canvas || disposed) return
        const nw = container.clientWidth
        const nh = container.clientHeight
        const nd = Math.min(window.devicePixelRatio || 1, 2)
        canvas.style.width  = `${nw}px`
        canvas.style.height = `${nh}px`
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        worker.postMessage({ type: "resize", width: Math.floor(nw * nd), height: Math.floor(nh * nd), devicePixelRatio: nd })
        syncCamera()
      })
      resizeObserver.observe(container)

      // Send canvas to worker (transfers ownership)
      worker.postMessage(
        { type: "init", canvas: offscreen, width: Math.floor(w * dpr), height: Math.floor(h * dpr), devicePixelRatio: dpr, isMobile },
        [offscreen],
      )
    }

    init()

    return () => {
      disposed = true
      cancelAnimationFrame(animIdRef.current)
      controls?.dispose()
      workerRef.current?.terminate()
      workerRef.current    = null
      workerReadyRef.current = false
      resizeObserver?.disconnect()
      canvas?.remove()
    }
  }, [isMobile])

  // Highlight sync
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
      aria-label="interactive globe viewer"
      style={{ touchAction: "none" }}
    />
  )
}

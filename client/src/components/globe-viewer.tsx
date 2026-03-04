"use client"

import { useEffect, useRef, useCallback } from "react"

// Web Worker for globe rendering using OffscreenCanvas
// This keeps all heavy 3D rendering off the main thread
import GlobeWorker from "../workers/globe.worker?worker"

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
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const lastPointerXRef = useRef<number>(0)
  const isReadyRef = useRef<boolean>(false)

  // Initialize worker and OffscreenCanvas
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    // Check for OffscreenCanvas support
    if (typeof OffscreenCanvas === 'undefined') {
      console.warn('OffscreenCanvas not supported, falling back to main thread')
      // Could implement fallback here
      return
    }

    const canvas = canvasRef.current
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Transfer canvas control to worker
    const offscreen = canvas.transferControlToOffscreen()

    // Create worker
    const worker = new GlobeWorker()
    workerRef.current = worker

    // Handle messages from worker
    worker.onmessage = (e: MessageEvent) => {
      const { type, data } = e.data

      switch (type) {
        case 'ready':
          isReadyRef.current = true
          break
        case 'countries-loaded':
          // Countries loaded in worker
          break
        case 'country-clicked':
          if (data?.country && onCountryClick) {
            onCountryClick(data.country)
          }
          break
      }
    }

    // Initialize worker with canvas
    worker.postMessage(
      {
        type: 'init',
        data: {
          canvas: offscreen,
          width,
          height,
          isMobile
        }
      },
      [offscreen]
    )

    // Handle resize
    const updateSize = () => {
      if (!containerRef.current || !workerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      workerRef.current.postMessage({
        type: 'resize',
        data: { width: newWidth, height: newHeight }
      })
    }

    resizeObserverRef.current = new ResizeObserver(() => updateSize())
    resizeObserverRef.current.observe(container)

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'destroy' })
        workerRef.current.terminate()
        workerRef.current = null
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      isReadyRef.current = false
    }
  }, [isMobile, onCountryClick])

  // Send selected country to worker
  useEffect(() => {
    if (workerRef.current && isReadyRef.current) {
      workerRef.current.postMessage({
        type: 'select-country',
        data: { country: selectedCountry }
      })
    }
  }, [selectedCountry])

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    lastPointerXRef.current = e.clientX
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerdown' })
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerup' })
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 1 && workerRef.current) {
      const deltaX = e.clientX - lastPointerXRef.current
      lastPointerXRef.current = e.clientX
      workerRef.current.postMessage({
        type: 'pointermove',
        data: { deltaX }
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent pointer-events-auto"
      aria-label="3D interactive globe"
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}
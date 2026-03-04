"use client"

import { useEffect, useRef, useCallback } from "react"

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
  const isReadyRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerRef = useRef<{ x: number } | null>(null)

  // Initialize worker and offscreen canvas
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Set canvas size
    canvas.width = width * Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    canvas.height = height * Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Check for OffscreenCanvas support
    if (!canvas.transferControlToOffscreen) {
      console.warn('OffscreenCanvas not supported, falling back to main thread rendering')
      // Fallback to simple static globe or basic rendering
      return
    }

    // Transfer canvas to offscreen
    const offscreen = canvas.transferControlToOffscreen()

    // Create worker
    const worker = new Worker(
      new URL('../workers/globe.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    // Handle messages from worker
    worker.onmessage = (e) => {
      const { type, data } = e.data

      switch (type) {
        case 'ready':
          isReadyRef.current = true
          break
        case 'countries-loaded':
          console.log(`Globe: ${data?.count || 0} countries loaded`)
          break
        case 'country-clicked':
          if (onCountryClick && data?.country) {
            onCountryClick(data.country)
          }
          break
      }
    }

    // Initialize worker with offscreen canvas
    worker.postMessage(
      {
        type: 'init',
        data: {
          canvas: offscreen,
          width: canvas.width,
          height: canvas.height,
          isMobile
        }
      },
      [offscreen]
    )

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (workerRef.current && isReadyRef.current) {
          const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
          workerRef.current.postMessage({
            type: 'resize',
            data: { width: w * dpr, height: h * dpr }
          })
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'destroy' })
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [isMobile, onCountryClick])

  // Update selected country
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
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    lastPointerRef.current = { x: e.clientX }
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerdown' })
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current && lastPointerRef.current && workerRef.current) {
      const deltaX = e.clientX - lastPointerRef.current.x
      lastPointerRef.current = { x: e.clientX }
      workerRef.current.postMessage({
        type: 'pointermove',
        data: { deltaX }
      })
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    pointerStartRef.current = null
    lastPointerRef.current = null
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerup' })
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerStartRef.current = null
    lastPointerRef.current = null
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerup' })
    }
  }, [])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      pointerStartRef.current = { x: touch.clientX, y: touch.clientY }
      lastPointerRef.current = { x: touch.clientX }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'pointerdown' })
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastPointerRef.current && workerRef.current) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - lastPointerRef.current.x
      lastPointerRef.current = { x: touch.clientX }
      workerRef.current.postMessage({
        type: 'pointermove',
        data: { deltaX }
      })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    pointerStartRef.current = null
    lastPointerRef.current = null
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pointerup' })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}

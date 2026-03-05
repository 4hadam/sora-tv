"use client"

import { useEffect, useRef, useCallback } from "react"
import * as THREE from "three"
import type { GlobeInstance } from "globe.gl"

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
  const globeRef = useRef<GlobeInstance | null>(null)
  const hoveredPolygonRef = useRef<any>(null)
  const polygonsDataRef = useRef<any>(null)
  const starsRef = useRef<THREE.Group | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const vividPalette = [
    "#FFEB3B", "#FF5722", "#2196F3", "#4CAF50", "#E91E63",
    "#9C27B0", "#00BCD4", "#FFC107", "#FF9800", "#8BC34A",
    "#03A9F4", "#F44336", "#FF4081", "#CDDC39", "#00E676"
  ]

  const getPolygonColor = useCallback(
    (d: any) => {
      const countryName = d?.properties?.ADMIN || ""
      if (countryName === selectedCountry) {
        return "rgba(255, 255, 255, 0.95)"
      }
      const hash = countryName.split("").reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)
      const color = vividPalette[hash % vividPalette.length]
      return color
    },
    [selectedCountry],
  )

  useEffect(() => {
    let aborted = false
    const aborter = new AbortController()

    const initGlobe = async () => {
      if (!containerRef.current) return
      const GlobeFactory = (await import("globe.gl")).default

      const globe = GlobeFactory()(containerRef.current)
        .globeImageUrl(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        )
        .showAtmosphere(true)
        .atmosphereColor("#4488FF")
        .atmosphereAltitude(0.28)
        .polygonSideColor(() => "rgba(255,255,255,0.1)")
        // ≡ا¤┤≡ا¤┤≡ا¤┤ ╪د┘╪ز╪╣╪»┘è┘ ┘ç┘╪د: ╪ح╪╕┘ç╪د╪▒ ╪د┘╪ص╪»┘ê╪» ┘┘é╪╖ ╪╣┘┘ë ╪│╪╖╪ص ╪د┘┘à┘â╪ز╪ذ ≡ا¤┤≡ا¤┤≡ا¤┤
        .polygonStrokeColor(() => isMobile ? "transparent" : "rgba(0,0,0,0.25)")

      globe.renderOrder = 1;
      globe.scene().background = new THREE.Color(0x000000)
      globe.renderer().setClearColor(0x000000, 1)
      globe.renderer().antialias = false
      globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      globeRef.current = globe

      const updateSize = () => {
        if (containerRef.current && globeRef.current) {
          const width = containerRef.current.clientWidth
          const height = containerRef.current.clientHeight
          globeRef.current.width(width).height(height)
        }
      }
      updateSize()
      if (containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => updateSize())
        resizeObserverRef.current.observe(containerRef.current)
      }
      window.addEventListener("resize", updateSize)

      const controls = globe.controls()
      controls.autoRotate = false
      controls.enableZoom = true
      controls.minDistance = 150
      controls.maxDistance = 500

      const initialAltitude = isMobile ? 3.5 : 2.5;
      globe.pointOfView({ altitude: initialAltitude }, 0);

      // ظ£ذ ┘╪ش┘ê┘à ┘à┘┘ê┘╪ر (┘à╪س┘ famelack) - 3 ╪╖╪ذ┘é╪د╪ز + 7 ╪ث┘┘ê╪د┘ ┘ê╪د┘é╪╣┘è╪ر + ╪ز┘ê╪▓┘è╪╣ ┘â╪▒┘ê┘è
      const scene = globe.scene()
      const starGroup = new THREE.Group()
      starGroup.renderOrder = -1

      // ╪ز┘ê╪▓┘è╪╣ ╪د┘╪ث┘┘ê╪د┘ ╪د┘┘ê╪د┘é╪╣┘è╪ر ┘┘┘╪ش┘ê┘à (┘à╪س┘ ╪╖┘è┘ ┘╪ش┘ê┘à ┘╪╣┘┘è╪ر)
      const starColorPalette = [
        { hue: 240, prob: 0.05 },  // ╪ث╪▓╪▒┘é (┘╪د╪»╪▒)
        { hue: 220, prob: 0.10 },  // ╪ث╪▓╪▒┘é ┘╪د╪ز╪ص
        { hue: 200, prob: 0.15 },  // ╪│┘à╪د┘ê┘è
        { hue: 170, prob: 0.20 },  // ╪ث╪«╪╢╪▒-╪│┘à╪د┘ê┘è
        { hue:  60, prob: 0.25 },  // ╪ث╪╡┘╪▒ (╪د┘╪ث┘â╪س╪▒ ╪┤┘è┘ê╪╣╪د┘ï)
        { hue:  30, prob: 0.15 },  // ╪ذ╪▒╪ز┘é╪د┘┘è
        { hue:   0, prob: 0.10 },  // ╪ث╪ص┘à╪▒
      ]

      const pickStarHue = () => {
        const r = Math.random()
        let acc = 0
        for (const c of starColorPalette) {
          acc += c.prob
          if (r < acc) return c.hue
        }
        return 0
      }

      // ╪ز┘ê╪▓┘è╪╣ ╪╣╪┤┘ê╪د╪خ┘è ╪╡╪ص┘è╪ص ╪╣┘┘ë ╪│╪╖╪ص ╪د┘┘â╪▒╪ر (arccos formula - ┘à╪س┘ famelack)
      const randomSpherePoints = (radius: number, count: number): number[] => {
        const pts: number[] = []
        for (let i = 0; i < count; i++) {
          const u = Math.random()
          const v = Math.random()
          const theta = 2 * Math.PI * u
          const phi   = Math.acos(2 * v - 1)
          pts.push(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi),
          )
        }
        return pts
      }

      // ╪ح┘╪┤╪د╪ة ╪╖╪ذ┘é╪ر ┘╪ش┘ê┘à ╪ذ┘┘ê┘ ┘╪▒╪»┘è ┘┘â┘ ┘╪ش┘à╪ر
      const addStarLayer = (count: number, radius: number, size: number) => {
        const positions = randomSpherePoints(radius, count)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3))

        // ┘â┘ ┘╪ش┘à╪ر ╪ز╪ث╪«╪░ ┘┘ê┘╪د┘ï ┘à┘ ╪د┘╪╖┘è┘ ╪د┘┘ê╪د┘é╪╣┘è
        const colors = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const hue = pickStarHue()
          const lightness = Math.min((Math.random() * 20 + 70) * (Math.random() * 0.5 + 0.75), 100)
          const color = new THREE.Color(`hsl(${hue}, 100%, ${lightness}%)`)
          colors[i * 3]     = color.r
          colors[i * 3 + 1] = color.g
          colors[i * 3 + 2] = color.b
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

        const material = new THREE.PointsMaterial({
          size,
          sizeAttenuation: true,
          vertexColors: true,
          depthWrite: false,
          transparent: false,
          depthTest: false,
        })
        starGroup.add(new THREE.Points(geometry, material))
      }

      // 3 ╪╖╪ذ┘é╪د╪ز: ╪╡╪║┘è╪▒╪ر ┘â╪س┘è┘╪ر + ┘à╪ز┘ê╪│╪╖╪ر + ┘â╪ذ┘è╪▒╪ر ┘╪د╪»╪▒╪ر (┘┘╪│ ┘╪│╪ذ famelack)
      if (isMobile) {
        addStarLayer(500,  1000, 1.0)
        addStarLayer(600,  1000, 3.5)
        addStarLayer(200,  1000, 5.0)
      } else {
        addStarLayer(700,  1000, 1.0)
        addStarLayer(800,  1000, 3.5)
        addStarLayer(300,  1000, 5.0)
      }

      scene.add(starGroup)
      starsRef.current = starGroup

      // (╪ز╪ص┘à┘è┘ ╪ذ┘è╪د┘╪د╪ز ╪د┘╪»┘ê┘)
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
          { signal: aborter.signal },
        )
        const geojsonData = await response.json()
        if (aborted) return

        // ≡ا¤┤ --- ╪ذ╪»╪د┘è╪ر: ┘â┘ê╪» ╪»┘à╪ش ╪«╪▒┘è╪╖╪ر ╪د┘┘à╪║╪▒╪ذ ---
        const features = geojsonData.features;

        // ╪د┘╪╣╪س┘ê╪▒ ╪╣┘┘ë ┘à╪╢┘╪╣ ╪د┘┘à╪║╪▒╪ذ ┘ê┘à╪╢┘╪╣ ╪د┘╪╡╪ص╪▒╪د╪ة ╪د┘╪║╪▒╪ذ┘è╪ر
        const moroccoFeature = features.find(
          (f: any) => f.properties.ADMIN === "Morocco"
        );
        const wSaharaFeature = features.find(
          (f: any) => f.properties.ADMIN === "Western Sahara"
        );

        let unifiedFeatures = features;

        if (moroccoFeature && wSaharaFeature) {
          // ╪»╪د┘╪ر ┘à╪│╪د╪╣╪»╪ر ┘╪╢┘à╪د┘ ╪ث┘ ╪د┘╪ح╪ص╪»╪د╪س┘è╪د╪ز ╪»╪د╪خ┘à╪د┘ï ╪ذ╪ز┘╪│┘è┘é MultiPolygon
          const getCoords = (feature: any) => {
            const geom = feature.geometry;
            return geom.type === "Polygon"
              ? [geom.coordinates] // ╪ز╪ص┘ê┘è┘ Polygon ╪ح┘┘ë [MultiPolygon]
              : geom.coordinates; // ┘ç┘ê ╪ث╪╡┘╪د┘ï MultiPolygon
          };

          // ╪»┘à╪ش ╪ح╪ص╪»╪د╪س┘è╪د╪ز ╪د┘┘à╪╢┘╪╣┘è┘
          const mergedCoords = [
            ...getCoords(moroccoFeature),
            ...getCoords(wSaharaFeature),
          ];

          // ╪ز╪ص╪»┘è╪س ┘à╪╢┘╪╣ ╪د┘┘à╪║╪▒╪ذ ┘┘è╪ص╪ز┘ê┘è ╪╣┘┘ë ╪د┘╪ح╪ص╪»╪د╪س┘è╪د╪ز ╪د┘┘à╪»┘à╪ش╪ر
          moroccoFeature.geometry.type = "MultiPolygon";
          moroccoFeature.geometry.coordinates = mergedCoords;

          // ╪ص╪░┘ ┘à╪╢┘╪╣ ╪د┘╪╡╪ص╪▒╪د╪ة ╪د┘╪║╪▒╪ذ┘è╪ر ┘à┘ ╪د┘┘é╪د╪خ┘à╪ر
          unifiedFeatures = features.filter(
            (f: any) => f.properties.ADMIN !== "Western Sahara"
          );
        }
        // ≡ا¤┤ --- ┘┘ç╪د┘è╪ر: ┘â┘ê╪» ╪»┘à╪ش ╪«╪▒┘è╪╖╪ر ╪د┘┘à╪║╪▒╪ذ ---

        polygonsDataRef.current = unifiedFeatures // ≡اّê ╪د╪│╪ز╪«╪»┘à ╪د┘╪ذ┘è╪د┘╪د╪ز ╪د┘┘à┘ê╪ص╪»╪ر

        globe
          .polygonsData(unifiedFeatures) // ≡اّê ╪د╪│╪ز╪«╪»┘à ╪د┘╪ذ┘è╪د┘╪د╪ز ╪د┘┘à┘ê╪ص╪»╪ر
          .polygonGeoJsonGeometry((d: any) => d.geometry)
          .polygonCapColor(getPolygonColor)
          .polygonLabel((d: any) => d.properties?.ADMIN || "")
          .polygonAltitude(0.01) // ┘é┘è┘à╪ر ╪س╪د╪ذ╪ز╪ر (┘╪د ╪ذ╪▒┘ê╪▓)
          .onPolygonHover((hoverD: any) => {
            hoveredPolygonRef.current = hoverD
          })
          .onPolygonClick((clickedD: any) => {
            const countryName = clickedD?.properties?.ADMIN || ""
            if (countryName && onCountryClick) onCountryClick(countryName)
          })
      } catch (err) {
        if (!aborted) {
          // Error loading countries data - silently fail with fallback
        }
      }
    }

    const cleanup = initGlobe()
    return () => {
      aborted = true
      aborter.abort()
      if (starsRef.current) {
        globeRef.current?.scene().remove(starsRef.current)
        starsRef.current.children.forEach((c: any) => {
          c.geometry.dispose()
          c.material.dispose()
        })
      }
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect()
      cleanup?.then?.((fn) => typeof fn === "function" && fn())
    }
  }, [isMobile])

  // ╪ز╪ص╪»┘è╪س ╪د┘╪ث┘┘ê╪د┘ ╪╣┘╪» ╪ز╪║┘è┘è╪▒ ╪د┘╪»┘ê┘╪ر
  useEffect(() => {
    if (globeRef.current && polygonsDataRef.current) {
      globeRef.current.polygonCapColor(getPolygonColor)
    }
  }, [selectedCountry, getPolygonColor])

  // ┘à╪▒╪د┘é╪ذ╪ر ╪ز╪║┘è┘è╪▒ ╪ص╪ش┘à ╪د┘╪┤╪د╪┤╪ر (┘ç╪د╪ز┘/┘à┘â╪ز╪ذ)
  useEffect(() => {
    if (globeRef.current) {
      const altitude = isMobile ? 3.5 : 2.5;
      globeRef.current.pointOfView({ altitude: altitude }, 400);
    }
  }, [isMobile])

  // ┘à╪╣╪د┘╪ش ╪ث╪ص╪»╪د╪س Touch ┘┘┘à┘ê╪ذ╪د┘è┘ - ╪ز╪ص┘ê┘è┘ ╪د┘╪╢╪║╪╖╪ر ╪ح┘┘ë Click
  useEffect(() => {
    if (!isMobile || !globeRef.current || !containerRef.current) return;

    let touchIdentifier: number | null = null;
    const touchThreshold = 15; // ╪ذ┘â╪│┘

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchIdentifier = touch.identifier;
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || touchIdentifier === null) return;

      let touchEnd = null;
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === touchIdentifier) {
          touchEnd = touch;
          break;
        }
      }

      if (!touchEnd) return;

      const { x: startX, y: startY, time: startTime } = touchStartRef.current;
      const deltaX = Math.abs(touchEnd.clientX - startX);
      const deltaY = Math.abs(touchEnd.clientY - startY);
      const deltaTime = Date.now() - startTime;

      // ╪د┘╪ز╪ص┘é┘é ┘à┘ ╪ث┘┘ç╪د ╪╢╪║╪╖╪ر ┘é╪╡┘è╪▒╪ر ┘ê┘┘è╪│╪ز ╪ص╪▒┘â╪ر ┘à╪│╪ص
      if (deltaX <= touchThreshold && deltaY <= touchThreshold && deltaTime < 300) {
        // ┘à╪ص╪د┘ê┘╪ر ╪د┘╪ص╪╡┘ê┘ ╪╣┘┘ë ╪د┘╪»┘ê┘╪ر ╪د┘┘à┘╪╢╪║┘ê╪╖ ╪╣┘┘è┘ç╪د
        if (polygonsDataRef.current && globeRef.current) {
          const rect = containerRef.current!.getBoundingClientRect();
          const canvasX = (touchEnd.clientX - rect.left) / rect.width;
          const canvasY = (touchEnd.clientY - rect.top) / rect.height;

          // ╪د╪│╪ز╪«╪»┘à raycasting ╪»╪د╪«┘ globe.gl
          const camera = globeRef.current.camera?.();
          const renderer = globeRef.current.renderer?.();

          if (camera && renderer && canvasX >= 0 && canvasX <= 1 && canvasY >= 0 && canvasY <= 1) {
            const mouse = new THREE.Vector2();
            mouse.x = canvasX * 2 - 1;
            mouse.y = -(canvasY * 2 - 1);

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const scene = globeRef.current.scene?.();
            if (scene) {
              // ╪د┘╪ذ╪ص╪س ┘┘è ╪ش┘à┘è╪╣ ╪د┘┘â╪د╪خ┘╪د╪ز ┘┘è ╪د┘┘à╪┤┘ç╪»
              const allObjects: THREE.Object3D[] = [];
              scene.traverse((obj) => {
                allObjects.push(obj);
              });

              const intersects = raycaster.intersectObjects(allObjects, true);

              // ╪د┘╪ذ╪ص╪س ╪╣┘ ╪ذ┘è╪د┘╪د╪ز feature ┘┘è ╪د┘┘â╪د╪خ┘╪د╪ز ╪د┘┘à╪ز┘é╪د╪╖╪╣╪ر
              for (const intersection of intersects) {
                const userData = (intersection.object as any).userData;
                if (userData?.feature?.properties?.ADMIN) {
                  const countryName = userData.feature.properties.ADMIN;
                  if (onCountryClick) {
                    onCountryClick(countryName);
                  }
                  break;
                }
              }
            }
          }
        }
      }

      touchIdentifier = null;
      touchStartRef.current = null;
    };

    containerRef.current.addEventListener("touchstart", handleTouchStart, { passive: true });
    containerRef.current.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      containerRef.current?.removeEventListener("touchstart", handleTouchStart);
      containerRef.current?.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, onCountryClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent pointer-events-auto"
      aria-label="pixelated dot stars globe"
      style={{ touchAction: "none" }}
    />
  );
}

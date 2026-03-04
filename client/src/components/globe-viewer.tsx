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
        // 🔴🔴🔴 التعديل هنا: إظهار الحدود فقط على سطح المكتب 🔴🔴🔴
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

      // (نجوم)
      const scene = globe.scene()
      const starGroup = new THREE.Group()
      starGroup.renderOrder = -1;

      const createStars = (count: number, color: string, size: number, spread: number) => {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * spread
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

        const material = new THREE.PointsMaterial({
          color: color, size: size, sizeAttenuation: true,
          depthWrite: false, transparent: false, depthTest: false,
        })
        const stars = new THREE.Points(geometry, material)
        starGroup.add(stars)
      }

      const whiteColor = "#FFFFFF";
      const goldenColor = "#FFEBBE";

      if (isMobile) {
        createStars(500, whiteColor, 4.0, 6000)
        createStars(300, goldenColor, 3.5, 7500)
      } else {
        createStars(1500, whiteColor, 4.5, 6000)
        createStars(1000, goldenColor, 3.6, 7500)
      }

      scene.add(starGroup)
      starsRef.current = starGroup

      // (تحميل بيانات الدول)
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
          { signal: aborter.signal },
        )
        const geojsonData = await response.json()
        if (aborted) return

        // 🔴 --- بداية: كود دمج خريطة المغرب ---
        const features = geojsonData.features;

        // العثور على مضلع المغرب ومضلع الصحراء الغربية
        const moroccoFeature = features.find(
          (f: any) => f.properties.ADMIN === "Morocco"
        );
        const wSaharaFeature = features.find(
          (f: any) => f.properties.ADMIN === "Western Sahara"
        );

        let unifiedFeatures = features;

        if (moroccoFeature && wSaharaFeature) {
          // دالة مساعدة لضمان أن الإحداثيات دائماً بتنسيق MultiPolygon
          const getCoords = (feature: any) => {
            const geom = feature.geometry;
            return geom.type === "Polygon"
              ? [geom.coordinates] // تحويل Polygon إلى [MultiPolygon]
              : geom.coordinates; // هو أصلاً MultiPolygon
          };

          // دمج إحداثيات المضلعين
          const mergedCoords = [
            ...getCoords(moroccoFeature),
            ...getCoords(wSaharaFeature),
          ];

          // تحديث مضلع المغرب ليحتوي على الإحداثيات المدمجة
          moroccoFeature.geometry.type = "MultiPolygon";
          moroccoFeature.geometry.coordinates = mergedCoords;

          // حذف مضلع الصحراء الغربية من القائمة
          unifiedFeatures = features.filter(
            (f: any) => f.properties.ADMIN !== "Western Sahara"
          );
        }
        // 🔴 --- نهاية: كود دمج خريطة المغرب ---

        polygonsDataRef.current = unifiedFeatures // 👈 استخدم البيانات الموحدة

        globe
          .polygonsData(unifiedFeatures) // 👈 استخدم البيانات الموحدة
          .polygonGeoJsonGeometry((d: any) => d.geometry)
          .polygonCapColor(getPolygonColor)
          .polygonLabel((d: any) => d.properties?.ADMIN || "")
          .polygonAltitude(0.01) // قيمة ثابتة (لا بروز)
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

  // تحديث الألوان عند تغيير الدولة
  useEffect(() => {
    if (globeRef.current && polygonsDataRef.current) {
      globeRef.current.polygonCapColor(getPolygonColor)
    }
  }, [selectedCountry, getPolygonColor])

  // مراقبة تغيير حجم الشاشة (هاتف/مكتب)
  useEffect(() => {
    if (globeRef.current) {
      const altitude = isMobile ? 3.5 : 2.5;
      globeRef.current.pointOfView({ altitude: altitude }, 400);
    }
  }, [isMobile])

  // معالج أحداث Touch للموبايل - تحويل الضغطة إلى Click
  useEffect(() => {
    if (!isMobile || !globeRef.current || !containerRef.current) return;

    let touchIdentifier: number | null = null;
    const touchThreshold = 15; // بكسل

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

      // التحقق من أنها ضغطة قصيرة وليست حركة مسح
      if (deltaX <= touchThreshold && deltaY <= touchThreshold && deltaTime < 300) {
        // محاولة الحصول على الدولة المُضغوط عليها
        if (polygonsDataRef.current && globeRef.current) {
          const rect = containerRef.current!.getBoundingClientRect();
          const canvasX = (touchEnd.clientX - rect.left) / rect.width;
          const canvasY = (touchEnd.clientY - rect.top) / rect.height;

          // استخدم raycasting داخل globe.gl
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
              // البحث في جميع الكائنات في المشهد
              const allObjects: THREE.Object3D[] = [];
              scene.traverse((obj) => {
                allObjects.push(obj);
              });

              const intersects = raycaster.intersectObjects(allObjects, true);

              // البحث عن بيانات feature في الكائنات المتقاطعة
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
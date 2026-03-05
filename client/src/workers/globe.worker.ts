/**
 * Globe Web Worker — Three.js rendering on OffscreenCanvas
 *
 * Key differences from globe.gl approach:
 *  - Runs in a separate thread → TBT = 0ms
 *  - Uses THREE.ShapeGeometry (earcut) → correct rendering for all countries
 *  - Manual orbit + damping (no OrbitControls DOM dependency)
 *  - Globe sphere + atmosphere (ShaderMaterial) + stars
 */
import * as THREE from "three"

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 100

const VIVID_PALETTE = [
  "#FFEB3B", "#FF5722", "#2196F3", "#4CAF50", "#E91E63",
  "#9C27B0", "#00BCD4", "#FFC107", "#FF9800", "#8BC34A",
  "#03A9F4", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]

// ─── Scene state ──────────────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera

// Manual orbit camera
let camTheta  = 0                // horizontal angle
let camPhi    = Math.PI / 2     // vertical angle (0 = north pole)
let camRadius = 260

// Inertia
let velTheta    = 0
let velPhi      = 0
let isDragging  = false
let prevDragX   = 0
let prevDragY   = 0
const DAMPING   = 0.88

// Country data
const countryMeshes = new Map<string, THREE.Mesh[]>()
const baseColors    = new Map<string, string>()
let highlighted: string | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────
function latLngToVec3(lat: number, lng: number, R: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
     R * Math.cos(phi),
     R * Math.sin(phi) * Math.sin(theta),
  )
}

function getCountryColor(name: string): string {
  if (!baseColors.has(name)) {
    let hash = 0
    for (const ch of name) hash += ch.charCodeAt(0)
    baseColors.set(name, VIVID_PALETTE[hash % VIVID_PALETTE.length])
  }
  return baseColors.get(name)!
}

function updateCamera() {
  camera.position.set(
    camRadius * Math.sin(camPhi) * Math.cos(camTheta),
    camRadius * Math.cos(camPhi),
    camRadius * Math.sin(camPhi) * Math.sin(camTheta),
  )
  camera.lookAt(0, 0, 0)
}

// ─── Scene building ───────────────────────────────────────────────────────────
function buildScene(
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  dpr: number,
  isMobile: boolean,
) {
  camRadius = isMobile ? 310 : 260

  renderer = new THREE.WebGLRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    antialias: false,
    powerPreference: "high-performance",
    alpha: false,
  })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(dpr, 1.5))

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(45, width / height, 10, 2000)
  updateCamera()

  addGlobe()
  addAtmosphere()
  addStars(isMobile)
  loadCountries()
}

// Dark globe sphere
function addGlobe() {
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x060d1e }),
  ))
}

// Blue rim glow — BackSide ShaderMaterial (same as famelack)
function addAtmosphere() {
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { glowColor: { value: new THREE.Color(0x4488ff) } },
      vertexShader: /* glsl */`
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, max(intensity, 0.0));
        }
      `,
    }),
  ))
}

// Stars — 3 layers, 7 realistic color bands, arccos spherical distribution
function addStars(isMobile: boolean) {
  const palette = [
    { hue: 240, prob: 0.05 },
    { hue: 220, prob: 0.10 },
    { hue: 200, prob: 0.15 },
    { hue: 170, prob: 0.20 },
    { hue:  60, prob: 0.25 },
    { hue:  30, prob: 0.15 },
    { hue:   0, prob: 0.10 },
  ]
  const pickHue = () => {
    let acc = 0; const r = Math.random()
    for (const c of palette) { acc += c.prob; if (r < acc) return c.hue }
    return 0
  }

  const group = new THREE.Group()
  group.renderOrder = -1

  const addLayer = (count: number, size: number) => {
    const pos: number[] = []
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random()
      const t = 2 * Math.PI * u
      const p = Math.acos(2 * v - 1)
      pos.push(1000 * Math.sin(p) * Math.cos(t), 1000 * Math.sin(p) * Math.sin(t), 1000 * Math.cos(p))
    }
    const geo  = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3))
    const cols = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const L = Math.min((Math.random() * 20 + 70) * (Math.random() * 0.5 + 0.75), 100)
      const c = new THREE.Color(`hsl(${pickHue()}, 100%, ${L}%)`)
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3))
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size, sizeAttenuation: true, vertexColors: true, depthWrite: false,
    })))
  }

  if (isMobile) {
    addLayer(400, 1.0); addLayer(400, 3.0)
  } else {
    addLayer(700, 1.0); addLayer(800, 3.5); addLayer(300, 5.0)
  }
  scene.add(group)
}

// ─── Countries — earcut via THREE.ShapeGeometry ────────────────────────────────
async function loadCountries() {
  try {
    const res  = await fetch(
      "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    )
    const data: { features: any[] } = await res.json()

    // Merge Western Sahara into Morocco
    const feats   = data.features
    const morocco = feats.find((f: any) => f.properties.ADMIN === "Morocco")
    const wSahara = feats.find((f: any) => f.properties.ADMIN === "Western Sahara")
    if (morocco && wSahara) {
      const gc = (f: any) => f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
      morocco.geometry.type        = "MultiPolygon"
      morocco.geometry.coordinates = [...gc(morocco), ...gc(wSahara)]
    }
    const filtered = feats.filter((f: any) => f.properties.ADMIN !== "Western Sahara")

    for (const feature of filtered) {
      const name: string = feature.properties?.ADMIN || ""
      const color        = new THREE.Color(getCountryColor(name))
      const geom         = feature.geometry
      const polygons: number[][][][] =
        geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates

      const meshes: THREE.Mesh[] = []
      for (const polygon of polygons) {
        const mesh = buildPolygonMesh(polygon, color, name)
        if (mesh) { scene.add(mesh); meshes.push(mesh) }
      }
      if (meshes.length > 0) countryMeshes.set(name, meshes)
    }

    self.postMessage({ type: "countriesLoaded" })
  } catch (err) {
    console.error("[Globe Worker] Countries load failed:", err)
  }
}

/**
 * Triangulate a GeoJSON polygon ring using THREE.ShapeGeometry (earcut).
 * Uses lat/lng as 2D input → earcut triangulates → project each vertex to sphere.
 * This correctly handles concave shapes (Russia, USA, etc.)
 */
function buildPolygonMesh(
  polygon: number[][][],
  color: THREE.Color,
  name: string,
): THREE.Mesh | null {
  try {
    const outerRing = polygon[0]
    if (outerRing.length < 3) return null

    // Outer boundary
    const shape = new THREE.Shape()
    shape.moveTo(outerRing[0][0], outerRing[0][1])
    for (let i = 1; i < outerRing.length; i++) {
      shape.lineTo(outerRing[i][0], outerRing[i][1])
    }

    // Holes (inner rings) — e.g. South Africa surrounding Lesotho
    for (let h = 1; h < polygon.length; h++) {
      const ring = polygon[h]
      const hole = new THREE.Path()
      hole.moveTo(ring[0][0], ring[0][1])
      for (let i = 1; i < ring.length; i++) hole.lineTo(ring[i][0], ring[i][1])
      shape.holes.push(hole)
    }

    // Triangulate with earcut (Three.js internal)
    const geo     = new THREE.ShapeGeometry(shape)
    const R       = GLOBE_RADIUS + 0.5
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const arr     = posAttr.array as Float32Array

    // Transform each vertex: flat (lng, lat, 0) → 3D sphere position
    for (let i = 0; i < posAttr.count; i++) {
      const lng = arr[i * 3]       // ShapeGeometry puts x=lng
      const lat = arr[i * 3 + 1]   // y=lat
      const v   = latLngToVec3(lat, lng, R)
      arr[i * 3]     = v.x
      arr[i * 3 + 1] = v.y
      arr[i * 3 + 2] = v.z
    }
    posAttr.needsUpdate = true

    const mat  = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.countryName = name
    return mesh
  } catch {
    return null
  }
}

// ─── Highlight / Unhighlight ──────────────────────────────────────────────────
function highlightCountry(name: string | null) {
  if (highlighted && highlighted !== name) {
    countryMeshes.get(highlighted)?.forEach(
      (m) => (m.material as THREE.MeshBasicMaterial).color.set(getCountryColor(highlighted!)),
    )
  }
  if (name) {
    countryMeshes.get(name)?.forEach(
      (m) => (m.material as THREE.MeshBasicMaterial).color.set(0xffffff),
    )
  }
  highlighted = name
}

// ─── Click raycasting ─────────────────────────────────────────────────────────
function handleClick(nx: number, ny: number) {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
  const allMeshes: THREE.Mesh[] = []
  countryMeshes.forEach((ms) => allMeshes.push(...ms))
  const hits = raycaster.intersectObjects(allMeshes)
  if (hits.length > 0) {
    const n = hits[0].object.userData.countryName as string
    if (n) self.postMessage({ type: "countryClick", name: n })
  }
}

// ─── Render loop with inertia ─────────────────────────────────────────────────
function startLoop() {
  const tick = () => {
    if (!isDragging && (Math.abs(velTheta) > 0.0001 || Math.abs(velPhi) > 0.0001)) {
      camTheta  += velTheta
      camPhi     = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi + velPhi))
      velTheta  *= DAMPING
      velPhi    *= DAMPING
      updateCamera()
    }
    renderer.render(scene, camera)
    ;(self as any).requestAnimationFrame(tick)
  }
  ;(self as any).requestAnimationFrame(tick)
}

// ─── Message handler ──────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  switch (e.data.type) {
    case "init": {
      buildScene(e.data.canvas, e.data.width, e.data.height, e.data.devicePixelRatio, e.data.isMobile)
      startLoop()
      self.postMessage({ type: "ready" })
      break
    }
    case "resize": {
      renderer.setSize(e.data.width, e.data.height, false)
      renderer.setPixelRatio(Math.min(e.data.devicePixelRatio, 1.5))
      camera.aspect = e.data.width / e.data.height
      camera.updateProjectionMatrix()
      break
    }
    case "dragStart": {
      isDragging = true
      prevDragX  = e.data.x
      prevDragY  = e.data.y
      velTheta   = 0
      velPhi     = 0
      break
    }
    case "dragMove": {
      if (!isDragging) break
      const dx  = e.data.x - prevDragX
      const dy  = e.data.y - prevDragY
      velTheta  = -dx * 0.005
      velPhi    = -dy * 0.003
      camTheta += velTheta
      camPhi    = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi + velPhi))
      prevDragX = e.data.x
      prevDragY = e.data.y
      updateCamera()
      break
    }
    case "dragEnd": {
      isDragging = false
      break
    }
    case "wheel": {
      camRadius  = Math.max(150, Math.min(500, camRadius + e.data.delta * 0.3))
      updateCamera()
      break
    }
    case "click":     handleClick(e.data.x, e.data.y); break
    case "highlight": highlightCountry(e.data.name);   break
  }
}

/**
 * Globe Web Worker
 * Runs Three.js rendering inside a Web Worker via OffscreenCanvas.
 * Main thread keeps camera + OrbitControls, syncs camera state here.
 * This keeps the main thread free (TBT ≈ 0ms).
 */
import * as THREE from "three"

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 100

const VIVID_PALETTE = [
    "#FFEB3B", "#FF5722", "#2196F3", "#4CAF50", "#E91E63",
    "#9C27B0", "#00BCD4", "#FFC107", "#FF9800", "#8BC34A",
    "#03A9F4", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]

// ─── State ────────────────────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera

const countryMeshes = new Map<string, THREE.Mesh[]>()
const baseColors = new Map<string, string>()
let highlightedName: string | null = null

// ─── Utilities ────────────────────────────────────────────────────────────────
function getCountryColor(name: string): string {
    if (!baseColors.has(name)) {
        let hash = 0
        for (const ch of name) hash += ch.charCodeAt(0)
        baseColors.set(name, VIVID_PALETTE[hash % VIVID_PALETTE.length])
    }
    return baseColors.get(name)!
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    )
}

// ─── Globe Building ───────────────────────────────────────────────────────────
function buildGlobe(
    canvas: OffscreenCanvas,
    width: number,
    height: number,
    dpr: number,
    isMobile: boolean,
) {
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
    camera.position.set(0, 0, isMobile ? 310 : 260)

    buildGlobeSphere()
    buildAtmosphere()
    buildStars(isMobile)
    loadCountriesAsync()
}

function buildGlobeSphere() {
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48)
    const mat = new THREE.MeshBasicMaterial({ color: 0x060d1e })
    scene.add(new THREE.Mesh(geo, mat))
}

function buildAtmosphere() {
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, 48, 32)
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            glowColor: { value: new THREE.Color(0x4488ff) },
        },
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
        float intensity = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.5);
        gl_FragColor = vec4(glowColor, clamp(intensity * 0.7, 0.0, 1.0));
      }
    `,
    })
    scene.add(new THREE.Mesh(geo, mat))
}

function buildStars(isMobile: boolean) {
    const group = new THREE.Group()
    group.renderOrder = -1

    // Realistic star color spectrum (same as main globe-viewer stars)
    const starColorPalette = [
        { hue: 240, prob: 0.05 },
        { hue: 220, prob: 0.10 },
        { hue: 200, prob: 0.15 },
        { hue: 170, prob: 0.20 },
        { hue: 60, prob: 0.25 },
        { hue: 30, prob: 0.15 },
        { hue: 0, prob: 0.10 },
    ]

    const pickHue = () => {
        const r = Math.random()
        let acc = 0
        for (const c of starColorPalette) {
            acc += c.prob
            if (r < acc) return c.hue
        }
        return 0
    }

    const addLayer = (count: number, size: number) => {
        const pos: number[] = []
        for (let i = 0; i < count; i++) {
            const u = Math.random(), v = Math.random()
            const t = 2 * Math.PI * u
            const p = Math.acos(2 * v - 1)
            pos.push(
                1000 * Math.sin(p) * Math.cos(t),
                1000 * Math.sin(p) * Math.sin(t),
                1000 * Math.cos(p),
            )
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3))
        const cols = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            const h = pickHue()
            const L = Math.min((Math.random() * 20 + 70) * (Math.random() * 0.5 + 0.75), 100)
            const c = new THREE.Color(`hsl(${h}, 100%, ${L}%)`)
            cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
        }
        geo.setAttribute("color", new THREE.BufferAttribute(cols, 3))
        group.add(new THREE.Points(geo, new THREE.PointsMaterial({
            size,
            sizeAttenuation: true,
            vertexColors: true,
            depthWrite: false,
        })))
    }

    if (isMobile) {
        addLayer(500, 1.0); addLayer(600, 3.5); addLayer(200, 5.0)
    } else {
        addLayer(700, 1.0); addLayer(800, 3.5); addLayer(300, 5.0)
    }

    scene.add(group)
}

// ─── GeoJSON Country Rendering ────────────────────────────────────────────────
async function loadCountriesAsync() {
    try {
        const res = await fetch(
            "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
        )
        const data: { features: any[] } = await res.json()

        // Merge Western Sahara into Morocco (same logic as before)
        const features = data.features
        const morocco = features.find((f: any) => f.properties.ADMIN === "Morocco")
        const wSahara = features.find((f: any) => f.properties.ADMIN === "Western Sahara")
        if (morocco && wSahara) {
            const getCoords = (f: any) =>
                f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
            morocco.geometry.type = "MultiPolygon"
            morocco.geometry.coordinates = [...getCoords(morocco), ...getCoords(wSahara)]
        }
        const filtered = features.filter((f: any) => f.properties.ADMIN !== "Western Sahara")

        buildCountryMeshes(filtered)
        self.postMessage({ type: "countriesLoaded" })
    } catch (e) {
        console.error("[Globe Worker] Failed to load countries:", e)
    }
}

function buildCountryMeshes(features: any[]) {
    for (const feature of features) {
        const name: string = feature.properties?.ADMIN || ""
        const color = new THREE.Color(getCountryColor(name))
        const geom = feature.geometry
        const polyList: number[][][][] =
            geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates

        const meshes: THREE.Mesh[] = []
        for (const polygon of polyList) {
            const mesh = ringToMesh(polygon[0], color, name)
            if (mesh) {
                scene.add(mesh)
                meshes.push(mesh)
            }
        }
        if (meshes.length > 0) countryMeshes.set(name, meshes)
    }
}

/**
 * Fan triangulation: connect centroid → each edge pair of the polygon ring.
 * Works well for the 110m-resolution GeoJSON (mostly convex blobs).
 */
function ringToMesh(ring: number[][], color: THREE.Color, name: string): THREE.Mesh | null {
    if (ring.length < 3) return null
    const R = GLOBE_RADIUS + 0.5

    // Compute centroid
    let sumLng = 0, sumLat = 0
    ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat })
    const centroid = latLngToVec3(sumLat / ring.length, sumLng / ring.length, R)

    // Build fan triangles
    const positions: number[] = []
    for (let i = 0; i < ring.length - 1; i++) {
        const [lngA, latA] = ring[i]
        const [lngB, latB] = ring[i + 1]
        const A = latLngToVec3(latA, lngA, R)
        const B = latLngToVec3(latB, lngB, R)
        positions.push(centroid.x, centroid.y, centroid.z, A.x, A.y, A.z, B.x, B.y, B.z)
    }
    if (positions.length === 0) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3))
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.FrontSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.countryName = name
    return mesh
}

// ─── Country Highlighting ─────────────────────────────────────────────────────
function highlightCountry(name: string | null) {
    // Reset previous
    if (highlightedName && highlightedName !== name) {
        countryMeshes.get(highlightedName)?.forEach(
            (m) => (m.material as THREE.MeshBasicMaterial).color.set(getCountryColor(highlightedName!)),
        )
    }
    // Apply new
    if (name) {
        countryMeshes.get(name)?.forEach(
            (m) => (m.material as THREE.MeshBasicMaterial).color.set(0xffffff),
        )
    }
    highlightedName = name
}

// ─── Click Raycasting ─────────────────────────────────────────────────────────
function handleClick(x: number, y: number) {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

    const allMeshes: THREE.Mesh[] = []
    countryMeshes.forEach((ms) => allMeshes.push(...ms))

    const hits = raycaster.intersectObjects(allMeshes)
    if (hits.length > 0) {
        const clickedName = hits[0].object.userData.countryName as string
        if (clickedName) self.postMessage({ type: "countryClick", name: clickedName })
    }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function startLoop() {
    const raf = (self as unknown as { requestAnimationFrame: (cb: () => void) => void }).requestAnimationFrame
    const tick = () => {
        renderer.render(scene, camera)
        raf(tick)
    }
    raf(tick)
}

// ─── Message Handler ──────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
    const { type } = e.data
    switch (type) {
        case "init": {
            const { canvas, width, height, devicePixelRatio, isMobile } = e.data
            buildGlobe(canvas, width, height, devicePixelRatio, isMobile)
            startLoop()
            self.postMessage({ type: "ready" })
            break
        }
        case "resize": {
            const { width, height, devicePixelRatio } = e.data
            renderer.setSize(width, height, false)
            renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
            camera.aspect = width / height
            camera.updateProjectionMatrix()
            break
        }
        case "updateCamera": {
            camera.position.fromArray(e.data.position)
            camera.quaternion.fromArray(e.data.quaternion)
            camera.projectionMatrix.fromArray(e.data.projectionMatrix)
            camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
            break
        }
        case "click": {
            handleClick(e.data.x, e.data.y)
            break
        }
        case "highlight": {
            highlightCountry(e.data.name)
            break
        }
    }
}

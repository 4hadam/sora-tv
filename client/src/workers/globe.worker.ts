/**
 * globe.worker.ts — Three.js globe rendered entirely in a Web Worker
 * via OffscreenCanvas. Zero JS on main thread.
 *
 * - npm earcut for robust polygon triangulation
 * - Local tangent plane projection (no lon/lat distortion)
 * - Proper mobile camera distance (globe visible as sphere)
 * - Hover highlight + render-on-demand
 */
import * as THREE from "three"
import earcut from "earcut"

// ─── Config ──────────────────────────────────────────────────────────────────
const GLOBE_R = 100
const COUNTRY_ALT = 1.005
const GEO_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson"

// ─── Color palette ───────────────────────────────────────────────────────────
const PALETTE = [
    "#FF5722", "#2196F3", "#4CAF50", "#E91E63", "#9C27B0",
    "#00BCD4", "#FFC107", "#FF9800", "#8BC34A", "#03A9F4",
    "#FFEB3B", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]
function countryColor(name: string): string {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
    return PALETTE[h % PALETTE.length]
}

// ─── Morocco/Western Sahara merge ────────────────────────────────────────────
function fixMorocco(features: any[]): any[] {
    const mo = features.find(f => f.properties?.ADMIN === "Morocco")
    const ws = features.find(f => f.properties?.ADMIN === "Western Sahara")
    if (mo && ws) {
        const toMulti = (f: any) =>
            f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
        mo.geometry = { type: "MultiPolygon", coordinates: [...toMulti(mo), ...toMulti(ws)] }
        return features.filter(f => f.properties?.ADMIN !== "Western Sahara")
    }
    return features
}

// ─── Geo helpers ─────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
    )
}

// ─── Build country mesh (npm earcut + local tangent plane) ───────────────────
function buildCountryMesh(feature: any): THREE.Group {
    const name: string = feature.properties?.ADMIN ?? ""
    const color = new THREE.Color(countryColor(name))
    const r = GLOBE_R * COUNTRY_ALT
    const group = new THREE.Group()
        ; (group as any).countryName = name

    const polys: number[][][][] =
        feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates

    for (const poly of polys) {
        const outerRing = poly[0]
        if (!outerRing || outerRing.length < 4) continue

        // Convert all rings to 3D
        const rings3d: THREE.Vector3[][] = []
        for (const ring of poly) {
            rings3d.push(ring.map(([lon, lat]: number[]) => latLonToVec3(lat, lon, r)))
        }

        const pts3d = rings3d[0]

        // Build local tangent plane at centroid
        const cx = pts3d.reduce((s, v) => s + v.x, 0) / pts3d.length
        const cy = pts3d.reduce((s, v) => s + v.y, 0) / pts3d.length
        const cz = pts3d.reduce((s, v) => s + v.z, 0) / pts3d.length
        const normal = new THREE.Vector3(cx, cy, cz).normalize()
        const tmpUp = Math.abs(normal.y) < 0.9
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0)
        const axisR = new THREE.Vector3().crossVectors(normal, tmpUp).normalize()
        const axisU = new THREE.Vector3().crossVectors(axisR, normal).normalize()

        // Project to 2D using tangent plane + build flat array for earcut
        const flat2d: number[] = []
        const all3d: THREE.Vector3[] = []
        const holeIndices: number[] = []

        // Outer ring
        for (const v of pts3d) {
            flat2d.push(v.dot(axisR), v.dot(axisU))
            all3d.push(v)
        }

        // Holes
        for (let h = 1; h < rings3d.length; h++) {
            holeIndices.push(all3d.length)
            for (const v of rings3d[h]) {
                flat2d.push(v.dot(axisR), v.dot(axisU))
                all3d.push(v)
            }
        }

        // Triangulate with npm earcut
        const indices = earcut(flat2d, holeIndices.length > 0 ? holeIndices : undefined, 2)
        if (indices.length === 0) continue

        // Build BufferGeometry
        const positions = new Float32Array(all3d.length * 3)
        for (let i = 0; i < all3d.length; i++) {
            positions[i * 3] = all3d[i].x
            positions[i * 3 + 1] = all3d[i].y
            positions[i * 3 + 2] = all3d[i].z
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
        geo.setIndex(indices)
        geo.computeVertexNormals()

        const mat = new THREE.MeshBasicMaterial({
            color, side: THREE.DoubleSide, transparent: true, opacity: 0.88,
        })
        const mesh = new THREE.Mesh(geo, mat)
            ; (mesh as any).countryName = name
            ; (mesh as any).isFill = true
        group.add(mesh)

        // Border line (outer ring only)
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts3d)
        group.add(new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.15, linewidth: 1,
        })))
    }

    return group
}

// ─── Globe sphere ────────────────────────────────────────────────────────────
function buildGlobe(): THREE.Mesh {
    return new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x080c18 }),
    )
}

// ─── Atmosphere glow ─────────────────────────────────────────────────────────
function buildAtmosphere(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(GLOBE_R * 1.15, 64, 64)
    const mat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                gl_FragColor = vec4(0.27, 0.53, 1.0, 1.0) * intensity;
            }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
    })
    return new THREE.Mesh(geo, mat)
}

// ─── Stars ───────────────────────────────────────────────────────────────────
function addStars(scene: THREE.Scene, mobile: boolean): void {
    const count = mobile ? 800 : 1500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const starHues = [220, 200, 170, 60, 30, 0]
    for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1)
        const theta = Math.PI * 2 * Math.random()
        const R = 900 + Math.random() * 200
        positions[i * 3] = R * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = R * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = R * Math.cos(phi)

        const hue = starHues[Math.floor(Math.random() * starHues.length)]
        const lightness = 70 + Math.random() * 30
        const c = new THREE.Color(`hsl(${hue},100%,${lightness}%)`)
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 2, sizeAttenuation: true, vertexColors: true,
        depthWrite: false, depthTest: false,
    }))
    pts.renderOrder = -1
    scene.add(pts)
}

// ─── Orbit controls (worker-safe, with inertia) ─────────────────────────────
class OrbitControl {
    private spherical = new THREE.Spherical()
    private target = new THREE.Vector3(0, 0, 0)
    private dampingFactor = 0.12
    private minDist: number
    private maxDist: number

    private _vTheta = 0
    private _vPhi = 0
    private _vZoom = 0
    private _dragging = false
    private _lastX = 0
    private _lastY = 0
    private _w = 1
    private _h = 1

    constructor(radius: number, mobile: boolean) {
        this.minDist = mobile ? 180 : 170
        this.maxDist = mobile ? 500 : 500
        this.spherical.set(radius, Math.PI / 2, 0)
    }

    setSize(w: number, h: number) { this._w = w; this._h = h }

    startDrag(x: number, y: number) {
        this._dragging = true; this._lastX = x; this._lastY = y
    }
    endDrag() { this._dragging = false }
    moveDrag(x: number, y: number) {
        if (!this._dragging) return
        const dx = x - this._lastX, dy = y - this._lastY
        this._vTheta -= (dx / this._w) * Math.PI * 2
        this._vPhi -= (dy / this._h) * Math.PI
        this._lastX = x; this._lastY = y
    }
    zoom(delta: number) {
        this._vZoom += delta * 0.002
    }

    update(camera: THREE.PerspectiveCamera): boolean {
        const EPS = 1e-6
        const moving = Math.abs(this._vTheta) > EPS || Math.abs(this._vPhi) > EPS || Math.abs(this._vZoom) > EPS

        if (moving) {
            this.spherical.theta += this._vTheta
            this.spherical.phi += this._vPhi
            this.spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this.spherical.phi))

            this.spherical.radius *= (1 + this._vZoom)
            this.spherical.radius = Math.max(this.minDist, Math.min(this.maxDist, this.spherical.radius))

            this._vTheta *= (1 - this.dampingFactor)
            this._vPhi *= (1 - this.dampingFactor)
            this._vZoom *= (1 - this.dampingFactor)

            if (Math.abs(this._vTheta) < EPS) this._vTheta = 0
            if (Math.abs(this._vPhi) < EPS) this._vPhi = 0
            if (Math.abs(this._vZoom) < EPS) this._vZoom = 0
        }

        camera.position.setFromSpherical(this.spherical)
        camera.lookAt(this.target)
        return moving
    }
}

// ─── Worker state ────────────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let orbit: OrbitControl
let isMobileDevice = false

const countryMeshes = new Map<string, THREE.Group>()
let allFeatures: any[] = []
let selectedCountry: string | null = null
let hoveredCountry: string | null = null
let rafId = 0
let needsRender = true

function scheduleRender() { needsRender = true }

function loop() {
    rafId = requestAnimationFrame(loop)
    const moved = orbit.update(camera)
    if (moved || needsRender) {
        renderer.render(scene, camera)
        needsRender = false
    }
}

// ─── Build all countries ─────────────────────────────────────────────────────
function buildAllCountries(features: any[]) {
    countryMeshes.forEach(m => scene.remove(m))
    countryMeshes.clear()
    for (const f of features) {
        const name: string = f.properties?.ADMIN ?? ""
        const mesh = buildCountryMesh(f)
        scene.add(mesh)
        countryMeshes.set(name, mesh)
    }
    scheduleRender()
}

// ─── Update visual state ─────────────────────────────────────────────────────
function applyCountryStyle(cname: string, group: THREE.Group) {
    const isSel = cname === selectedCountry
    const isHov = cname === hoveredCountry && !isSel
    group.traverse((child: THREE.Object3D) => {
        if ((child as any).isFill) {
            const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
            if (isSel) {
                mat.color.set("#ffffff")
                mat.opacity = 0.95
            } else if (isHov) {
                const base = new THREE.Color(countryColor(cname))
                base.lerp(new THREE.Color(1, 1, 1), 0.35)
                mat.color.copy(base)
                mat.opacity = 1.0
            } else {
                mat.color.set(countryColor(cname))
                mat.opacity = 0.88
            }
            mat.needsUpdate = true
        }
    })
}

function updateSelection(name: string | null) {
    const oldSel = selectedCountry
    selectedCountry = name
    if (oldSel) { const g = countryMeshes.get(oldSel); if (g) applyCountryStyle(oldSel, g) }
    if (name) { const g = countryMeshes.get(name); if (g) applyCountryStyle(name, g) }
    scheduleRender()
}

function updateHover(name: string | null) {
    if (name === hoveredCountry) return
    const oldHov = hoveredCountry
    hoveredCountry = name
    if (oldHov) { const g = countryMeshes.get(oldHov); if (g) applyCountryStyle(oldHov, g) }
    if (name) { const g = countryMeshes.get(name); if (g) applyCountryStyle(name, g) }
    scheduleRender()
}

// ─── Raycasting ──────────────────────────────────────────────────────────────
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()

function pickCountry(ndcX: number, ndcY: number): string | null {
    _mouse.set(ndcX, ndcY)
    _raycaster.setFromCamera(_mouse, camera)
    const targets: THREE.Object3D[] = []
    countryMeshes.forEach(g => targets.push(g))
    const hits = _raycaster.intersectObjects(targets, true)
    for (const hit of hits) {
        let obj: any = hit.object
        while (obj) { if (obj.countryName) return obj.countryName as string; obj = obj.parent }
    }
    return null
}

// ─── Init ────────────────────────────────────────────────────────────────────
function initScene(canvas: OffscreenCanvas, w: number, h: number, dpr: number, mobile: boolean) {
    isMobileDevice = mobile
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(dpr, mobile ? 1.0 : 1.5))
    renderer.setSize(w, h, false)
    renderer.setClearColor(0x000000, 1)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, w / h, 1, 3000)

    scene.add(buildGlobe())
    scene.add(buildAtmosphere())
    addStars(scene, mobile)

    // Mobile: further away so globe is visible as a sphere
    const initRadius = mobile ? 340 : 280
    orbit = new OrbitControl(initRadius, mobile)
    orbit.setSize(w, h)

    fetch(GEO_URL)
        .then(r => r.json())
        .then(data => {
            allFeatures = fixMorocco(
                (data.features as any[]).filter((f: any) =>
                    f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
                )
            )
            buildAllCountries(allFeatures)
            self.postMessage({ type: "ready" })
        })
        .catch(() => self.postMessage({ type: "ready" }))

    loop()
}

function resizeScene(w: number, h: number) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    orbit.setSize(w, h)
    scheduleRender()
}

// ─── Message router ──────────────────────────────────────────────────────────
self.onmessage = (evt: MessageEvent) => {
    const { type } = evt.data
    switch (type) {
        case "init": {
            const { canvas, width: w, height: h, devicePixelRatio: dpr, isMobile } = evt.data
            initScene(canvas as OffscreenCanvas, w, h, dpr ?? 1, isMobile ?? false)
            break
        }
        case "resize": if (renderer) resizeScene(evt.data.width, evt.data.height); break
        case "mousedown": orbit.startDrag(evt.data.x, evt.data.y); break
        case "mouseup":
        case "mouseleave": orbit.endDrag(); updateHover(null); break
        case "mousemove":
            orbit.moveDrag(evt.data.x, evt.data.y)
            if (!isMobileDevice && evt.data.ndcX !== undefined) {
                const hit = pickCountry(evt.data.ndcX, evt.data.ndcY)
                updateHover(hit)
                self.postMessage({ type: "hover", name: hit })
            }
            scheduleRender()
            break
        case "wheel": orbit.zoom(evt.data.delta); scheduleRender(); break
        case "touchstart": orbit.startDrag(evt.data.x, evt.data.y); break
        case "touchmove": orbit.moveDrag(evt.data.x, evt.data.y); scheduleRender(); break
        case "touchend": orbit.endDrag(); break
        case "click": {
            const hit = pickCountry(evt.data.x, evt.data.y)
            if (hit) self.postMessage({ type: "countryClick", name: hit })
            break
        }
        case "selectCountry": updateSelection(evt.data.name); break
        case "destroy":
            cancelAnimationFrame(rafId)
            renderer?.dispose()
            break
    }
}

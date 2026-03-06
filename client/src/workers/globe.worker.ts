/**
 * globe.worker.ts — three.js entirely in Worker via OffscreenCanvas
 */
import * as THREE from "three"

const GEOJSON_URL =
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson"

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

const PALETTE = [
    "#FF5722", "#2196F3", "#4CAF50", "#E91E63", "#9C27B0",
    "#00BCD4", "#FFC107", "#FF9800", "#8BC34A", "#03A9F4",
    "#FFEB3B", "#F44336", "#FF4081", "#CDDC39", "#00E676",
]
function countryColor(name: string): string {
    let h = 0; for (const c of name) h = (h + c.charCodeAt(0)) & 0xffff
    return PALETTE[h % PALETTE.length]
}

const STAR_SPECTRUM = [
    { hue: 220, p: 0.12 }, { hue: 200, p: 0.15 }, { hue: 170, p: 0.20 },
    { hue: 60, p: 0.25 }, { hue: 30, p: 0.15 }, { hue: 0, p: 0.13 },
]
function starHue(): number {
    let r = Math.random(), acc = 0
    for (const s of STAR_SPECTRUM) { acc += s.p; if (r < acc) return s.hue }
    return 60
}
function spherePts(radius: number, n: number): Float32Array {
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
        const phi = Math.acos(2 * Math.random() - 1)
        const th = Math.PI * 2 * Math.random()
        a[i * 3] = radius * Math.sin(phi) * Math.cos(th)
        a[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(th)
        a[i * 3 + 2] = radius * Math.cos(phi)
    }
    return a
}
function starLayer(n: number, sz: number): THREE.Points {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(spherePts(1000, n), 3))
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
        const L = Math.min(70 + Math.random() * 25, 100)
        const c = new THREE.Color(`hsl(${starHue()},100%,${L}%)`)
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3))
    return new THREE.Points(geo, new THREE.PointsMaterial({
        size: sz, sizeAttenuation: true, vertexColors: true, depthWrite: false, depthTest: false,
    }))
}
function addStars(scene: THREE.Scene, mobile: boolean): void {
    const g = new THREE.Group(); g.renderOrder = -1
    const counts = mobile ? [500, 600, 200] : [700, 800, 300]
    const sizes = [1.0, 3.5, 5.0]
    counts.forEach((n, i) => g.add(starLayer(n, sizes[i])))
    scene.add(g)
}

const GLOBE_R = 100
function latLonToVec3(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
    )
}

function buildCountryMesh(feature: any, selected: boolean): THREE.Object3D {
    const name: string = feature.properties?.ADMIN ?? ""
    const color = selected ? "#ffffff" : countryColor(name)
    const ALT = 1.01
    const group = new THREE.Group()
        ; (group as any).countryName = name

    const polys: number[][][][] =
        feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates

    for (const poly of polys) {
        const ring = poly[0]
        if (ring.length < 3) continue
        const pts3d: THREE.Vector3[] = ring.map(([lon, lat]: number[]) =>
            latLonToVec3(lat, lon, GLOBE_R * ALT)
        )

        // Build a local 2-D coordinate frame on the sphere surface at the centroid
        const cx = pts3d.reduce((s, v) => s + v.x, 0) / pts3d.length
        const cy = pts3d.reduce((s, v) => s + v.y, 0) / pts3d.length
        const cz = pts3d.reduce((s, v) => s + v.z, 0) / pts3d.length
        const normal = new THREE.Vector3(cx, cy, cz).normalize()
        const tmpUp = Math.abs(normal.y) < 0.9
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0)
        const axisR = new THREE.Vector3().crossVectors(normal, tmpUp).normalize()
        const axisU = new THREE.Vector3().crossVectors(axisR, normal).normalize()

        // Project each 3-D point onto the local 2-D plane
        const pts2d: THREE.Vector2[] = pts3d.map(v =>
            new THREE.Vector2(v.dot(axisR), v.dot(axisU))
        )

        // Earcut triangulation (no holes for ne_110m resolution)
        let tris: number[][]
        try {
            tris = THREE.ShapeUtils.triangulateShape(pts2d, [])
        } catch { continue }
        if (!tris.length) continue

        // Build indexed BufferGeometry from original 3-D points
        const positions = new Float32Array(pts3d.length * 3)
        pts3d.forEach((v, i) => { positions[i * 3] = v.x; positions[i * 3 + 1] = v.y; positions[i * 3 + 2] = v.z })
        const idxBuf = new Uint16Array(tris.length * 3)
        tris.forEach(([a, b, c], i) => { idxBuf[i * 3] = a; idxBuf[i * 3 + 1] = b; idxBuf[i * 3 + 2] = c })

        const geo = new THREE.BufferGeometry()
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geo.setIndex(new THREE.BufferAttribute(idxBuf, 1))
        geo.computeVertexNormals()

        const mat = new THREE.MeshBasicMaterial({
            color, side: THREE.DoubleSide, transparent: true, opacity: selected ? 0.95 : 0.82,
        })
        const mesh = new THREE.Mesh(geo, mat)
            ; (mesh as any).countryName = name
            ; (mesh as any).isFill = true
        group.add(mesh)

        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts3d)
        group.add(new THREE.LineLoop(lineGeo,
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
        ))
    }
    return group
}

function buildAtmosphere(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(GLOBE_R * 1.14, 64, 64)
    const mat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vN;void main(){float i=pow(.65-dot(vN,vec3(0.,0.,1.)),3.);gl_FragColor=vec4(.27,.53,1.,1.)*i;}`,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true,
    })
    return new THREE.Mesh(geo, mat)
}

function buildGlobe(): THREE.Mesh {
    return new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x0a0e1a, shininess: 5 }),
    )
}

// ─── Simple worker-safe orbit controls ──────────────────────────────────────
class SimpleOrbit {
    spherical = new THREE.Spherical(340, Math.PI / 2, 0)
    target = new THREE.Vector3(0, 0, 0)
    minDist = 180; maxDist = 600
    minPolar = 0.1; maxPolar = Math.PI - 0.1
    dampingFactor = 0.08
    _dTheta = 0; _dPhi = 0; _dZoom = 0
    _dragging = false; _lastX = 0; _lastY = 0
    _w = 1; _h = 1

    setSize(w: number, h: number) { this._w = w; this._h = h }
    startDrag(x: number, y: number) { this._dragging = true; this._lastX = x; this._lastY = y }
    endDrag() { this._dragging = false }
    moveDrag(x: number, y: number) {
        if (!this._dragging) return
        this._dTheta -= ((x - this._lastX) / this._w) * Math.PI * 2
        this._dPhi -= ((y - this._lastY) / this._h) * Math.PI
        this._lastX = x; this._lastY = y
    }
    zoom(delta: number) { this._dZoom += delta * 0.05 }

    update(camera: THREE.PerspectiveCamera): boolean {
        const EPS = 1e-5
        const moving = Math.abs(this._dTheta) > EPS || Math.abs(this._dPhi) > EPS || Math.abs(this._dZoom) > EPS
        if (moving) {
            this.spherical.theta += this._dTheta * this.dampingFactor
            this.spherical.phi += this._dPhi * this.dampingFactor
            this.spherical.phi = Math.max(this.minPolar, Math.min(this.maxPolar, this.spherical.phi))
            this.spherical.radius += this._dZoom * this.dampingFactor * this.spherical.radius * 0.1
            this.spherical.radius = Math.max(this.minDist, Math.min(this.maxDist, this.spherical.radius))
            this._dTheta *= (1 - this.dampingFactor)
            this._dPhi *= (1 - this.dampingFactor)
            this._dZoom *= (1 - this.dampingFactor)
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
let orbit: SimpleOrbit
const countryMeshes: Map<string, THREE.Object3D> = new Map()
let allFeatures: any[] = []
let selectedCountry: string | null = null
let rafId = 0
let needsRender = true

function loop() {
    const changed = orbit.update(camera)
    if (changed || needsRender) { renderer.render(scene, camera); needsRender = false }
    rafId = requestAnimationFrame(loop)
}

function buildLayer(features: any[], selected: string | null) {
    countryMeshes.forEach(m => scene.remove(m))
    countryMeshes.clear()
    for (const f of features) {
        const name: string = f.properties?.ADMIN ?? ""
        const mesh = buildCountryMesh(f, name === selected)
        scene.add(mesh)
        countryMeshes.set(name, mesh)
    }
    needsRender = true
}

function updateSelection(name: string | null) {
    selectedCountry = name
    countryMeshes.forEach((group, cname) => {
        const isSel = cname === name
        group.traverse((child: THREE.Object3D) => {
            if ((child as any).isFill) {
                const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
                m.color.set(isSel ? "#ffffff" : countryColor(cname))
                m.opacity = isSel ? 0.95 : 0.82
                m.needsUpdate = true
            }
        })
    })
    needsRender = true
}

function initScene(canvas: OffscreenCanvas, w: number, h: number, dpr: number, mobile: boolean) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false })
    renderer.setPixelRatio(Math.min(dpr, mobile ? 1 : 1.5))
    renderer.setSize(w, h, false)
    renderer.setClearColor(0x000000, 1)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    camera = new THREE.PerspectiveCamera(45, w / h, 1, 3000)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(5, 3, 5); scene.add(dir)

    scene.add(buildGlobe())
    scene.add(buildAtmosphere())
    addStars(scene, mobile)

    orbit = new SimpleOrbit()
    orbit.spherical.radius = mobile ? 380 : 280
    orbit.setSize(w, h)

    fetch(GEOJSON_URL).then(r => r.json()).then(data => {
        allFeatures = fixMorocco(
            (data.features as any[]).filter(f =>
                f.geometry != null &&
                (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
            )
        )
        buildLayer(allFeatures, selectedCountry)
        self.postMessage({ type: "ready" })
    }).catch(() => self.postMessage({ type: "ready" }))

    loop()
}

function resizeScene(w: number, h: number) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    orbit.setSize(w, h)
    needsRender = true
}

function pickCountry(ndcX: number, ndcY: number): string | null {
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    const targets: THREE.Object3D[] = []
    countryMeshes.forEach(g => targets.push(g))
    const hits = ray.intersectObjects(targets, true)
    for (const hit of hits) {
        let obj: any = hit.object
        while (obj) { if (obj.countryName) return obj.countryName as string; obj = obj.parent }
    }
    return null
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
        case "resize":
            if (renderer) resizeScene(evt.data.width, evt.data.height)
            break
        case "mousedown": orbit.startDrag(evt.data.x, evt.data.y); break
        case "mouseup":
        case "mouseleave": orbit.endDrag(); break
        case "mousemove": orbit.moveDrag(evt.data.x, evt.data.y); needsRender = true; break
        case "wheel": orbit.zoom(evt.data.delta); needsRender = true; break
        case "touchstart": orbit.startDrag(evt.data.x, evt.data.y); break
        case "touchmove": orbit.moveDrag(evt.data.x, evt.data.y); needsRender = true; break
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

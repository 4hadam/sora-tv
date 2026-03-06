/**
 * globe.worker.ts — Three.js globe rendered entirely in a Web Worker
 * via OffscreenCanvas. Zero JS on main thread.
 *
 * Optimizations over previous version:
 *  - Earcut-based triangulation (robust, no broken polygons)
 *  - Single merged geometry per country (fewer draw calls)
 *  - Proper mobile camera distance
 *  - Hover highlight support
 *  - Smooth inertia-based orbit controls
 *  - Render-on-demand (no wasted frames)
 */
import * as THREE from "three"

// ─── Config ──────────────────────────────────────────────────────────────────
const GLOBE_R = 100
const COUNTRY_ALT = 1.005          // tiny lift above sphere
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

// ─── Earcut triangulation ────────────────────────────────────────────────────
// Minimal earcut implementation for robust polygon triangulation
function earcut(data: number[], holeIndices?: number[], dim = 2): number[] {
    const hasHoles = holeIndices && holeIndices.length
    const outerLen = hasHoles ? holeIndices![0] * dim : data.length
    let outerNode = linkedList(data, 0, outerLen, dim, true)
    const triangles: number[] = []
    if (!outerNode || outerNode.next === outerNode.prev) return triangles
    if (hasHoles) outerNode = eliminateHoles(data, holeIndices!, outerNode, dim)
    let minX = 0, minY = 0, maxX = 0, maxY = 0, invSize = 0
    if (data.length > 80 * dim) {
        minX = maxX = data[0]; minY = maxY = data[1]
        for (let i = dim; i < outerLen; i += dim) {
            const x = data[i], y = data[i + 1]
            if (x < minX) minX = x; if (y < minY) minY = y
            if (x > maxX) maxX = x; if (y > maxY) maxY = y
        }
        invSize = Math.max(maxX - minX, maxY - minY)
        invSize = invSize !== 0 ? 32767 / invSize : 0
    }
    earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0)
    return triangles
}

interface ENode { i: number; x: number; y: number; prev: ENode; next: ENode; z: number; prevZ: ENode | null; nextZ: ENode | null; steiner: boolean }

function insertNode(i: number, x: number, y: number, last: ENode | null): ENode {
    const p: ENode = { i, x, y, prev: null!, next: null!, z: 0, prevZ: null, nextZ: null, steiner: false }
    if (!last) { p.prev = p; p.next = p }
    else { p.next = last.next; p.prev = last; last.next.prev = p; last.next = p }
    return p
}
function removeNode(p: ENode) { p.next.prev = p.prev; p.prev.next = p.next; if (p.prevZ) p.prevZ.nextZ = p.nextZ; if (p.nextZ) p.nextZ.prevZ = p.prevZ }
function linkedList(data: number[], start: number, end: number, dim: number, cw: boolean): ENode | null {
    let last: ENode | null = null
    if (cw === (signedArea(data, start, end, dim) > 0)) {
        for (let i = start; i < end; i += dim) last = insertNode(i / dim, data[i], data[i + 1], last)
    } else {
        for (let i = end - dim; i >= start; i -= dim) last = insertNode(i / dim, data[i], data[i + 1], last)
    }
    if (last && equals(last, last.next)) { removeNode(last); last = last.next }
    if (!last) return null
    last.next.prev = last; last.prev.next = last
    return last.next
}
function signedArea(data: number[], start: number, end: number, dim: number): number {
    let sum = 0
    for (let i = start, j = end - dim; i < end; j = i, i += dim)
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1])
    return sum
}
function equals(p1: ENode, p2: ENode) { return p1.x === p2.x && p1.y === p2.y }
function area(p: ENode, q: ENode, r: ENode) { return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y) }
function intersects(p1: ENode, q1: ENode, p2: ENode, q2: ENode): boolean {
    const o1 = Math.sign(area(p1, q1, p2)), o2 = Math.sign(area(p1, q1, q2))
    const o3 = Math.sign(area(p2, q2, p1)), o4 = Math.sign(area(p2, q2, q1))
    if (o1 !== o2 && o3 !== o4) return true
    if (o1 === 0 && onSegment(p1, p2, q1)) return true
    if (o2 === 0 && onSegment(p1, q2, q1)) return true
    if (o3 === 0 && onSegment(p2, p1, q2)) return true
    if (o4 === 0 && onSegment(p2, q1, q2)) return true
    return false
}
function onSegment(p: ENode, q: ENode, r: ENode) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)
}
function pointInTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, px: number, py: number) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
        (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
        (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
}
function isEar(ear: ENode): boolean {
    const a = ear.prev, b = ear, c = ear.next
    if (area(a, b, c) >= 0) return false
    const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y
    let p = c.next
    while (p !== a) {
        if (pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false
        p = p.next
    }
    return true
}
function isEarHashed(ear: ENode, minX: number, minY: number, invSize: number): boolean {
    const a = ear.prev, b = ear, c = ear.next
    if (area(a, b, c) >= 0) return false
    const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y
    const x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy)
    const x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy)
    const minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize)
    let p = ear.prevZ, n = ear.nextZ
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false
        p = p.prevZ
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false
        n = n.nextZ
    }
    while (p && p.z >= minZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false
        p = p.prevZ
    }
    while (n && n.z <= maxZ) {
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false
        n = n.nextZ
    }
    return true
}
function zOrder(x: number, y: number, minX: number, minY: number, invSize: number): number {
    let lx = ((x - minX) * invSize) | 0, ly = ((y - minY) * invSize) | 0
    lx = (lx | (lx << 8)) & 0x00FF00FF; lx = (lx | (lx << 4)) & 0x0F0F0F0F; lx = (lx | (lx << 2)) & 0x33333333; lx = (lx | (lx << 1)) & 0x55555555
    ly = (ly | (ly << 8)) & 0x00FF00FF; ly = (ly | (ly << 4)) & 0x0F0F0F0F; ly = (ly | (ly << 2)) & 0x33333333; ly = (ly | (ly << 1)) & 0x55555555
    return lx | (ly << 1)
}
function indexCurve(start: ENode, minX: number, minY: number, invSize: number) {
    let p: ENode | null = start
    do { if (p!.z === 0) p!.z = zOrder(p!.x, p!.y, minX, minY, invSize); p!.prevZ = p!.prev; p!.nextZ = p!.next; p = p!.next } while (p !== start)
    p!.prevZ!.nextZ = null; p!.prevZ = null; sortLinked(p!)
}
function sortLinked(list: ENode): ENode {
    let numMerges, pSize, qSize, inSize = 1; let p: ENode | null, q: ENode | null, e: ENode | null, tail: ENode
    do {
        p = list; list = null!; tail = null!; numMerges = 0
        while (p) {
            numMerges++; q = p; pSize = 0
            for (let i = 0; i < inSize; i++) { pSize++; q = q!.nextZ; if (!q) break }
            qSize = inSize
            while (pSize > 0 || (qSize > 0 && q)) {
                if (pSize !== 0 && (qSize === 0 || !q || p!.z <= q.z)) { e = p; p = p!.nextZ; pSize-- }
                else { e = q; q = q!.nextZ; qSize-- }
                if (tail) tail.nextZ = e; else list = e!
                e!.prevZ = tail; tail = e!
            }
            p = q
        }
        tail!.nextZ = null; inSize *= 2
    } while (numMerges > 1)
    return list
}
function eliminateHoles(data: number[], holeIndices: number[], outerNode: ENode, dim: number): ENode {
    const queue: ENode[] = []
    for (let i = 0; i < holeIndices.length; i++) {
        const start = holeIndices[i] * dim
        const end = i < holeIndices.length - 1 ? holeIndices[i + 1] * dim : data.length
        const list = linkedList(data, start, end, dim, false)
        if (list) { if (list === list.next) list.steiner = true; queue.push(getLeftmost(list)) }
    }
    queue.sort((a, b) => a.x - b.x)
    for (const q of queue) outerNode = eliminateHole(q, outerNode)
    return outerNode
}
function eliminateHole(hole: ENode, outerNode: ENode): ENode {
    const bridge = findHoleBridge(hole, outerNode)
    if (!bridge) return outerNode
    const bridgeReverse = splitPolygon(bridge, hole)
    filterPoints(bridgeReverse, bridgeReverse.next)
    return filterPoints(bridge, bridge.next)
}
function findHoleBridge(hole: ENode, outerNode: ENode): ENode | null {
    let p = outerNode, qx = -Infinity, m: ENode | null = null
    const hx = hole.x, hy = hole.y
    do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y)
            if (x <= hx && x > qx) { qx = x; m = p.x < p.next.x ? p : p.next }
        }
        p = p.next
    } while (p !== outerNode)
    if (!m) return null
    const stop = m
    const mx = m.x, my = m.y
    let tanMin = Infinity
    p = m
    do {
        if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
            const tan = Math.abs(hy - p.y) / (hx - p.x)
            if (locallyInside(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m!.x || sectorContainsSector(m!, p))))) { m = p; tanMin = tan }
        }
        p = p.next
    } while (p !== stop)
    return m
}
function sectorContainsSector(m: ENode, p: ENode) { return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0 }
function locallyInside(a: ENode, b: ENode) { return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0 }
function getLeftmost(start: ENode): ENode { let p = start, leftmost = start; do { if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p; p = p.next } while (p !== start); return leftmost }
function splitPolygon(a: ENode, b: ENode): ENode {
    const a2: ENode = { i: a.i, x: a.x, y: a.y, prev: null!, next: null!, z: 0, prevZ: null, nextZ: null, steiner: false }
    const b2: ENode = { i: b.i, x: b.x, y: b.y, prev: null!, next: null!, z: 0, prevZ: null, nextZ: null, steiner: false }
    const an = a.next, bp = b.prev
    a.next = b; b.prev = a; a2.next = an; an.prev = a2; b2.next = a2; a2.prev = b2; bp.next = b2; b2.prev = bp
    return b2
}
function filterPoints(start: ENode, end?: ENode): ENode {
    if (!end) end = start
    let p = start, again: boolean
    do {
        again = false
        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) { removeNode(p); p = end = p.prev; if (p === p.next) break; again = true }
        else p = p.next
    } while (again || p !== end)
    return end
}
function earcutLinked(ear: ENode | null, triangles: number[], dim: number, minX: number, minY: number, invSize: number, pass: number) {
    if (!ear) return
    if (!pass && invSize) indexCurve(ear, minX, minY, invSize)
    let stop = ear, prev, next
    while (ear!.prev !== ear!.next) {
        prev = ear!.prev; next = ear!.next
        if (invSize ? isEarHashed(ear!, minX, minY, invSize) : isEar(ear!)) {
            triangles.push(prev.i, ear!.i, next.i)
            removeNode(ear!)
            ear = next.next; stop = next.next; continue
        }
        ear = next
        if (ear === stop) {
            if (!pass) earcutLinked(filterPoints(ear!), triangles, dim, minX, minY, invSize, 1)
            else if (pass === 1) { ear = cureLocalIntersections(filterPoints(ear!), triangles); earcutLinked(ear, triangles, dim, minX, minY, invSize, 2) }
            else if (pass === 2) splitEarcut(ear!, triangles, dim, minX, minY, invSize)
            break
        }
    }
}
function cureLocalIntersections(start: ENode, triangles: number[]): ENode {
    let p = start
    do {
        const a = p.prev, b = p.next.next
        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
            triangles.push(a.i, p.i, b.i); removeNode(p); removeNode(p.next); p = start = b
        }
        p = p.next
    } while (p !== start)
    return filterPoints(p)
}
function splitEarcut(start: ENode, triangles: number[], dim: number, minX: number, minY: number, invSize: number) {
    let a = start
    do {
        let b = a.next.next
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
                let c = splitPolygon(a, b)
                a = filterPoints(a, a.next); c = filterPoints(c, c.next)
                earcutLinked(a, triangles, dim, minX, minY, invSize, 0)
                earcutLinked(c, triangles, dim, minX, minY, invSize, 0)
                return
            }
            b = b.next
        }
        a = a.next
    } while (a !== start)
}
function isValidDiagonal(a: ENode, b: ENode): boolean {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) &&
        (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && (area(a.prev, a, b.prev) || area(a, b.prev, b)) || equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0)
}
function intersectsPolygon(a: ENode, b: ENode): boolean {
    let p = a
    do { if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true; p = p.next } while (p !== a)
    return false
}
function middleInside(a: ENode, b: ENode): boolean {
    let p = a; let inside = false; const px = (a.x + b.x) / 2, py = (a.y + b.y) / 2
    do { if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y && (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)) inside = !inside; p = p.next } while (p !== a)
    return inside
}

// ─── Geo helpers ─────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r: number): [number, number, number] {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return [
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
    ]
}

// ─── Build country mesh with earcut ──────────────────────────────────────────
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

    const allVerts: number[] = []
    const allIndices: number[] = []
    const allLineVerts: number[] = []
    let vertOffset = 0

    for (const poly of polys) {
        const outerRing = poly[0]
        if (!outerRing || outerRing.length < 3) continue

        // Flatten to 2D for earcut (lon, lat)
        const flat2d: number[] = []
        const pts3d: number[] = []
        for (const [lon, lat] of outerRing) {
            flat2d.push(lon, lat)
            const [x, y, z] = latLonToVec3(lat, lon, r)
            pts3d.push(x, y, z)
        }

        // Handle holes if present
        const holeIndices: number[] = []
        for (let h = 1; h < poly.length; h++) {
            holeIndices.push(flat2d.length / 2)
            for (const [lon, lat] of poly[h]) {
                flat2d.push(lon, lat)
                const [x, y, z] = latLonToVec3(lat, lon, r)
                pts3d.push(x, y, z)
            }
        }

        const indices = earcut(flat2d, holeIndices.length > 0 ? holeIndices : undefined, 2)
        if (indices.length === 0) continue

        for (let i = 0; i < pts3d.length; i++) allVerts.push(pts3d[i])
        for (const idx of indices) allIndices.push(idx + vertOffset)
        vertOffset += pts3d.length / 3

        // Border line (outer ring only, closed loop)
        for (let i = 0; i <= outerRing.length; i++) {
            const [lon, lat] = outerRing[i % outerRing.length]
            const [x, y, z] = latLonToVec3(lat, lon, r * 1.001)
            allLineVerts.push(x, y, z)
        }
        allLineVerts.push(NaN, NaN, NaN) // separator for multiple rings
    }

    if (allIndices.length > 0) {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute("position", new THREE.Float32BufferAttribute(allVerts, 3))
        geo.setIndex(allIndices)
        geo.computeVertexNormals()

        const mat = new THREE.MeshBasicMaterial({
            color, side: THREE.DoubleSide, transparent: true, opacity: 0.88,
        })
        const mesh = new THREE.Mesh(geo, mat)
            ; (mesh as any).countryName = name
            ; (mesh as any).isFill = true
        group.add(mesh)
    }

    // Thin border lines
    if (allLineVerts.length > 0) {
        // Split by NaN separators into segments
        const segments: number[][] = [[]]
        for (let i = 0; i < allLineVerts.length; i += 3) {
            if (isNaN(allLineVerts[i])) { segments.push([]); continue }
            segments[segments.length - 1].push(allLineVerts[i], allLineVerts[i + 1], allLineVerts[i + 2])
        }
        for (const seg of segments) {
            if (seg.length < 6) continue
            const lineGeo = new THREE.BufferGeometry()
            lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3))
            group.add(new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({
                color: 0x000000, transparent: true, opacity: 0.18, linewidth: 1,
            })))
        }
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
    const sizes = new Float32Array(count)

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
        sizes[i] = 0.5 + Math.random() * 3
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
        size: 2, sizeAttenuation: true, vertexColors: true,
        depthWrite: false, depthTest: false,
    })
    const pts = new THREE.Points(geo, mat)
    pts.renderOrder = -1
    scene.add(pts)
}

// ─── Orbit controls (worker-safe, with inertia) ─────────────────────────────
class OrbitControl {
    private spherical = new THREE.Spherical()
    private target = new THREE.Vector3(0, 0, 0)
    private rotateSpeed = 1.0
    private zoomSpeed = 1.0
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
        this.minDist = mobile ? 160 : 170
        this.maxDist = mobile ? 400 : 500
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
        this._vTheta -= (dx / this._w) * Math.PI * this.rotateSpeed * 2
        this._vPhi -= (dy / this._h) * Math.PI * this.rotateSpeed
        this._lastX = x; this._lastY = y
    }
    zoom(delta: number) {
        this._vZoom += delta * 0.002 * this.zoomSpeed
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
                // Brighten on hover
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
    // Only update changed countries
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

    const initRadius = mobile ? 260 : 280
    orbit = new OrbitControl(initRadius, mobile)
    orbit.setSize(w, h)

    // Fetch GeoJSON and build countries
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
            // Hover detection (only on desktop, skip if dragging)
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

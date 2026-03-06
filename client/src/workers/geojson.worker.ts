// Web Worker: fetch + parse GeoJSON off the main thread
const GEOJSON_URL =
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson"

function samePoint(a: number[], b: number[]): boolean {
    return a?.[0] === b?.[0] && a?.[1] === b?.[1]
}

// Lightweight coordinate decimation for mobile to reduce polygon triangulation cost.
function decimateRing(ring: any[], step: number): any[] {
    if (!Array.isArray(ring) || ring.length < 8 || step <= 1) return ring
    const closed = samePoint(ring[0], ring[ring.length - 1])
    const body = closed ? ring.slice(0, -1) : ring.slice()
    const out: any[] = [body[0]]
    for (let i = step; i < body.length - 1; i += step) out.push(body[i])
    out.push(body[body.length - 1])
    if (closed && !samePoint(out[0], out[out.length - 1])) out.push(out[0])
    return out.length >= 4 ? out : ring
}

function simplifyFeatureGeometry(geometry: any): any {
    if (!geometry) return geometry
    if (geometry.type === "Polygon") {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((ring: any[]) => {
                const len = ring?.length ?? 0
                const step = len > 220 ? 4 : len > 120 ? 3 : 2
                return decimateRing(ring, step)
            }),
        }
    }
    if (geometry.type === "MultiPolygon") {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((poly: any[]) =>
                poly.map((ring: any[]) => {
                    const len = ring?.length ?? 0
                    const step = len > 220 ? 4 : len > 120 ? 3 : 2
                    return decimateRing(ring, step)
                })
            ),
        }
    }
    return geometry
}

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

self.onmessage = async (evt: MessageEvent<{ mobile?: boolean } | null>) => {
    try {
        const mobile = !!evt.data?.mobile
        const res = await fetch(GEOJSON_URL)
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        let features = fixMorocco(
            (data.features as any[]).filter(
                f => f.geometry != null &&
                    (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
            )
        )
        if (mobile) {
            features = features.map((f) => ({
                ...f,
                geometry: simplifyFeatureGeometry(f.geometry),
            }))
        }
        self.postMessage({ ok: true, features })
    } catch (e: any) {
        self.postMessage({ ok: false, error: e.message })
    }
}

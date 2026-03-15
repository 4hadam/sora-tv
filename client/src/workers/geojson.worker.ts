// Web Worker: fetch + parse GeoJSON off the main thread
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

self.onmessage = async () => {
    try {
        const res = await fetch(GEOJSON_URL)
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        const features = fixMorocco(
            (data.features as any[]).filter(
                f => f.geometry != null &&
                    (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
            )
        )
        self.postMessage({ ok: true, features })
    } catch (e: any) {
        self.postMessage({ ok: false, error: e.message })
    }
}

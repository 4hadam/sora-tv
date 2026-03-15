// geojson.worker.ts — local GeoJSON loader adapted from OneDrive source
self.onmessage = async (event: MessageEvent) => {
  // accept either explicit load or default
  if (event.data?.type && event.data.type !== 'load') return

  try {
    const res = await fetch('/assets/ne_110m_admin_0_countries-B0ua2Esj.geojson')
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    const payload = await res.json()
    const features = (payload.features || []).filter((f: any) => {
      const t = f?.geometry?.type
      return t === 'Polygon' || t === 'MultiPolygon'
    }).map((feature: any) => {
      const center = estimateCenter(feature.geometry)
      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: Object.assign({}, feature.properties || {}, {
          CENTER_LAT: center.lat,
          CENTER_LNG: center.lng
        })
      }
    })
    ;(self as any).postMessage({ ok: true, features })
  } catch (err: any) {
    ;(self as any).postMessage({ ok: false, error: err?.message ?? String(err) })
  }
}

function estimateCenter(geometry: any) {
  const coordinates = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const polygon of coordinates) {
    for (const ring of polygon) {
      for (const pt of ring) {
        const [lng, lat] = pt
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  return {
    lat: Number.isFinite(minLat) && Number.isFinite(maxLat) ? (minLat + maxLat) / 2 : 0,
    lng: Number.isFinite(minLng) && Number.isFinite(maxLng) ? (minLng + maxLng) / 2 : 0
  }
}
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

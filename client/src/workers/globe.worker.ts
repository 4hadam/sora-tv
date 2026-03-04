// Globe Web Worker - Renders 3D globe in separate thread using OffscreenCanvas
// This keeps the main UI thread free for interactions

import * as THREE from 'three'

let canvas: OffscreenCanvas | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let globe: THREE.Mesh | null = null
let countryMeshes: THREE.Mesh[] = []
let width = 0
let height = 0
let isRunning = false
let selectedCountry: string | null = null
let isMobile = false

// Country colors palette
const vividPalette = [
    0xFFEB3B, 0xFF5722, 0x2196F3, 0x4CAF50, 0xE91E63,
    0x9C27B0, 0x00BCD4, 0xFFC107, 0xFF9800, 0x8BC34A,
    0x03A9F4, 0xF44336, 0xFF4081, 0xCDDC39, 0x00E676
]

// Rotation state
let phi = 0
let theta = 0.3
let targetPhi = 0
let isDragging = false

// GeoJSON data
let countriesData: any[] = []

function getCountryColor(name: string): number {
    if (name === selectedCountry) {
        return 0xFFFFFF
    }
    const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return vividPalette[hash % vividPalette.length]
}

async function init(offscreenCanvas: OffscreenCanvas, w: number, h: number, mobile: boolean) {
    canvas = offscreenCanvas
    width = w
    height = h
    isMobile = mobile

    // Create renderer with OffscreenCanvas
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !mobile,
        alpha: false,
        powerPreference: 'high-performance'
    })
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(self.devicePixelRatio || 1, mobile ? 1.5 : 2))
    renderer.setClearColor(0x000000, 1)

    // Create scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    // Create camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
    camera.position.z = mobile ? 350 : 280

    // Create stars background
    createStars()

    // Create globe sphere
    createGlobe()

    // Load countries
    await loadCountries()

    // Start render loop
    isRunning = true
    animate()
}

function createStars() {
    if (!scene) return

    const starGroup = new THREE.Group()

    const createStarField = (count: number, color: number, size: number, spread: number) => {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * spread
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        const material = new THREE.PointsMaterial({
            color,
            size,
            sizeAttenuation: true,
            depthWrite: false,
            transparent: true
        })

        return new THREE.Points(geometry, material)
    }

    if (isMobile) {
        starGroup.add(createStarField(400, 0xFFFFFF, 3.5, 5000))
        starGroup.add(createStarField(200, 0xFFEBBE, 3.0, 6000))
    } else {
        starGroup.add(createStarField(1200, 0xFFFFFF, 4.0, 5000))
        starGroup.add(createStarField(800, 0xFFEBBE, 3.2, 6000))
    }

    scene.add(starGroup)
}

function createGlobe() {
    if (!scene) return

    // Create base globe sphere
    const geometry = new THREE.SphereGeometry(100, 64, 64)
    const material = new THREE.MeshBasicMaterial({
        color: 0x0a0a0f,
        transparent: true,
        opacity: 0.95
    })
    globe = new THREE.Mesh(geometry, material)
    scene.add(globe)

    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(103, 64, 64)
    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    scene.add(atmosphere)
}

async function loadCountries() {
    if (!scene || !globe) return

    try {
        const response = await fetch(
            'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson'
        )
        const geojsonData = await response.json()

        // Process features - merge Western Sahara into Morocco
        let features = geojsonData.features
        const moroccoFeature = features.find((f: any) => f.properties.ADMIN === 'Morocco')
        const wSaharaFeature = features.find((f: any) => f.properties.ADMIN === 'Western Sahara')

        if (moroccoFeature && wSaharaFeature) {
            const getCoords = (feature: any) => {
                const geom = feature.geometry
                return geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
            }
            moroccoFeature.geometry.type = 'MultiPolygon'
            moroccoFeature.geometry.coordinates = [
                ...getCoords(moroccoFeature),
                ...getCoords(wSaharaFeature)
            ]
            features = features.filter((f: any) => f.properties.ADMIN !== 'Western Sahara')
        }

        countriesData = features

        // Create country outlines using simple points on sphere
        for (const feature of features) {
            const countryName = feature.properties.ADMIN || ''
            const color = getCountryColor(countryName)

            // Create dots for country territory
            const geometry = new THREE.BufferGeometry()
            const positions: number[] = []

            const processCoords = (coords: number[][]) => {
                for (const coord of coords) {
                    const lon = coord[0] * (Math.PI / 180)
                    const lat = coord[1] * (Math.PI / 180)
                    const radius = 101

                    const x = radius * Math.cos(lat) * Math.cos(-lon)
                    const y = radius * Math.sin(lat)
                    const z = radius * Math.cos(lat) * Math.sin(-lon)

                    positions.push(x, y, z)
                }
            }

            const geom = feature.geometry
            if (geom.type === 'Polygon') {
                geom.coordinates.forEach((ring: number[][]) => processCoords(ring))
            } else if (geom.type === 'MultiPolygon') {
                geom.coordinates.forEach((polygon: number[][][]) => {
                    polygon.forEach((ring: number[][]) => processCoords(ring))
                })
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

            const material = new THREE.PointsMaterial({
                color,
                size: isMobile ? 1.5 : 2,
                sizeAttenuation: true
            })

            const mesh = new THREE.Points(geometry, material)
            mesh.userData = { countryName }
            countryMeshes.push(mesh as any)
            globe.add(mesh)
        }

        self.postMessage({ type: 'countries-loaded', count: features.length })
    } catch (error) {
        console.error('Error loading countries:', error)
    }
}

function updateCountryColors() {
    for (const mesh of countryMeshes) {
        const name = mesh.userData.countryName
        const color = getCountryColor(name)
            ; (mesh.material as THREE.PointsMaterial).color.setHex(color)
    }
}

function animate() {
    if (!isRunning || !renderer || !scene || !camera || !globe) return

    // Auto-rotate when not dragging
    if (!isDragging) {
        phi += 0.002
    }

    // Smooth rotation towards target
    phi += (targetPhi - phi) * 0.05

    // Apply rotation
    globe.rotation.y = phi
    globe.rotation.x = theta

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
}

function resize(w: number, h: number) {
    width = w
    height = h
    if (renderer && camera) {
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
    }
}

function handlePointerMove(deltaX: number) {
    if (isDragging) {
        targetPhi += deltaX * 0.005
    }
}

function setSelectedCountry(country: string | null) {
    selectedCountry = country
    updateCountryColors()
}

function destroy() {
    isRunning = false
    if (renderer) {
        renderer.dispose()
    }
    scene = null
    camera = null
    globe = null
    countryMeshes = []
}

// Message handler
self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data

    switch (type) {
        case 'init':
            await init(data.canvas, data.width, data.height, data.isMobile)
            self.postMessage({ type: 'ready' })
            break

        case 'resize':
            resize(data.width, data.height)
            break

        case 'pointerdown':
            isDragging = true
            break

        case 'pointerup':
            isDragging = false
            break

        case 'pointermove':
            handlePointerMove(data.deltaX)
            break

        case 'select-country':
            setSelectedCountry(data.country)
            break

        case 'destroy':
            destroy()
            break
    }
}

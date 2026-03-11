import React, { useRef, useEffect } from "react";
import * as THREE from "three";
// استخدم OrbitControls من مكتبة three-stdlib
import { OrbitControls } from "three-stdlib";

const GLOBE_RADIUS = 200;
const SEGMENTS = 64;

function latLngToVector3(lat: number, lng: number, radius: number) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

const GlobeCustom = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const selectedCountry = useRef<string | null>(null);

    useEffect(() => {
        // إعداد المشهد والكاميرا والرندر
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        camera.position.z = 500;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(400, 400);
        if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

        // كرة الأرضية مع صورة world map
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS);
        const textureLoader = new THREE.TextureLoader();
        const worldTexture = textureLoader.load("/world.jpg"); // ضع world.jpg في public
        const globeMaterial = new THREE.MeshPhongMaterial({ map: worldTexture, shininess: 10 });
        const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
        scene.add(globeMesh);

        // خطوط الطول والعرض
        for (let i = 0; i < 24; i++) {
            const lat = -90 + (i * 180) / 23;
            const curve = new THREE.EllipseCurve(0, 0, GLOBE_RADIUS, GLOBE_RADIUS, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(SEGMENTS);
            const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => latLngToVector3(lat, (p.x / GLOBE_RADIUS) * 180, GLOBE_RADIUS + 1)));
            const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
        }
        for (let i = 0; i < 24; i++) {
            const lng = -180 + (i * 360) / 23;
            const points = [];
            for (let j = 0; j <= SEGMENTS; j++) {
                const lat = -90 + (j * 180) / SEGMENTS;
                points.push(latLngToVector3(lat, lng, GLOBE_RADIUS + 1));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
        }

        // إضاءة
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(500, 500, 500);
        scene.add(light);

        // رسم الدول (GeoJSON)
        fetch("/world.geojson")
            .then(res => res.json())
            .then(geojson => {
                geojson.features.forEach((feature: any) => {
                    const country = feature.properties.ADMIN || "";
                    const color = 0xcccccc;
                    const material = new THREE.MeshBasicMaterial({ color });
                    feature.geometry.coordinates.forEach((polygon: any) => {
                        const shape = new THREE.Shape();
                        polygon[0].forEach(([lng, lat]: [number, number], idx: number) => {
                            const v = latLngToVector3(lat, lng, GLOBE_RADIUS + 2);
                            if (idx === 0) shape.moveTo(v.x, v.y);
                            else shape.lineTo(v.x, v.y);
                        });
                        const geometry = new THREE.ShapeGeometry(shape);
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.userData.country = country;
                        scene.add(mesh);
                    });
                });
            });

        // دوران تلقائي
        function animate() {
            globeMesh.rotation.y += 0.003;
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        animate();

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.minDistance = 250;
        controls.maxDistance = 800;

        // تفاعل النقر
        renderer.domElement.addEventListener("click", (event) => {
            const mouse = new THREE.Vector2();
            mouse.x = (event.offsetX / 400) * 2 - 1;
            mouse.y = -(event.offsetY / 400) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.userData.country && obj instanceof THREE.Mesh && obj.material && obj.material.color) {
                    obj.material.color.set(0xff5722); // تلوين الدولة
                    selectedCountry.current = obj.userData.country;
                }
            }
        });

        return () => {
            renderer.dispose();
            if (mountRef.current) mountRef.current.innerHTML = "";
        };
    }, []);

    return <div ref={mountRef} className="globe-container" />;
};

export default GlobeCustom;

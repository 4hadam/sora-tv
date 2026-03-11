import React, { useRef, useEffect } from "react";
import * as THREE from "three";

// تحتاج ملف world.geojson (خريطة العالم) في public أو src
// يمكنك تحميله من https://geojson-maps.ash.ms/world-110m.geo.json

const GLOBE_RADIUS = 200;

function loadGeoJson(url: string): Promise<any> {
    return fetch(url).then((res) => res.json());
}

function latLngToVector3(lat: number, lng: number, radius: number) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

const GlobeLight = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const selectedCountry = useRef<string | null>(null);

    useEffect(() => {
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        camera.position.z = 500;
        let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(400, 400);
        if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

        // كرة أرضية زرقاء فقط
        const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
        const globeMaterial = new THREE.MeshPhongMaterial({ color: 0x4488ff, shininess: 10, transparent: true, opacity: 0.8 });
        const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
        scene.add(globeMesh);

        // إضاءة
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(500, 500, 500);
        scene.add(light);

        // رسم الدول
        loadGeoJson("/world.geojson").then((geojson) => {
            geojson.features.forEach((feature: any) => {
                const country = feature.properties.ADMIN || "";
                const color = 0xcccccc;
                const material = new THREE.MeshBasicMaterial({ color });
                feature.geometry.coordinates.forEach((polygon: any) => {
                    const shape = new THREE.Shape();
                    polygon[0].forEach(([lng, lat]: [number, number], idx: number) => {
                        const v = latLngToVector3(lat, lng, GLOBE_RADIUS + 1);
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

export default GlobeLight;

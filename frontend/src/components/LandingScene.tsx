import { useEffect, useRef } from "react";

const nodes = [
  [-2.8, 0.8, 0],
  [-1.4, 1.6, -0.3],
  [0.2, 0.95, 0.2],
  [1.7, 1.55, -0.2],
  [2.7, 0.45, 0.1],
  [-1.9, -0.7, 0.2],
  [-0.2, -1.15, -0.1],
  [1.35, -0.65, 0.25],
] as const;

const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [2, 6],
] as const;

export function LandingScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = window.matchMedia("(max-width: 767px)").matches;
    if (reducedMotion) {
      return;
    }

    let disposed = false;
    let cleanupScene = () => {};

    void import("three").then((THREE) => {
      if (disposed) {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(smallScreen ? 52 : 46, 1, 0.1, 100);
      camera.position.set(0, 0, smallScreen ? 9.2 : 7.5);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(smallScreen ? 1 : Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const graph = new THREE.Group();
      graph.scale.setScalar(smallScreen ? 0.78 : 1);
      graph.position.set(smallScreen ? 0.85 : 0, smallScreen ? -0.35 : 0, 0);
      scene.add(graph);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x26c6da,
        transparent: true,
        opacity: smallScreen ? 0.14 : 0.22,
      });

      const nodeGeometry = new THREE.SphereGeometry(smallScreen ? 0.045 : 0.055, smallScreen ? 10 : 16, smallScreen ? 10 : 16);
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: 0x15616d,
        transparent: true,
        opacity: smallScreen ? 0.34 : 0.55,
      });
      const activeNodeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff7d00,
        transparent: true,
        opacity: smallScreen ? 0.54 : 0.8,
      });

      const nodeMeshes = nodes.map((point, index) => {
        const mesh = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? activeNodeMaterial : nodeMaterial);
        mesh.position.set(point[0], point[1], point[2]);
        graph.add(mesh);
        return mesh;
      });

      const edgeLines: Array<InstanceType<typeof THREE.Line>> = [];
      const edgeSegments = edges.map(([startIndex, endIndex]) => {
        const start = new THREE.Vector3(...nodes[startIndex]);
        const end = new THREE.Vector3(...nodes[endIndex]);
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, lineMaterial);
        edgeLines.push(line);
        graph.add(line);
        return { start, end };
      });

      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0xff7d00,
        transparent: true,
        opacity: 0.82,
      });
      const pulseGeometry = new THREE.SphereGeometry(smallScreen ? 0.055 : 0.075, smallScreen ? 10 : 16, smallScreen ? 10 : 16);
      const pulseOffsets = smallScreen ? [0, 4] : [0, 3, 6];
      const pulses = pulseOffsets.map((offset) => {
        const mesh = new THREE.Mesh(pulseGeometry, pulseMaterial.clone());
        graph.add(mesh);
        return { mesh, offset };
      });

      const resize = () => {
        const width = container.clientWidth || 1;
        const height = container.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resize();
      window.addEventListener("resize", resize);

      let frameId = 0;
      const timer = new THREE.Timer();
      timer.connect(document);

      const animate = (timestamp?: number) => {
        timer.update(timestamp);
        const elapsed = Math.max(0, timer.getElapsed());
        graph.rotation.z = Math.sin(elapsed * 0.18) * (smallScreen ? 0.025 : 0.045);
        graph.rotation.y = Math.sin(elapsed * 0.24) * (smallScreen ? 0.07 : 0.12);

        nodeMeshes.forEach((mesh, index) => {
          const scale = 1 + Math.sin(elapsed * 1.8 + index * 0.7) * (smallScreen ? 0.11 : 0.18);
          mesh.scale.setScalar(scale);
        });

        pulses.forEach(({ mesh, offset }, index) => {
          const pulseTime = elapsed * 0.7 + offset;
          const edgeIndex = (Math.floor(pulseTime) + index) % edgeSegments.length;
          const edge = edgeSegments[edgeIndex];
          const progress = ((pulseTime % 1) + 1) % 1;
          mesh.position.copy(edge.start).lerp(edge.end, progress);
          const material = mesh.material as InstanceType<typeof THREE.MeshBasicMaterial>;
          material.opacity = (smallScreen ? 0.22 : 0.35) + Math.sin(progress * Math.PI) * (smallScreen ? 0.28 : 0.5);
        });

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      frameId = window.requestAnimationFrame(animate);

      cleanupScene = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        renderer.dispose();
        nodeGeometry.dispose();
        pulseGeometry.dispose();
        lineMaterial.dispose();
        nodeMaterial.dispose();
        activeNodeMaterial.dispose();
        pulses.forEach(({ mesh }) => {
          const material = mesh.material as InstanceType<typeof THREE.Material>;
          material.dispose();
        });
        edgeLines.forEach((line) => line.geometry.dispose());
        timer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanupScene();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block opacity-45 sm:opacity-60 md:opacity-80"
    />
  );
}

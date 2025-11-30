import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export type ThreeViewerHandle = {
  snapshot: (scale?: number) => string | null;
};

type CoreMeta = {
  area_mm2?: number;
  size_mm2?: number;
  color?: string;
  cca?: number;
};

type Props = {
  cores?: number;
  coreRadius?: number; // visual radius in px
  sheathRadius?: number; // visual radius
  length?: number;
  coreColors?: string[];
  coreMeta?: CoreMeta[];
  onCoreSelect?: (index: number | null, meta?: CoreMeta | null) => void;
  width?: number | string;
  height?: number | string;
};

const ThreeViewer = forwardRef<ThreeViewerHandle, Props>(
  ({ cores = 3, coreRadius = 6, sheathRadius = 22, length = 140, coreColors = [], coreMeta = [], onCoreSelect, width = 320, height = 200 }, ref) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const frameId = useRef<number | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useImperativeHandle(ref, () => ({
      snapshot: (scale = 1) => {
        const renderer = rendererRef.current;
        if (!renderer) return null;
        try {
          const canvas = renderer.domElement as HTMLCanvasElement;
          if (scale && scale > 1) {
            // temporarily increase pixel ratio & size for higher-res snapshot
            const prevPR = renderer.getPixelRatio();
            const prevSize = renderer.getSize(new THREE.Vector2());
            renderer.setPixelRatio(prevPR * scale);
            renderer.setSize(prevSize.x * scale, prevSize.y * scale, false);
            renderer.render((renderer as any).__scene, (renderer as any).__camera);
            const data = canvas.toDataURL('image/png');
            // restore
            renderer.setPixelRatio(prevPR);
            renderer.setSize(prevSize.x, prevSize.y, false);
            return data;
          }
          return canvas.toDataURL('image/png');
        } catch (err) {
          return null;
        }
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      // ensure relative positioning so overlays can be placed
      container.style.position = container.style.position || 'relative';

      // tooltip overlay
      const tooltip = document.createElement('div');
      tooltip.style.position = 'absolute';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.background = 'rgba(0,0,0,0.75)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '6px 8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.display = 'none';
      tooltip.style.zIndex = '10';
      container.appendChild(tooltip);

      // controls overlay (simple)
      const controlsOverlay = document.createElement('div');
      controlsOverlay.style.position = 'absolute';
      controlsOverlay.style.right = '8px';
      controlsOverlay.style.top = '8px';
      controlsOverlay.style.zIndex = '11';
      container.appendChild(controlsOverlay);

      const btn = document.createElement('button');
      btn.textContent = 'Toggle Sheath';
      btn.style.fontSize = '11px';
      btn.style.padding = '6px 8px';
      btn.style.marginLeft = '4px';
      controlsOverlay.appendChild(btn);

      const colorBtn = document.createElement('button');
      colorBtn.textContent = 'Cycle Colors';
      colorBtn.style.fontSize = '11px';
      colorBtn.style.padding = '6px 8px';
      colorBtn.style.marginLeft = '4px';
      controlsOverlay.appendChild(colorBtn);
      const w = typeof width === 'number' ? width : container.clientWidth || 320;
      const h = typeof height === 'number' ? height : container.clientHeight || 200;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(w, h);
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.set(0, 60, 120);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
      hemi.position.set(0, 200, 0);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(-100, 100, -100);
      scene.add(dir);

      // sheath
      const sheathGeom = new THREE.CylinderGeometry(sheathRadius, sheathRadius, length, 48);
      const sheathMat = new THREE.MeshStandardMaterial({ color: 0x001f3f, opacity: 0.12, transparent: true });
      const sheath = new THREE.Mesh(sheathGeom, sheathMat);
      sheath.rotation.z = Math.PI / 2;
      sheath.position.set(0, 0, 0);
      scene.add(sheath);

      // cores
      const coreGroup = new THREE.Group();
      const placed = Math.max(1, cores);
      const radius = Math.max(8, sheathRadius * 0.7);
      const coreMeshes: THREE.Mesh[] = [];
      for (let i = 0; i < placed; i++) {
        const angle = (i / placed) * Math.PI * 2;
        const geometry = new THREE.CylinderGeometry(coreRadius, coreRadius, length * 0.9, 32);
        const colorHex = coreColors && coreColors.length ? coreColors[i % coreColors.length] : undefined;
        const color = colorHex ? parseInt(colorHex.replace('#', '0x')) : i % 2 === 0 ? 0xff8c00 : 0x1e88e5;
        const material = new THREE.MeshStandardMaterial({ color });
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.rotation.z = Math.PI / 2;
        cylinder.position.x = Math.cos(angle) * radius * 0.6;
        cylinder.position.y = Math.sin(angle) * radius * 0.2;
        coreGroup.add(cylinder);
        coreMeshes.push(cylinder);
      }
      scene.add(coreGroup);

      // expose scene/camera on renderer to allow offscreen snapshot rendering
      (renderer as any).__scene = scene;
      (renderer as any).__camera = camera;

      const grid = new THREE.GridHelper(200, 20, 0xdddddd, 0xeeeeee);
      grid.position.y = -40;
      scene.add(grid);

      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        frameId.current = requestAnimationFrame(animate);
      };
      animate();

      // raycaster for hover/selection
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let lastHovered: number | null = null;
      let selectedIndex: number | null = null;

      const updateTooltipPos = (x: number, y: number, text: string) => {
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y + 10 + 'px';
        tooltip.textContent = text;
        tooltip.style.display = 'block';
      };

      const clearHover = () => {
        tooltip.style.display = 'none';
        if (lastHovered !== null && coreMeshes[lastHovered]) {
          coreMeshes[lastHovered].scale.set(1, 1, 1);
          (coreMeshes[lastHovered].material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
        lastHovered = null;
      };

      const onPointerMove = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(coreMeshes, false);
        if (intersects.length) {
          const obj = intersects[0].object as THREE.Mesh;
          const idx = coreMeshes.indexOf(obj);
          if (idx !== lastHovered) {
            if (lastHovered !== null && coreMeshes[lastHovered]) {
              coreMeshes[lastHovered].scale.set(1, 1, 1);
              (coreMeshes[lastHovered].material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
            lastHovered = idx;
            coreMeshes[idx].scale.set(1.08, 1.08, 1.08);
            (coreMeshes[idx].material as THREE.MeshStandardMaterial).emissive.setHex(0x222222);
          }
          updateTooltipPos(x, y, `Core ${idx + 1}`);
        } else {
          clearHover();
        }
      };

      const onClick = (ev: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(coreMeshes, false);
        if (intersects.length) {
          const obj = intersects[0].object as THREE.Mesh;
          const idx = coreMeshes.indexOf(obj);
          // toggle selection
          if (selectedIndex !== null && coreMeshes[selectedIndex]) {
            coreMeshes[selectedIndex].scale.set(1, 1, 1);
          }
          if (selectedIndex === idx) {
            selectedIndex = null;
          } else {
            selectedIndex = idx;
            coreMeshes[idx].scale.set(1.2, 1.2, 1.2);
          }
          // call back with metadata if provided
          const meta = coreMeta && coreMeta.length > idx ? coreMeta[idx] : undefined;
          if (onCoreSelect) onCoreSelect(selectedIndex, meta || null);
        }
      };

      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('click', onClick);

      btn.addEventListener('click', () => {
        sheath.visible = !sheath.visible;
      });

      colorBtn.addEventListener('click', () => {
        // cycle colors
        for (let i = 0; i < coreMeshes.length; i++) {
          const mat = coreMeshes[i].material as THREE.MeshStandardMaterial;
          // pick a new color based on index and time
          const hue = Math.floor((Date.now() / 200 + i * 40) % 360);
          const col = new THREE.Color(`hsl(${hue},70%,50%)`);
          mat.color = col;
        }
      });

      const handleResize = () => {
        const newW = container.clientWidth || w;
        const newH = container.clientHeight || h;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        if (frameId.current) cancelAnimationFrame(frameId.current);
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('click', onClick);
        btn.removeEventListener('click', () => {});
        colorBtn.removeEventListener('click', () => {});
        // remove overlays
        if (tooltip.parentElement) tooltip.parentElement.removeChild(tooltip);
        if (controlsOverlay.parentElement) controlsOverlay.parentElement.removeChild(controlsOverlay);
        controls.dispose();
        renderer.dispose();
        rendererRef.current = null;
        container.removeChild(renderer.domElement);
      };
    }, [cores, coreRadius, sheathRadius, length, coreColors, width, height]);

    return <div ref={mountRef} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }} />;
  }
);

export default ThreeViewer;

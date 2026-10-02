import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { sceneState } from './store';
import { setupCharacterShader, type CharacterShader } from './characterShader';

const MODEL_URL = '/models/steven.glb?v=20261002-original-quality';
const PORTRAIT_HEIGHT = 0.57;
const PORTRAIT_WIDTH = 0.58;
const CAMERA_POS = new THREE.Vector3(0, 1.4, 2.6);
const LOOK_AT = new THREE.Vector3(0, 1.4, 0);
const IDLE_AFTER = 2.5; // segundos sin mover el mouse antes de que mire por su cuenta

/**
 * El modelo viene de un generador image-to-3D: la textura de color ya trae la iluminación
 * "pintada" (sombras, brillos, ojos). Se muestra como en el visor de Higgsfield: solo la
 * textura bajo luz plana (ver Stage.tsx). Los mapas de rugosidad y relieve se desactivan:
 * el relieve tiene costuras UV y la rugosidad hace brillar la piel como plástico.
 */

const _head = new THREE.Vector3();

export function Character() {
  const { scene } = useGLTF(MODEL_URL);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const { hero, rig, baseHeroY } = useMemo(() => {
    const hero = scene.getObjectByName('HERO_character')!;
    let rig: CharacterShader | undefined;
    hero.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.metalnessMap = null;
      mat.roughnessMap = null;
      mat.normalMap = null;
      mat.emissiveMap = null;
      mat.emissive.set('#000000');
      mat.metalness = 0;
      mat.roughness = 1;
      mat.specularIntensity = 0.2;
      if (mat.map) {
        mat.map.anisotropy = gl.capabilities.getMaxAnisotropy();
        mat.map.minFilter = THREE.LinearMipmapLinearFilter;
        mat.map.magFilter = THREE.LinearFilter;
        mat.map.generateMipmaps = true;
        mat.map.needsUpdate = true;
      }
      rig = setupCharacterShader(mesh);
    });
    return { hero, rig: rig!, baseHeroY: hero.position.y };
  }, [scene, gl]);

  const gaze = useRef({ yaw: 0, pitch: 0 });
  const reducedMotion = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    const { width, height } = state.size;
    const aspect = width / height;

    // Encuadre local: conserva el busto completo al cambiar el tamaño de la portada.
    const visibleHeight = Math.max(PORTRAIT_HEIGHT, PORTRAIT_WIDTH / aspect);
    camera.position.copy(CAMERA_POS);
    camera.lookAt(LOOK_AT);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(visibleHeight / (2 * CAMERA_POS.z)));
    camera.zoom = 1;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();

    // 2. Hacia dónde mira: al cursor (relativo a su cabeza en pantalla) o, en reposo, alrededor.
    const { pointer } = sceneState;
    const idle = performance.now() / 1000 - pointer.lastMove > IDLE_AFTER;
    let yaw: number;
    let pitch: number;
    if (reducedMotion.current) {
      yaw = 0;
      pitch = 0;
    } else if (idle) {
      yaw = Math.sin(time * 0.35) * 0.12 + Math.sin(time * 0.7) * 0.025;
      pitch = Math.sin(time * 0.3) * 0.025 - 0.015;
    } else {
      hero.getWorldPosition(_head).y += 0.12; // altura aproximada de los ojos
      _head.project(camera);
      yaw = THREE.MathUtils.clamp((pointer.x - _head.x) * 0.4, -0.32, 0.32);
      pitch = THREE.MathUtils.clamp((pointer.y + _head.y) * 0.2, -0.1, 0.12);
    }
    const speed = idle ? 1.5 : 5;
    gaze.current.yaw = THREE.MathUtils.damp(gaze.current.yaw, yaw, speed, dt);
    gaze.current.pitch = THREE.MathUtils.damp(gaze.current.pitch, pitch, speed, dt);

    // 3. La cabeza gira sobre el cuello; el torso acompaña un poco y "respira".
    rig.yaw.value = gaze.current.yaw * 0.8;
    rig.pitch.value = gaze.current.pitch;
    const motion = reducedMotion.current ? 0 : 1;
    rig.roll.value = -gaze.current.yaw * 0.06 + Math.sin(time * 0.6) * 0.008 * motion;
    hero.rotation.set(0, -0.08 + gaze.current.yaw * 0.25, Math.sin(time * 0.7) * 0.004 * motion);
    hero.position.y = baseHeroY + Math.sin(time * 1.3) * 0.0015 * motion;
  });

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_URL);

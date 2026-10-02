import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { poke, sceneState } from './store';
import { setupCharacterShader, type CharacterShader } from './characterShader';
import { HeadReaction } from './reaction';

const MODEL_URL = '/models/steven.glb?v=20261002-natural-blink';
const PORTRAIT_HEIGHT = 0.57;
const PORTRAIT_WIDTH = 0.58;
const CAMERA_POS = new THREE.Vector3(0, 1.4, 2.6);
const LOOK_AT = new THREE.Vector3(0, 1.4, 0);
const IDLE_AFTER = 2.5; // segundos sin mover el mouse antes de que mire por su cuenta
const HEAD_HALF_WIDTH = 0.09; // en unidades de la escena: un golpe a esta distancia del centro cuenta como lateral
// Solo la cabeza reacciona: de la barbilla para arriba, en fracción del alto del modelo (0 = base, 1 = coronilla).
// Medido en el perfil frontal de la malla: el cuello termina en ~0.40 y la barbilla empieza en ~0.42.
const HEAD_FROM = 0.42;
// ponytail: el raycast recorre los ~118k triángulos (~5 ms), por eso el hover se revisa como mucho cada 100 ms
// y el clic una vez. Si hiciera falta hover a 60 fps: three-mesh-bvh o una malla de colisión simplificada.
const HOVER_CHECK_MS = 100;

// Estrellas del golpe: órbita inclinada hacia la cámara alrededor de la coronilla.
const STAR_COUNT = 5;
const STAR_SIZE = 0.02;
const STAR_RING = { x: 0.13, z: 0.1, y: -0.035, tilt: 0.4 };
const STAR_COLORS = ['#ffd36b', '#f3f0ec']; // amarillo de caricatura e ink del sitio: el rojo se perdía sobre PORTAFOLIO

/**
 * El modelo viene de un generador image-to-3D: la textura de color ya trae la iluminación
 * "pintada" (sombras, brillos, ojos). Se muestra como en el visor de Higgsfield: solo la
 * textura bajo luz plana (ver Stage.tsx). Los mapas de rugosidad y relieve se desactivan:
 * el relieve tiene costuras UV y la rugosidad hace brillar la piel como plástico.
 */

const _head = new THREE.Vector3();
const _crown = new THREE.Vector3();
const _headRotation = new THREE.Euler(0, 0, 0, 'YXZ'); // mismo orden que headRotation() del shader
const _billboard = new THREE.Quaternion();
const _local = new THREE.Vector3();

/** Estrella de caricatura de cinco puntas, con volumen: extruida y con bisel redondeado. */
function createStarGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.48 : 1;
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
    shape[i ? 'lineTo' : 'moveTo'](Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.12,
    bevelSegments: 4,
  });
  geometry.center();
  return geometry;
}

export function Character() {
  const { scene } = useGLTF(MODEL_URL);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const { hero, mesh, rig, blinkIndex, blinkSurfaceIndex, baseHeroY } = useMemo(() => {
    const hero = scene.getObjectByName('HERO_character')!;
    let rig: CharacterShader | undefined;
    let body: THREE.Mesh | undefined;
    hero.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      body = mesh;
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
    // Morph target "ojos cerrados", creado en Blender (scripts/blender/blink.py).
    const blinkIndex = body!.morphTargetDictionary?.blink;
    const blinkSurfaceIndex = body!.morphTargetDictionary?.blink_surface;
    return { hero, mesh: body!, rig: rig!, blinkIndex, blinkSurfaceIndex, baseHeroY: hero.position.y };
  }, [scene, gl]);

  const stars = useMemo(() => ({
    geometry: createStarGeometry(),
    // Con luz real (no MeshBasic) el bisel se sombrea y se nota el volumen; el emisivo las
    // mantiene vivas con la luz casi plana de la escena.
    materials: STAR_COLORS.map((color) => new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.1,
    })),
  }), []);
  useEffect(() => () => {
    stars.geometry.dispose();
    stars.materials.forEach((m) => m.dispose());
  }, [stars]);
  const starGroup = useRef<THREE.Group>(null);

  const reaction = useMemo(() => new HeadReaction(), []);
  const seenPokes = useRef(sceneState.poke.count); // los golpes de antes de montar no cuentan
  const crownWorld = useRef(new THREE.Vector3(0, 1.6, 0));

  const gaze = useRef({ yaw: 0, pitch: 0 });
  const reducedMotion = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  // Clic o toque sobre la cabeza (no sobre el cuerpo ni el área vacía del canvas) → golpecito.
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const { min, max } = mesh.geometry.boundingBox!; // calculado en setupCharacterShader
    const headFromY = min.y + (max.y - min.y) * HEAD_FROM;
    const hitTest = (e: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - bounds.left) / bounds.width) * 2 - 1, -((e.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // ponytail: prueba contra la malla sin la rotación del shader; con giros de ≤0.35 rad el borde se desvía unos px.
      const hit = raycaster.intersectObject(mesh, false)[0];
      return hit && mesh.worldToLocal(_local.copy(hit.point)).y >= headFromY ? hit : undefined;
    };

    let hoverTimer = 0;
    let lastMove: PointerEvent | null = null;
    const setCursor = (hovering: boolean) => { canvas.style.cursor = hovering ? 'pointer' : ''; };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      lastMove = e;
      if (hoverTimer) return;
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        if (lastMove) setCursor(!!hitTest(lastMove)); // usa la última posición: el estado final siempre es correcto
      }, HOVER_CHECK_MS);
    };
    const onLeave = () => {
      lastMove = null;
      setCursor(false);
    };
    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e);
      if (!hit) return;
      poke((hit.point.x - crownWorld.current.x) / HEAD_HALF_WIDTH);
      if (e instanceof PointerEvent && e.pointerType === 'mouse') setCursor(true);
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);
    return () => {
      window.clearTimeout(hoverTimer);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      setCursor(false);
    };
  }, [gl, camera, mesh]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    // Reloj de pared, no state.clock: R3F lo reinicia a 0 cada vez que la portada vuelve a la
    // pantalla (frameloop 'never' → 'always') y los tiempos guardados quedaban en el futuro: las
    // estrellas reaparecían. Este sigue corriendo fuera de pantalla y nunca retrocede.
    const time = performance.now() / 1000;
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

    // 3. Golpecitos: la reacción se suma a la mirada. Con movimiento reducido solo salen las estrellas.
    const { poke: pokes } = sceneState;
    if (pokes.count !== seenPokes.current) {
      seenPokes.current = pokes.count;
      reaction.hit(time, pokes.side);
    }
    reaction.update(time);
    const motion = reducedMotion.current ? 0 : 1;
    const hit = reaction.angles;

    // 4. La cabeza gira sobre el cuello; el torso acompaña un poco y "respira".
    rig.yaw.value = gaze.current.yaw * 0.8 + hit.yaw * motion;
    rig.pitch.value = gaze.current.pitch + hit.pitch * motion;
    rig.roll.value = -gaze.current.yaw * 0.06 + Math.sin(time * 0.6) * 0.008 * motion + hit.roll * motion;
    hero.rotation.set(0, -0.08 + gaze.current.yaw * 0.25, (Math.sin(time * 0.7) * 0.004 + hit.roll * 0.08) * motion);
    hero.position.y = baseHeroY + Math.sin(time * 1.3) * 0.0015 * motion;
    if (blinkIndex !== undefined) mesh.morphTargetInfluences![blinkIndex] = reaction.eyesClosed;
    // Mantiene el párpado sobre la cara en mitad del cierre; desaparece al abrir y cerrar del todo.
    if (blinkSurfaceIndex !== undefined) {
      mesh.morphTargetInfluences![blinkSurfaceIndex] = 4 * reaction.eyesClosed * (1 - reaction.eyesClosed);
    }

    // 5. Coronilla en el mundo, con la misma rotación que aplica el shader a la cabeza.
    _headRotation.set(rig.pitch.value, rig.yaw.value, rig.roll.value);
    _crown.copy(rig.crown).sub(rig.pivot).applyEuler(_headRotation).add(rig.pivot);
    mesh.updateWorldMatrix(true, false);
    crownWorld.current.copy(mesh.localToWorld(_crown));

    // 6. Estrellas orbitando la cabeza.
    const group = starGroup.current;
    if (!group) return;
    group.visible = reaction.starsVisible > 0;
    if (!group.visible) return;
    group.position.copy(crownWorld.current);
    group.position.y += STAR_RING.y;
    group.rotation.set(STAR_RING.tilt, 0, rig.roll.value);
    // Base: cada estrella de frente a la cámara (rotación de la cámara relativa a la del anillo).
    _billboard.copy(group.quaternion).invert().multiply(camera.quaternion);
    const spin = reaction.starsSpin * motion;
    // Son opacas (con transparencia el bisel se ve a través de sí mismo): entran y salen escalando.
    const scale = STAR_SIZE * reaction.starsVisible * (motion ? reaction.starsScale : 1);
    group.children.forEach((star, i) => {
      const angle = spin + (i / STAR_COUNT) * Math.PI * 2;
      star.position.set(Math.cos(angle) * STAR_RING.x, Math.sin(angle * 2) * 0.008, Math.sin(angle) * STAR_RING.z);
      // Sobre esa base se tambalean en 3D para que se vea el grosor, sin llegar a quedar de canto.
      star.quaternion.copy(_billboard);
      star.rotateY(Math.sin(spin * 1.7 + i * 1.3) * 0.85);
      star.rotateX(Math.cos(spin * 1.1 + i) * 0.35);
      star.rotateZ(angle * 1.2);
      star.scale.setScalar(scale * (i % 2 ? 0.75 : 1));
    });
  });

  return (
    <>
      <primitive object={scene} />
      <group ref={starGroup} visible={false}>
        {Array.from({ length: STAR_COUNT }, (_, i) => (
          <mesh key={i} geometry={stars.geometry} material={stars.materials[i % STAR_COLORS.length]} />
        ))}
      </group>
    </>
  );
}

useGLTF.preload(MODEL_URL);

import * as THREE from 'three';

/**
 * Ajustes de shader del personaje:
 *
 * 1. "Hueso" virtual de cuello para un modelo sin esqueleto.
 *    El busto es una sola malla estática, así que la cabeza se gira en el vertex shader:
 *    los vértices por encima del cuello rotan alrededor de un pivote, con un peso que crece
 *    suavemente entre la base y la parte alta del cuello para que no haya un corte visible.
 *    Las alturas son fracciones del alto del modelo (0 = base del busto, 1 = coronilla).
 *
 * 2. Color de la textura: punto medio entre lo realista y lo animado. La textura original es
 *    muy anaranjada; con saturación al 85 % y un leve tinte cálido, la piel queda en ~0.47 de
 *    saturación (Higgsfield muestra 0.57; un render "realista" lavado, 0.36).
 *
 * 3. Brillo de borde (fresnel) solo en la camiseta y la parte alta del pelo, para separarlos
 *    del fondo negro de la página sin iluminar la cara.
 */
const NECK_START = 0.28; // cuello de la camiseta: aquí el peso es 0
const NECK_END = 0.42; // mandíbula: desde aquí la cabeza gira completa
const PIVOT_HEIGHT = 0.33;
const PIVOT_DEPTH = -0.1; // fracción de la profundidad, ligeramente detrás del centro
const SATURATION = 0.85; // 1 = textura original
const TINT = new THREE.Color(1, 1, 0.95);
const RIM_COLOR = new THREE.Color(0.2, 0.2, 0.22); // lineal; gris neutro y tenue
const TORSO_TOP = 0.3; // el brillo de borde se apaga por encima de esta altura…
const HAIR_FROM = 0.86; // …y vuelve a aparecer desde aquí (coronilla)

export type CharacterShader = {
  yaw: THREE.IUniform<number>;
  pitch: THREE.IUniform<number>;
  roll: THREE.IUniform<number>;
};

export function setupCharacterShader(mesh: THREE.Mesh): CharacterShader {
  // Idempotente: React puede ejecutar el useMemo que llama a esto más de una vez.
  if (mesh.userData.characterShader) return mesh.userData.characterShader as CharacterShader;
  const geo = mesh.geometry;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const h = max.y - min.y;
  const center = new THREE.Vector3();
  geo.boundingBox!.getCenter(center);

  const rig: CharacterShader = {
    yaw: { value: 0 },
    pitch: { value: 0 },
    roll: { value: 0 },
  };
  const pivot = new THREE.Vector3(center.x, min.y + h * PIVOT_HEIGHT, center.z + (max.z - min.z) * PIVOT_DEPTH);
  const neck = new THREE.Vector2(min.y + h * NECK_START, min.y + h * NECK_END);
  const heightRange = new THREE.Vector2(min.y, h);

  const material = mesh.material as THREE.MeshStandardMaterial;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uHeadYaw: rig.yaw,
      uHeadPitch: rig.pitch,
      uHeadRoll: rig.roll,
      uHeadPivot: { value: pivot },
      uNeck: { value: neck },
      uHeightRange: { value: heightRange },
      uSaturation: { value: SATURATION },
      uTint: { value: TINT },
      uRimColor: { value: RIM_COLOR },
    });

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uHeadYaw;
        uniform float uHeadPitch;
        uniform float uHeadRoll;
        uniform vec3 uHeadPivot;
        uniform vec2 uNeck;
        uniform vec2 uHeightRange;
        varying float vHeight;

        mat3 headRotation(float w) {
          float y = uHeadYaw * w, p = uHeadPitch * w, r = uHeadRoll * w;
          mat3 ry = mat3(cos(y), 0.0, -sin(y),  0.0, 1.0, 0.0,  sin(y), 0.0, cos(y));
          mat3 rx = mat3(1.0, 0.0, 0.0,  0.0, cos(p), sin(p),  0.0, -sin(p), cos(p));
          mat3 rz = mat3(cos(r), sin(r), 0.0,  -sin(r), cos(r), 0.0,  0.0, 0.0, 1.0);
          return ry * rx * rz;
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `float headWeight = smoothstep(uNeck.x, uNeck.y, position.y);
        mat3 headRot = headRotation(headWeight);
        vec3 objectNormal = headRot * vec3(normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = headRot * vec3(tangent.xyz);
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `vec3 transformed = headRot * (vec3(position) - uHeadPivot) + uHeadPivot;
        vHeight = (position.y - uHeightRange.x) / uHeightRange.y;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uSaturation;
        uniform vec3 uTint;
        uniform vec3 uRimColor;
        varying float vHeight;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, uSaturation) * uTint;`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `float rimMask = 1.0 - smoothstep(${TORSO_TOP.toFixed(2)} - 0.04, ${TORSO_TOP.toFixed(2)}, vHeight)
          + smoothstep(${HAIR_FROM.toFixed(2)}, ${HAIR_FROM.toFixed(2)} + 0.05, vHeight);
        float fresnel = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
        outgoingLight += uRimColor * fresnel * saturate(rimMask);
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => 'character-balanced-look';
  material.needsUpdate = true;

  mesh.userData.characterShader = rig;
  return rig;
}

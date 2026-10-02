// Prepara el modelo para web quitando el escenario de exportación.
// No transforma vértices, normales, UVs ni imágenes: la calidad del original tiene prioridad.
//
// La entrada sale de Blender (añade párpados y los morphs `blink` y `blink_surface`) a partir del original:
//   Blender -b --factory-startup -P scripts/blender/blink.py -- \
//     3d/3d-jutsu-Untitled-3D-Jutsu-2026-10-02-03-02-48.glb 3d/steven-blink.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, sparse } from '@gltf-transform/functions';

const SRC = '3d/steven-blink.glb';
const OUT = 'public/models/steven.glb';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const doc = await io.read(SRC);
const root = doc.getRoot();

root.listNodes().find((n) => n.getName() === 'ENV_backdrop')?.dispose();
root.listAnimations().forEach((a) => a.dispose());
root.listCameras().forEach((c) => c.dispose());
root.listNodes().forEach((n) => n.setExtension('KHR_lights_punctual', null));

// El morph target solo mueve los vértices de los ojos: guardado como sparse pesa ~KB en vez de ~1.5 MB.
await doc.transform(prune(), sparse({ ratio: 1 / 3 }));

await io.write(OUT, doc);
console.log('✔', OUT);

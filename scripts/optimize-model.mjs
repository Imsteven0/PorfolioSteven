// Prepara el original para web quitando el escenario de exportación.
// No transforma vértices, normales, UVs ni imágenes: la calidad del original tiene prioridad.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const SRC = '3d/3d-jutsu-Untitled-3D-Jutsu-2026-10-02-03-02-48.glb';
const OUT = 'public/models/steven.glb';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const doc = await io.read(SRC);
const root = doc.getRoot();

root.listNodes().find((n) => n.getName() === 'ENV_backdrop')?.dispose();
root.listAnimations().forEach((a) => a.dispose());
root.listCameras().forEach((c) => c.dispose());
root.listNodes().forEach((n) => n.setExtension('KHR_lights_punctual', null));

await doc.transform(prune());

await io.write(OUT, doc);
console.log('✔', OUT);

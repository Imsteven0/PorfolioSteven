"""Genera y comprueba el parpadeo: Blender -b --factory-startup --python-exit-code 1 -P scripts/blender/check-blink.py -- <original.glb> <salida.glb> [previews]."""
import os
import runpy
import sys

import bpy
import numpy as np


src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
original = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent and o.parent.name == 'HERO_character')
count = len(original.data.vertices)
coords = np.array([v.co[:] for v in original.data.vertices])
material = original.data.materials[0]
bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
image = bsdf.inputs['Base Color'].links[0].from_node.image
w, h = image.size
pixels = np.empty(w * h * 4, dtype=np.float32)
image.pixels.foreach_get(pixels)
color_sample = pixels.reshape(h, w, 4)[::32, ::32, :3].copy()

runpy.run_path(os.path.join(os.path.dirname(__file__), 'blink.py'), run_name='__main__')
obj = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent and o.parent.name == 'HERO_character')
basis = np.array([v.co[:] for v in obj.data.shape_keys.key_blocks['Basis'].data])
closed = np.array([v.co[:] for v in obj.data.shape_keys.key_blocks['blink'].data])
assert np.allclose(basis[:count], coords, atol=1e-7, rtol=0), 'se conserva la geometría original'
assert np.allclose(closed[:count], coords, atol=1e-7, rtol=0), 'el iris y la cara permanecen quietos al cerrar'
assert count < len(basis) < count + 20000, 'solo se añade la geometría de los párpados'
assert np.isfinite(closed).all(), 'todos los vértices del párpado son finitos'
assert np.linalg.norm(closed - basis, axis=1).max() > 0.01, 'los párpados realmente se cierran'
assert obj.data.uv_layers.active is not None, 'los párpados conservan la textura'
correction = np.array([v.co[:] for v in obj.data.shape_keys.key_blocks['blink_surface'].data])
assert np.allclose(correction[:count], coords, atol=1e-7, rtol=0), 'la corrección intermedia también deja el iris quieto'
assert np.linalg.norm(correction - basis, axis=1).max() > 1e-4, 'el cierre intermedio sigue la curvatura de la cara'

# Reimporta la salida: comprueba también el contrato que consumirá Three.js.
out = sys.argv[sys.argv.index('--') + 2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=out)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
assert len(meshes) == 1 and len(meshes[0].data.materials) == 1, 'un solo mesh/material para Character.tsx'
keys = meshes[0].data.shape_keys.key_blocks
for name in ('blink', 'blink_surface'):
    assert name in keys and keys[name].value == 0, f'{name} exportado con ojos abiertos'
    assert np.isfinite(np.array([v.co[:] for v in keys[name].data])).all(), f'{name} exportado sin valores inválidos'
bsdf = next(n for n in meshes[0].data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
atlas = bsdf.inputs['Base Color'].links[0].from_node.image
aw, ah = atlas.size
assert aw >= w and ah > h, 'el atlas añade espacio sin reducir la textura original'
mesh = meshes[0].data
lid_vertices = np.zeros(len(mesh.vertices), dtype=bool)
for loop in mesh.loops:
    lid_vertices[loop.vertex_index] |= mesh.uv_layers.active.data[loop.index].uv.y > h / ah
exported_basis = np.array([v.co[:] for v in keys['Basis'].data])
for name in ('blink', 'blink_surface'):
    delta = np.array([v.co[:] for v in keys[name].data]) - exported_basis
    moving = np.linalg.norm(delta, axis=1) > 1e-7
    assert moving[lid_vertices].any(), f'{name} mueve los párpados exportados'
    assert not moving[~lid_vertices].any(), f'{name} deja intactos los ojos y la cara exportados'
pixels = np.empty(aw * ah * 4, dtype=np.float32)
atlas.pixels.foreach_get(pixels)
assert np.allclose(pixels.reshape(ah, aw, 4)[:h, :w][::32, ::32, :3], color_sample, atol=1 / 255, rtol=0), 'el GLB conserva los colores de la textura original'
print('blink: ok (iris fijo, párpados móviles y textura conservada)')

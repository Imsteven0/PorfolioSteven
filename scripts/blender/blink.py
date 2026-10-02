"""
Agrega al retrato la expresión "ojos cerrados" (shape key → morph target `blink` en glTF).

Uso (Blender 4.2+ o 5.x, sin abrir la ventana):
  Blender -b --factory-startup -P scripts/blender/blink.py -- <original.glb> <salida.glb> [carpeta_previews]
Después, `npm run optimize:model` limpia esa salida y la deja en public/models.

El modelo tiene los ojos pintados, sin globo ocular. Los párpados son dos parches sobre la cara:
copian la piel y las pestañas de la textura original y se deslizan hasta cubrir el ojo. El iris
permanece quieto y redondo durante el cierre; la malla original no se deforma ni se subdivide.
`blink_surface` corrige la profundidad intermedia con peso 4*t*(1-t), donde t es el peso de `blink`.

Pasos:
1. Render frontal ortográfico de la cara y detección del contorno de cada ojo por color
   (esclerótica clara + iris/pestañas oscuros) → borde superior e inferior por columna.
2. Párpados con una textura frontal continua, añadida al atlas sin cambiar los píxeles originales.
3. Cierre con predominio del párpado superior y una subida leve del inferior.
4. Previews (abierto, medio, cerrado) y exportación a GLB con el morph target.
"""
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# Fracciones de la apertura del ojo (H = borde superior - borde inferior, por columna).
CLOSE_AT = 0.08  # dónde se juntan los párpados, desde el borde inferior
LASH_MAX = 0.2  # tope del grosor de la línea de pestañas (que se mide por columna y baja entera)
LASH_UV = 0.65  # toma el color dentro de las pestañas, sin arrastrar píxeles blancos del ojo
LID_OVERLAP = 0.03  # solapamiento al cerrar: evita rendijas entre los párpados
# Fracciones de la apertura máxima del ojo (Hmax).
LID_ABOVE = 0.5  # piel del párpado superior que se estira; las cejas quedan quietas
LID_BELOW = 0.35  # piel del párpado inferior que acompaña su subida
SMOOTH = 9  # columnas del promedio móvil sobre los bordes detectados
TAPER = 0.15  # fracción del ancho del ojo en la que el efecto se desvanece hacia los costados
EDGE_PAD = 0.1  # margen bajo el borde inferior detectado (fracción de Hmax): la esclerótica en sombra
LID_COLUMNS = 96
LID_ROWS = 16
LID_OFFSET = 0.002  # separación mínima de la cara, en unidades locales, para cubrirla sin parpadeos
SURFACE_RADIUS = 0.002  # suaviza las grietas y pequeños relieves del generador bajo el párpado

HERO = 'HERO_character'
FACE_FROM = 0.42  # misma barbilla que HEAD_FROM en Character.tsx
RENDER_SIZE = 1000


def parse_args():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) < 2:
        sys.exit('Uso: Blender -b -P blink.py -- <original.glb> <salida.glb> [carpeta_previews]')
    return args[0], args[1], args[2] if len(args) > 2 else None


def setup_scene(src):
    bpy.ops.wm.read_factory_settings(use_empty=True)  # sin el cubo de la escena por defecto
    bpy.ops.import_scene.gltf(filepath=src)
    obj = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent and o.parent.name == HERO)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'  # la textura ya trae la luz pintada
    scene.display.shading.color_type = 'TEXTURE'
    scene.view_settings.view_transform = 'Standard'
    # El original trae fondo, cámaras y luces del visor: solo interesa el personaje.
    for other in list(bpy.data.objects):
        if other.type in {'MESH', 'CAMERA', 'LIGHT'} and other != obj:
            bpy.data.objects.remove(other)
    # Workbench muestra la textura del nodo activo: debe ser la del color base, no rugosidad o normales.
    for mat in obj.data.materials:
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        link = bsdf.inputs['Base Color'].links[0]
        mat.node_tree.nodes.active = link.from_node
    return obj, scene


def vertex_coords(mesh):
    co = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get('co', co)
    return co.reshape(-1, 3)


def front_camera(obj, scene, z_lo, z_hi, size=RENDER_SIZE):
    """Cámara ortográfica cuadrada, de frente (Blender -Y = hacia el espectador), que encuadra z_lo..z_hi."""
    mw = obj.matrix_world
    lo, hi = mw @ Vector((0, 0, z_lo)), mw @ Vector((0, 0, z_hi))
    data = bpy.data.cameras.new('front')
    data.type = 'ORTHO'
    data.ortho_scale = (hi.z - lo.z) * 1.05
    cam = bpy.data.objects.new('front', data)
    scene.collection.objects.link(cam)
    cam.location = (lo + hi) / 2 + Vector((0, -5, 0))
    cam.rotation_euler = (np.pi / 2, 0, 0)
    scene.camera = cam
    scene.render.resolution_x = scene.render.resolution_y = size
    inv = mw.inverted()

    def pixel_to_local(px, py):  # py desde arriba
        world = Vector((cam.location.x + (px / size - 0.5) * data.ortho_scale, 0,
                        cam.location.z - (py / size - 0.5) * data.ortho_scale))
        local = inv @ world
        return local.x, local.z

    return pixel_to_local


def render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def detect_eyes(image_path, pixel_to_local):
    """
    Contorno de cada ojo por columna, en coordenadas locales: (x, z_top, z_bottom, grosor_pestañas).
    El grosor de las pestañas es la franja oscura bajo el borde superior, medida donde debajo hay
    esclerótica (sobre el iris no se distingue). Se usa la mediana por ojo: medido columna a columna
    es irregular y deja el borde del párpado ondulado.
    """
    img = bpy.data.images.load(image_path)
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)[::-1, :, :3]  # fila 0 = arriba
    hi, lo = px.max(-1), px.min(-1)
    sat = (hi - lo) / np.maximum(hi, 1e-4)
    sclera = (hi > 0.72) & (sat < 0.28)
    # Para el contorno se acepta también la esclerótica en sombra de las esquinas (más oscura y rosada).
    sclera_like = (hi > 0.6) & (sat < 0.38)
    dark = hi < 0.5
    eye_px = sclera_like | dark  # + iris, pupila y pestañas marrones

    pixel = pixel_to_local(0, 1)[1] - pixel_to_local(0, 0)[1]  # alto de un píxel en unidades locales (< 0)
    eyes = []
    for x0, x1 in ((int(w * 0.2), w // 2), (w // 2, int(w * 0.8))):
        # La banda de los ojos sale de la esclerótica: lo único blanco y desaturado en la cara.
        rows = np.where(sclera[int(h * 0.3):int(h * 0.75), x0:x1].sum(1) > 2)[0] + int(h * 0.3)
        if len(rows) == 0:
            sys.exit('No se encontró la esclerótica de un ojo: revisa el encuadre del render frontal.')
        pad = int((rows.max() - rows.min()) * 0.35)  # pestañas por encima y por debajo
        r0, r1 = rows.min() - pad, rows.max() + pad
        white_cols = np.where(sclera_like[rows.min():rows.max() + 1, x0:x1].sum(0) >= 2)[0] + x0
        if len(white_cols) == 0:
            sys.exit('No se encontró un contorno fiable para el ojo.')
        side_pad = max(2, int((white_cols.max() - white_cols.min()) * 0.04))
        x0, x1 = max(x0, white_cols.min() - side_pad), min(x1, white_cols.max() + side_pad + 1)
        cols = []
        for x in range(x0, x1):
            ys = np.where(eye_px[r0:r1, x])[0]
            if len(ys) < 3:
                continue
            first, last = r0 + ys.min(), r0 + ys.max()
            run = first
            while run <= last and dark[run, x]:
                run += 1
            lash = (run - first) * -pixel if run <= last and sclera_like[run, x] else np.nan
            lx, top = pixel_to_local(x + 0.5, first)
            _, bottom = pixel_to_local(x + 0.5, last + 1)
            cols.append((lx, top, bottom, lash))
        cols = np.array(cols)
        kernel = np.ones(SMOOTH) / SMOOTH
        for i in (1, 2):
            cols[:, i] = np.convolve(np.pad(cols[:, i], SMOOTH // 2, mode='edge'), kernel, mode='valid')
        measured = cols[:, 3][np.isfinite(cols[:, 3]) & (cols[:, 3] > 0)]
        if len(measured) == 0:
            sys.exit('No se encontró la línea de pestañas: revisa el render frontal.')
        cols[:, 3] = np.minimum(np.median(measured), LASH_MAX * (cols[:, 1] - cols[:, 2]))
        cols[:, 2] -= EDGE_PAD * (cols[:, 1] - cols[:, 2]).max()
        eyes.append(taper(cols))
    return eyes


def taper(cols):
    """Prolonga cada extremo con columnas que cierran la apertura a 0: sin esto el efecto se corta en seco
    en el lagrimal y la comisura, y los triángulos del borde forman un escalón."""
    width = cols[-1, 0] - cols[0, 0]
    steps = np.linspace(0, 1, 12)[1:]
    ends = []
    for end, direction in ((cols[0], -1), (cols[-1], 1)):
        mid = (end[1] + end[2]) / 2
        half = (end[1] - end[2]) / 2 * (1 - steps)
        ends.append(np.stack([end[0] + direction * steps * width * TAPER, mid + half, mid - half,
                              end[3] * (1 - steps)], 1))
    return np.concatenate([ends[0][::-1], cols, ends[1]])


def eyelid_atlas(obj, front, pixel_to_local):
    """Extiende el mapa de color con el frontal: evita interpolar entre costuras del atlas original."""
    mat = obj.data.materials[0]
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bsdf.inputs['Base Color'].links[0].from_node
    source = node.image
    tile = bpy.data.images.load(front, check_existing=True)
    w, h = source.size
    tw, th = tile.size
    aw, ah = max(w, tw), h + th
    pixels = np.zeros((ah, aw, 4), dtype=np.float32)
    pixels[:, :, 3] = 1
    original = np.empty(w * h * 4, dtype=np.float32)
    source.pixels.foreach_get(original)
    pixels[:h, :w] = original.reshape(h, w, 4)
    frontal = np.empty(tw * th * 4, dtype=np.float32)
    tile.pixels.foreach_get(frontal)
    pixels[h:, :tw] = frontal.reshape(th, tw, 4)
    atlas = bpy.data.images.new('blink_color', width=aw, height=ah, alpha=False)
    atlas.colorspace_settings.name = source.colorspace_settings.name
    atlas.pixels.foreach_set(pixels.ravel())
    atlas.pack()
    node.image = atlas
    for loop in obj.data.uv_layers.active.data:
        loop.uv = (loop.uv.x * w / aw, loop.uv.y * h / ah)
    # La web usa luz plana y ya desactiva estos mapas; su UV pertenece al atlas anterior.
    for name in ('Normal', 'Metallic', 'Roughness', 'Emission Color'):
        for link in list(bsdf.inputs[name].links):
            mat.node_tree.links.remove(link)
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Roughness'].default_value = 1
    bsdf.inputs['Emission Color'].default_value = (0, 0, 0, 1)
    x0, z_top = pixel_to_local(0, 0)
    x1, z_bottom = pixel_to_local(tw, th)

    def uv(x, z):
        return ((x - x0) / (x1 - x0) * tw / aw,
                (h + (z - z_bottom) / (z_top - z_bottom) * th) / ah)
    return uv


def add_eyelids(obj, eyes, uv_at):
    """Añade los párpados al mismo mesh/material; el ojo pintado permanece inmóvil debajo."""
    mesh = obj.data
    mesh.calc_loop_triangles()
    co = vertex_coords(mesh)
    triangles = list(mesh.loop_triangles)
    bvh = BVHTree.FromPolygons([Vector(v) for v in co], [tuple(t.vertices) for t in triangles], all_triangles=True)
    ray_y = co[:, 1].min() - 0.02

    def surface(x, z):
        # ponytail: envolvente frontal local; un rig con retopología si se necesita macro realista.
        for radius in (SURFACE_RADIUS, SURFACE_RADIUS * 2, SURFACE_RADIUS * 4):
            hits = []
            for dx, dz in ((0, 0), (radius, 0), (-radius, 0), (0, radius), (0, -radius)):
                hit, _, _, _ = bvh.ray_cast(Vector((x + dx, ray_y, z + dz)), Vector((0, 1, 0)))
                if hit is not None:
                    hits.append(hit)
            if hits:
                return Vector((x, min(p.y for p in hits), z))
        raise ValueError(f'El párpado queda fuera de la cara: {x:.4f}, {z:.4f}')

    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.active
    targets, midpoints = {}, {}
    for cols in eyes:
        h_max = (cols[:, 1] - cols[:, 2]).max()
        for upper in (True, False):
            grid, uvs = [], {}
            rows = np.concatenate((np.linspace(0, 1, LID_ROWS + 1), [1.25, 1.5, 1.75, 2])) if upper else np.linspace(0, 1, 9)
            for x in np.linspace(cols[0, 0], cols[-1, 0], LID_COLUMNS + 1):
                top, bottom, lash = (np.interp(x, cols[:, 0], cols[:, i]) for i in (1, 2, 3))
                h = max(0, top - bottom)
                seam = bottom + CLOSE_AT * h
                above, below = top + LID_ABOVE * h_max, bottom - LID_BELOW * h_max
                column = []
                for r in rows:
                    if upper:
                        z = above + min(r, 1) * (top - above) - max(r - 1, 0) * lash * LASH_UV
                        new_z = above + min(r, 1) * (seam + lash - above) - max(r - 1, 0) * lash
                        lift = min(r, 1)
                    else:
                        z = bottom + r * (below - bottom)
                        new_z = seam + LID_OVERLAP * h + r * (below - seam - LID_OVERLAP * h)
                        lift = 1 - r
                    point = surface(x, z)
                    closed = surface(x, new_z)
                    middle = surface(x, (z + new_z) / 2)
                    offset = LID_OFFSET * min(1, h / (h_max * 0.2)) * (0.3 + 0.7 * lift)
                    for position in (point, closed, middle):
                        position.y -= offset
                    # El ojo del generador tiene relieves: comprueba también ambos cuartos del recorrido.
                    # Usa el mismo correctivo, con la separación suficiente para cubrir la superficie.
                    for value in (0.25, 0.75):
                        weight = 4 * value * (1 - value)
                        linear_y = point.y + value * (closed.y - point.y)
                        current_y = linear_y + weight * (middle.y - (point.y + closed.y) / 2)
                        limit_y = surface(x, z + value * (new_z - z)).y - offset
                        middle.y -= max(0, current_y - limit_y) / weight
                    v = bm.verts.new(point)
                    targets[v], midpoints[v] = closed, middle
                    uvs[v] = uv_at(x, z)
                    column.append(v)
                grid.append(column)
            for a, b in zip(grid, grid[1:]):
                for j in range(len(rows) - 1):
                    face = bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
                    face.material_index = 0
                    face.smooth = True
                    for loop in face.loops:
                        loop[uv_layer].uv = uvs[loop.vert]
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.verts.index_update()
    closed_vertices = {v.index: point for v, point in targets.items()}
    middle_vertices = {v.index: point for v, point in midpoints.items()}
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    basis = vertex_coords(mesh)
    target = basis.copy()
    correction = basis.copy()
    for index, point in closed_vertices.items():
        target[index] = point
        correction[index] += np.array(middle_vertices[index]) - (basis[index] + target[index]) / 2
    print(f'párpados añadidos: {len(target) - len(co)} vértices; malla original intacta')
    return basis, target, correction


def main():
    src, out, preview_dir = parse_args()
    obj, scene = setup_scene(src)
    co = vertex_coords(obj.data)
    z_min, z_max = co[:, 2].min(), co[:, 2].max()
    face_lo = z_min + (z_max - z_min) * FACE_FROM

    work_dir = preview_dir or bpy.app.tempdir
    os.makedirs(work_dir, exist_ok=True)
    front = os.path.join(work_dir, 'blink_front_detect.png')
    pixel_to_local = front_camera(obj, scene, face_lo, z_max)
    render(scene, front)
    eyes = detect_eyes(front, pixel_to_local)
    for name, cols in zip(('ojo izquierdo en pantalla', 'ojo derecho en pantalla'), eyes):
        print(f'{name}: apertura máx {(cols[:, 1] - cols[:, 2]).max():.4f}')

    uv_at = eyelid_atlas(obj, front, pixel_to_local)
    basis, target, correction = add_eyelids(obj, eyes, uv_at)
    print(f'vértices que se mueven al cerrar: {(np.linalg.norm(target - basis, axis=1) > 1e-7).sum()}')

    obj.shape_key_add(name='Basis', from_mix=False)
    key = obj.shape_key_add(name='blink', from_mix=False)
    key.data.foreach_set('co', target.ravel())
    surface_key = obj.shape_key_add(name='blink_surface', from_mix=False)
    surface_key.data.foreach_set('co', correction.ravel())

    if preview_dir:
        eye_z = np.concatenate([e[:, 1:3] for e in eyes]).ravel()
        eye_x = np.concatenate([e[:, 0] for e in eyes])
        half = (eye_x.max() - eye_x.min()) / 2 * 1.05
        for prefix, (z_lo, z_hi) in (('ojos', (eye_z.mean() - half, eye_z.mean() + half)), ('cara', (face_lo, z_max))):
            front_camera(obj, scene, z_lo, z_hi)
            for value in (0, 0.25, 0.5, 0.75, 1):
                key.value = value
                surface_key.value = 4 * value * (1 - value)
                render(scene, os.path.join(preview_dir, f'{prefix}_{int(value * 100):03d}.png'))
        # La mirada web gira unos 18°: revisa también el cierre desde ese ángulo.
        cam = scene.camera
        center = cam.location + Vector((0, 5, 0))
        angle = 0.32
        cam.location = center + Vector((5 * np.sin(angle), -5 * np.cos(angle), 0))
        cam.rotation_euler = (np.pi / 2, 0, angle)
        for value in (0, 0.5, 1):
            key.value = value
            surface_key.value = 4 * value * (1 - value)
            render(scene, os.path.join(preview_dir, f'lateral_{int(value * 100):03d}.png'))
    key.value = 0
    surface_key.value = 0

    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        export_morph=True,
        export_morph_normal=False,  # con la luz casi plana no se nota y ahorra peso
        export_image_format='AUTO',  # conserva JPEG/PNG del original
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
    print(f'✔ {out}')


if __name__ == '__main__':
    main()

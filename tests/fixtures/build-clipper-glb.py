# Builds the terra3d sample model clipper.glb in Blender: a low-poly two-mast sailing ship with one
# looping clip, "Sway", that swings the flag on the main mast. Original work for scene-flow.
# Run: blender -b --python tests/fixtures/build-clipper-glb.py -- <out.glb>
# Blender is Z-up; the glTF exporter turns Blender -Y into glTF +Z, so the bow points to -Y here.
import math
import sys

import bpy

out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 61


def material(name, hex_color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    bsdf.inputs["Base Color"].default_value = [c ** 2.2 for c in rgb] + [1]
    bsdf.inputs["Roughness"].default_value = 0.8
    return mat


HULL = material("hull", "#6B4428")
DECK = material("deck", "#C99A62")
TRIM = material("trim", "#EFE6D2")
WOOD = material("wood", "#3E2A1C")
SAIL = material("sail", "#F4EEDF")
FLAG = material("flag", "#C8432B")


def mesh(name, verts, faces, mats, parent=None, location=(0, 0, 0), face_mats=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    for m in mats:
        data.materials.append(m)
    if face_mats:
        for poly, idx in zip(data.polygons, face_mats):
            poly.material_index = idx
    ob = bpy.data.objects.new(name, data)
    ob.location = location
    ob.parent = parent
    scene.collection.objects.link(ob)
    return ob


def box(name, center, size, mat, parent):
    x, y, z = (s / 2 for s in size)
    verts = [(sx * x, sy * y, sz * z) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return mesh(name, verts, faces, [mat], parent, center)


def rod(name, a, b, radius, mat, parent, sides=8):
    # Prism from point a to point b in the YZ plane, built directly so no operator context is needed.
    dy, dz = b[1] - a[1], b[2] - a[2]
    length = math.hypot(dy, dz)
    uy, uz = dy / length, dz / length
    verts = []
    for end in (a, b):
        for i in range(sides):
            ang = 2 * math.pi * i / sides
            px, pn = radius * math.cos(ang), radius * math.sin(ang)
            verts.append((end[0] + px, end[1] - uz * pn, end[2] + uy * pn))
    faces = [(i, (i + 1) % sides, sides + (i + 1) % sides, sides + i) for i in range(sides)]
    faces += [tuple(range(sides))[::-1], tuple(range(sides, 2 * sides))]
    return mesh(name, verts, faces, [mat], parent)


root = bpy.data.objects.new("Clipper", None)
scene.collection.objects.link(root)

# Hull: rings of four vertices from stern (+Y) to bow (-Y), deck at z 2.0, keel at z -0.4.
stations = [(6.0, 1.7), (3.0, 2.2), (0.0, 2.2), (-3.0, 1.9), (-5.2, 1.0)]
verts, faces, face_mats = [], [], []
for y, w in stations:
    verts += [(-w, y, 2.0), (w, y, 2.0), (w * 0.45, y, -0.4), (-w * 0.45, y, -0.4)]
bow_top, bow_low = len(verts), len(verts) + 1
verts += [(0, -6.6, 2.3), (0, -5.7, -0.4)]
for s in range(len(stations) - 1):
    a, b = s * 4, (s + 1) * 4
    faces += [(a + 1, b + 1, b + 2, a + 2), (a, a + 3, b + 3, b), (a + 3, a + 2, b + 2, b + 3)]
    face_mats += [0, 0, 0]
last = (len(stations) - 1) * 4
faces += [(last + 1, bow_top, bow_low, last + 2), (last, last + 3, bow_low, bow_top), (last + 3, last + 2, bow_low)]
face_mats += [0, 0, 0]
faces.append((0, 1, 2, 3))
face_mats.append(0)
deck = [s * 4 for s in range(len(stations))] + [bow_top] + [s * 4 + 1 for s in reversed(range(len(stations)))]
faces.append(tuple(deck))
face_mats.append(1)
mesh("Hull", verts, faces, [HULL, DECK], root, face_mats=face_mats)

# Rails, stern cabin, bowsprit.
for side in (-1, 1):
    box("Rail" + ("L" if side < 0 else "R"), (side * 2.05, 0.6, 2.2), (0.14, 9.4, 0.4), TRIM, root)
box("Cabin", (0, 4.7, 2.6), (2.6, 1.9, 1.2), TRIM, root)
box("CabinRoof", (0, 4.7, 3.28), (2.9, 2.2, 0.16), WOOD, root)
rod("Bowsprit", (0, -6.2, 2.2), (0, -8.4, 2.9), 0.1, WOOD, root)

# Masts, square sails, and a jib to the bowsprit.
for name, y, top in (("Fore", -1.8, 9.0), ("Main", 1.6, 9.8)):
    rod(name + "Mast", (0, y, 2.0), (0, y, top), 0.13, WOOD, root)
    box(name + "SailLow", (0, y - 0.15, 4.4), (3.4, 0.1, 2.2), SAIL, root)
    box(name + "SailHigh", (0, y - 0.15, 6.9), (2.7, 0.1, 1.9), SAIL, root)
    box(name + "Yard", (0, y, 5.6), (3.7, 0.14, 0.14), WOOD, root)
jib = [(x, y, z) for x in (-0.02, 0.02) for (y, z) in ((-1.95, 8.4), (-8.2, 2.9), (-1.95, 3.2))]
mesh("Jib", jib, [(0, 1, 2), (3, 5, 4)], [SAIL], root)

# Flag, pivoting on the main mast axis, swung by the Sway clip.
flag = mesh("Flag", [(0, -0.02, 0), (0.95, -0.02, 0), (0.95, -0.02, 0.55), (0, -0.02, 0.55),
                     (0, 0.02, 0), (0.95, 0.02, 0), (0.95, 0.02, 0.55), (0, 0.02, 0.55)],
            [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (1, 5, 6, 2), (0, 3, 7, 4)],
            [FLAG], root, location=(0, 1.6, 9.2))
flag.rotation_mode = "XYZ"
for frame, angle in ((1, 0.35), (31, -0.35), (61, 0.35)):
    flag.rotation_euler = (0, 0, angle)
    flag.keyframe_insert("rotation_euler", frame=frame)
flag.animation_data.action.name = "Sway"

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_apply=True,
)
print("WROTE", out)

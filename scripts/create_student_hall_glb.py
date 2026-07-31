"""Create a game-ready, single-floor student hall inspired by the supplied concept.

Run:
  blender --background --python scripts/create_student_hall_glb.py

The resulting GLB is intentionally wide and open at the front so the lobby remains
visible and fully navigable from a third-person game camera.
"""

from pathlib import Path
import math

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/maps/student-hall.glb"
BLEND_OUTPUT = ROOT / "src/assets/maps/student-hall-source.blend"
KOREAN_FONT = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            datablocks.remove(block)


def mat(name, color, roughness=0.65, metallic=0.0, emission=None):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = next(
        node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"
    )
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 2.5
    return material


def textured_mat(name, color, variation=0.035, roughness=0.68, size=128):
    """Create a subtle embedded mottled texture to avoid flat clay-like surfaces."""
    material = mat(name, color, roughness)
    image = bpy.data.images.new(name + " texture", width=size, height=size, alpha=True)
    pixels = []
    for y in range(size):
        for x in range(size):
            broad = math.sin(x * 0.19) * math.cos(y * 0.17)
            fine = math.sin((x + y) * 0.73) * 0.45 + math.cos((x - y) * 0.41) * 0.35
            value = variation * (broad * 0.55 + fine * 0.45)
            pixels.extend((
                max(0.0, min(1.0, color[0] + value)),
                max(0.0, min(1.0, color[1] + value)),
                max(0.0, min(1.0, color[2] + value)),
                1.0,
            ))
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = material.node_tree.nodes
    bsdf = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    return material


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def cube(name, location, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return assign(obj, material)


def cylinder(name, location, radius, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location
    )
    obj = bpy.context.object
    obj.name = name
    return assign(obj, material)


def sphere(name, location, scale, material, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, material)


def text_obj(name, body, location, size, material, align="CENTER", extrude=0.025):
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.bevel_depth = 0.006
    if KOREAN_FONT.exists():
        try:
            obj.data.font = bpy.data.fonts.load(str(KOREAN_FONT))
        except RuntimeError:
            pass
    assign(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def curved_bench(
    name, radius, start, end, z, material,
    height=0.82, bevel_width=0.16, half_width=0.62
):
    """Create a low-poly upholstered annular bench segment."""
    segments = 28
    inner, outer = radius - half_width, radius + half_width
    z0, z1 = z, z + height
    verts = []
    for level in (z0, z1):
        for r in (inner, outer):
            for i in range(segments + 1):
                a = start + (end - start) * i / segments
                verts.append((r * math.cos(a), r * math.sin(a) - 0.2, level))
    ring = segments + 1
    faces = []
    # bottom/top, inner/outer
    for i in range(segments):
        for base_a, base_b in ((0, ring), (2 * ring, 3 * ring)):
            faces.append((base_a + i, base_a + i + 1, base_b + i + 1, base_b + i))
        faces.append((i, i + 1, 2 * ring + i + 1, 2 * ring + i))
        faces.append((ring + i, 3 * ring + i, 3 * ring + i + 1, ring + i + 1))
    faces.extend(
        [
            (0, ring, 3 * ring, 2 * ring),
            (ring - 1, 2 * ring - 1, 4 * ring - 1, 3 * ring - 1),
        ]
    )
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    bevel = obj.modifiers.new("Upholstery rounding", "BEVEL")
    bevel.width = min(bevel_width, height * 0.35)
    bevel.segments = 3
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def leaf(name, location, rotation, scale, material):
    obj = sphere(name, location, scale, material, 12, 8)
    obj.rotation_euler = rotation
    return obj


def potted_plant(name, location, size=1.0):
    x, y, z = location
    cylinder(name + "_pot", (x, y, z + 0.32 * size), 0.34 * size, 0.62 * size, ceramic, 24)
    cylinder(name + "_soil", (x, y, z + 0.63 * size), 0.28 * size, 0.05 * size, soil, 20)
    for i in range(7):
        angle = i * 2.399
        stem_h = size * (0.55 + 0.11 * (i % 3))
        sx = x + math.cos(angle) * 0.08 * size
        sy = y + math.sin(angle) * 0.08 * size
        stem = cylinder(name + f"_stem_{i}", (sx, sy, z + 0.63 * size + stem_h / 2),
                        0.018 * size, stem_h, stem_mat, 8)
        stem.rotation_euler[0] = math.sin(angle) * 0.12
        leaf(name + f"_leaf_{i}", (sx + math.cos(angle) * 0.16 * size,
             sy + math.sin(angle) * 0.16 * size, z + (1.12 + 0.1 * (i % 3)) * size),
             (0.25 * math.sin(angle), 0.25 * math.cos(angle), angle),
             (0.10 * size, 0.28 * size, 0.055 * size), foliage)


def railing(name, x0, x1, y, z):
    rail_mat = bronze
    for x in [x0 + i * 1.45 for i in range(int((x1 - x0) / 1.45) + 1)] + [x1]:
        cylinder(name + "_post", (x, y, z + 0.58), 0.035, 1.16, rail_mat, 10)
    for dz in (0.23, 0.68, 1.12):
        rail = cylinder(name + "_rail", ((x0 + x1) / 2, y, z + dz),
                        0.035, x1 - x0, rail_mat, 10)
        rail.rotation_euler[1] = math.pi / 2


def wall_board(name, center_x, title, rows):
    board = cube(name, (center_x, 8.48, 2.35), (2.35, 0.10, 1.60), warm_white, 0.16)
    y_face = 8.36
    for index, (label, color) in enumerate(rows):
        z = 2.92 - index * 0.53
        sphere(name + f"_dot_{index}", (center_x - 1.70, y_face, z),
               (0.14, 0.045, 0.14), color)
        if index < len(rows) - 1:
            cube(name + f"_line_{index}", (center_x, y_face - 0.006, z - 0.25),
                 (1.90, 0.006, 0.008), line_gray)


reset_scene()

# Palette
floor_mat = textured_mat("Polished concrete", (0.29, 0.28, 0.26), 0.025, 0.56)
warm_white = mat("Warm ivory", (0.58, 0.52, 0.44), 0.64)
wall_mat = textured_mat("Wall plaster", (0.38, 0.36, 0.32), 0.022, 0.74)
sage = mat("Deep sage", (0.07, 0.20, 0.13), 0.56)
sage_light = mat("Sage upholstery", (0.22, 0.38, 0.17), 0.48)
rug_mat = mat("Woven sage rug", (0.16, 0.28, 0.18), 0.88)
cream = mat("Sand upholstery", (0.47, 0.38, 0.28), 0.46)
charcoal = mat("Lettering", (0.16, 0.19, 0.16), 0.72)
line_gray = mat("Board dividers", (0.58, 0.56, 0.52), 0.9)
bronze = mat("Warm metal", (0.24, 0.19, 0.13), 0.34, 0.35)
wood = mat("Natural oak", (0.27, 0.14, 0.065), 0.42)
glass = mat("Window glass", (0.37, 0.55, 0.68), 0.18, 0.05)
ceramic = mat("Planter ceramic", (0.50, 0.44, 0.36), 0.75)
soil = mat("Potting soil", (0.12, 0.075, 0.035), 1.0)
stem_mat = mat("Plant stems", (0.18, 0.27, 0.09), 0.9)
foliage = mat("Plant leaves", (0.27, 0.42, 0.11), 0.86)
foliage_dark = mat("Plant leaves dark", (0.13, 0.30, 0.08), 0.88)
blue_light = mat("Portal glow", (0.05, 0.50, 1.00), 0.22, emission=(0.05, 0.45, 1.0))
bulb = mat("Warm lights", (1.0, 0.74, 0.39), 0.2, emission=(1.0, 0.55, 0.18))

# Shell: 26 m wide x 18 m deep, single floor, open front for gameplay.
cube("Floor", (0, 0, -0.16), (13, 9, 0.16), floor_mat)
cube("BackWall", (0, 8.86, 3.20), (13, 0.14, 3.20), wall_mat)
cube("LeftWall", (-12.86, 2.1, 3.20), (0.14, 6.75, 3.20), wall_mat)
cube("RightWall", (12.86, 2.1, 3.20), (0.14, 6.75, 3.20), wall_mat)
cube("CeilingBack", (0, 6.7, 6.40), (13, 2.3, 0.14), warm_white)
cube("BackBaseboard", (0, 8.66, 0.16), (12.72, 0.08, 0.16), charcoal, 0.025)
cube("LeftBaseboard", (-12.68, 2.1, 0.16), (0.08, 6.55, 0.16), charcoal, 0.025)
cube("RightBaseboard", (12.68, 2.1, 0.16), (0.08, 6.55, 0.16), charcoal, 0.025)

# Architectural rhythm and accent columns.
for x in (-7.0, -3.9, 3.9, 7.0):
    cube("Column", (x, 8.28, 3.16), (0.38, 0.55, 3.16), warm_white, 0.12)
for x in (-4.38, 4.38):
    cube("SagePier", (x, 8.15, 3.20), (0.28, 0.62, 3.20), sage, 0.05)

# Large single-floor windows, clear of the information boards.
for x in (-11.25, -7.95, 7.95, 11.25):
    cube("LobbyWindow", (x, 8.70, 4.55), (1.25, 0.045, 1.25), glass)
    cube("WindowMullion", (x, 8.61, 4.55), (0.045, 0.075, 1.30), charcoal)
    cube("WindowMullion", (x, 8.61, 3.30), (1.29, 0.075, 0.045), charcoal)
    cube("WindowMullion", (x, 8.61, 5.80), (1.29, 0.075, 0.045), charcoal)

# Center wall signage and simple people pictogram.
text_obj("KoreanTitle", "학생회관", (0, 8.67, 4.45), 0.55, sage)
text_obj("EnglishTitle", "STUDENT HALL", (0, 8.66, 3.82), 0.27, charcoal)
for x, z, r in ((0, 5.88, 0.18), (-0.48, 5.78, 0.14), (0.48, 5.78, 0.14)):
    sphere("PeopleIconHead", (x, 8.65, z), (r, 0.055, r), sage)
for x, z, sx in ((0, 5.46, 0.35), (-0.48, 5.44, 0.25), (0.48, 5.44, 0.25)):
    sphere("PeopleIconBody", (x, 8.65, z), (sx, 0.055, 0.23), sage)

# Hanging green shelf and trailing plants.
cube("PlantShelf", (0, 8.37, 3.05), (2.8, 0.30, 0.13), wood, 0.04)
for i in range(13):
    x = -2.55 + i * 0.42
    leaf("ShelfPlant", (x, 8.05, 3.32 + 0.05 * (i % 2)),
         (0.1, 0.25, i * 0.7), (0.10, 0.28, 0.07), foliage)
    if i % 3 == 0:
        stem = cylinder("TrailingStem", (x, 8.10, 2.94), 0.012, 0.68, stem_mat, 7)
        stem.rotation_euler[0] = 0.10

# Information boards.
wall_board("OccupancyBoard", -9.75, "현재 접속 중인 사람",
           [("준서", sage_light), ("연지", sage_light), ("기국", sage_light), ("민주", sage)])
wall_board("ClubBoard", 9.75, "추천 동아리 / 모임",
           [("사진 기록 동아리", sage), ("자연 탐방 모임", sage_light), ("축제 탐방 팀", sage)])

# Central rug, segmented circular seating, cushions and planter.
cylinder("RoundRug", (0, -1.10, 0.035), 5.65, 0.07, rug_mat, 64)
for index, (a0, a1) in enumerate(
    [(-0.68, 0.68), (0.89, 2.25), (2.46, 3.82), (4.03, 5.39)]
):
    curved_bench(f"CurvedBench_{index}", 3.15, a0, a1, 0.18, cream,
                 height=0.76, bevel_width=0.02)
    for leg_index, leg_angle in enumerate((a0 + 0.24, a1 - 0.24)):
        leg = cube(
            f"CurvedBenchLeg_{index}_{leg_index}",
            (3.15 * math.cos(leg_angle), 3.15 * math.sin(leg_angle) - 0.2, 0.14),
            (0.18, 0.34, 0.14), charcoal, 0.035
        )
        leg.rotation_euler[2] = leg_angle + math.pi / 2
    mid = (a0 + a1) / 2
    x, y = 3.16 * math.cos(mid), 3.16 * math.sin(mid) - 0.2
    cushion = cube(f"SageCushion_{index}", (x, y, 1.03), (0.48, 0.36, 0.10),
                   sage_light, 0.11)
    cushion.rotation_euler[2] = mid + math.pi / 2
cylinder("CenterPlanter", (0, -0.20, 0.48), 0.78, 0.82, ceramic, 40)
cylinder("CenterSoil", (0, -0.20, 0.90), 0.64, 0.08, soil, 32)
cylinder("CenterTreeTrunk", (0, -0.20, 1.72), 0.16, 1.65, wood, 14)
for i, (radius, height, spread) in enumerate(
    ((0.58, 2.35, 0.28), (0.66, 2.72, 0.18), (0.55, 3.02, 0.08),
     (0.48, 3.30, 0.03), (0.44, 2.58, 0.58), (0.42, 2.90, 0.50),
     (0.40, 2.48, 0.78), (0.38, 2.82, 0.76), (0.34, 3.12, 0.62))):
    angle = i * 2.399
    canopy = sphere(
        f"CenterTreeCanopy_{i}",
        (math.cos(angle) * spread, -0.20 + math.sin(angle) * spread, height),
        (radius * 0.74, radius * 0.58, radius), foliage if i % 2 else foliage_dark, 18, 12
    )
    canopy.rotation_euler[2] = angle
for x in (-4.75, 4.75):
    cylinder("Ottoman", (x, -1.08, 0.40), 0.50, 0.72, cream, 28)
    cylinder("OttomanBase", (x, -1.08, 0.10), 0.34, 0.16, charcoal, 24)

# Side lounge furniture, all on the accessible ground floor.
for side in (-1, 1):
    x = side * 8.4
    cube("SideSofa", (x, 5.75, 0.52), (1.45, 0.56, 0.40), cream, 0.16)
    cube("SideSofaBack", (x, 6.23, 0.98), (1.45, 0.15, 0.58), sage_light, 0.14)
    cylinder("CafeTable", (side * 10.55, 4.15, 0.45), 0.58, 0.08, wood, 28)
    cylinder("CafeTableLeg", (side * 10.55, 4.15, 0.22), 0.08, 0.44, bronze, 12)
    cube("SideChair", (side * 10.55, 5.45, 0.48), (0.62, 0.53, 0.38), sage_light, 0.14)
    cube("SideChairBack", (side * 10.55, 5.88, 0.94), (0.62, 0.13, 0.55), cream, 0.12)
    potted_plant("SidePlant", (side * 11.75, 6.75, 0.0), 0.82)
    potted_plant("LobbyPlant", (side * 3.55, 7.45, 0.0), 0.92)

# Warm wall lights.
for x in (-2.9, 2.9):
    cube("WallSconce", (x, 8.58, 4.72), (0.10, 0.09, 0.22), bulb, 0.04)

# A subtle spawn/interaction marker from the concept art.
cylinder("PortalOuter", (0, -7.45, 0.025), 0.72, 0.035, blue_light, 48)
cylinder("PortalCutout", (0, -7.45, 0.05), 0.53, 0.045, floor_mat, 48)
cylinder("PortalInner", (0, -7.45, 0.065), 0.40, 0.025, blue_light, 48)

# Named empty marks a practical player spawn point.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, -6.65, 0.05))
bpy.context.object.name = "PlayerSpawn"

# Apply all visual modifiers so the GLB is self-contained.
for obj in list(bpy.context.scene.objects):
    if obj.type == "MESH" and obj.modifiers:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.convert(target="MESH")
        except RuntimeError:
            pass
        obj.select_set(False)

# Metadata is retained in glTF extras.
bpy.context.scene["asset_title"] = "학생회관 / Student Hall"
bpy.context.scene["asset_style"] = "wide single-floor stylized warm campus interior"
bpy.context.scene["units"] = "meters"
bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUTPUT))
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_extras=True,
)

mesh_count = sum(1 for obj in bpy.context.scene.objects if obj.type == "MESH")
vertex_count = sum(len(obj.data.vertices) for obj in bpy.context.scene.objects if obj.type == "MESH")
print(f"STUDENT_HALL_EXPORT={OUTPUT}")
print(f"MESHES={mesh_count} VERTICES={vertex_count}")

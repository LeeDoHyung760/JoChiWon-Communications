"""Generate a stylized Sejong 5-1 National Pilot Smart City GLB.

Run:
  blender --background --python scripts/create_sejong_smartcity_map.py

The result is an exhibition/digital-twin diorama rather than survey-grade GIS.
It reflects the official people-centred plan through a central water/green
network, transit-first mixed-use districts and seven smart-service landmarks.
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_GLB = ROOT / "src/assets/maps/sejong-smartcity-5-1.glb"
OUT_BLEND = ROOT / "src/assets/maps/sejong-smartcity-5-1-source.blend"
OUT_PREVIEW = ROOT / "src/assets/maps/sejong-smartcity-5-1-preview.png"
FONT = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")
RNG = random.Random(510051)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(blocks):
            blocks.remove(block)


def mat(name, color, metallic=0.0, roughness=0.55, emission=None, strength=1.0, alpha=1.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, alpha)
    material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Transmission Weight"].default_value = 0.15
        material.surface_render_method = "DITHERED"
    return material


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def collection(name):
    return bpy.data.collections.new(name)


def move_to(obj, target):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def bevel(obj, amount=0.12, segments=2):
    modifier = obj.modifiers.new("Rounded edges", "BEVEL")
    modifier.width = amount
    modifier.segments = segments
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def cube(name, location, scale, material, bevel_size=0.0, rotation=0.0, target=None):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0, 0, rotation))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    if bevel_size:
        bevel(obj, bevel_size)
    if target:
        move_to(obj, target)
    return obj


def cylinder(name, location, radius, depth, material, vertices=24, target=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    assign(obj, material)
    if target:
        move_to(obj, target)
    return obj


def sphere(name, location, radius, material, scale=(1, 1, 1), target=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    if target:
        move_to(obj, target)
    return obj


def mesh_polygon(name, points, z, material, target=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata([(x, y, z) for x, y in points], [], [list(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    if target:
        move_to(obj, target)
    return obj


def curve(name, points, z, width, material, cyclic=False, target=None):
    data = bpy.data.curves.new(name + "Curve", "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 2
    data.bevel_depth = width
    data.bevel_resolution = 1
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, (x, y) in zip(spline.points, points):
        point.co = (x, y, z, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    if target:
        move_to(obj, target)
    return obj


def ring_points(rx, ry, count=96, phase=0.0, wobble=0.0):
    return [
        (
            math.cos(i * math.tau / count + phase) * (rx + math.sin(i * 5.0) * wobble),
            math.sin(i * math.tau / count + phase) * (ry + math.cos(i * 4.0) * wobble),
        )
        for i in range(count)
    ]


def text(name, body, location, size, material, rotation=0.0, target=None):
    bpy.ops.object.text_add(location=location, rotation=(0, 0, rotation))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.035
    obj.data.bevel_depth = 0.008
    if FONT.exists():
        try:
            obj.data.font = bpy.data.fonts.load(str(FONT))
        except RuntimeError:
            pass
    assign(obj, material)
    if target:
        move_to(obj, target)
    return obj


reset()

# Materials: neutral architecture set against cool digital-twin accents.
base_dark = mat("Base / deep navy", (0.016, 0.035, 0.065), metallic=0.4, roughness=0.25)
base_edge = mat("Base / brushed silver", (0.25, 0.32, 0.39), metallic=0.8, roughness=0.22)
terrain = mat("Land / warm ivory", (0.74, 0.76, 0.69), roughness=0.9)
grass = mat("Green / park", (0.18, 0.42, 0.25), roughness=0.9)
grass_light = mat("Green / plaza", (0.34, 0.58, 0.32), roughness=0.85)
water = mat("Water / Han rivers", (0.025, 0.24, 0.42), metallic=0.2, roughness=0.17, emission=(0.02, 0.22, 0.45), strength=0.5)
road = mat("Road / autonomous mobility", (0.075, 0.10, 0.14), roughness=0.62)
walkway = mat("Walkway / stone", (0.48, 0.52, 0.52), roughness=0.8)
white = mat("Architecture / white", (0.77, 0.82, 0.83), metallic=0.08, roughness=0.38)
silver = mat("Architecture / silver", (0.28, 0.38, 0.45), metallic=0.68, roughness=0.23)
glass = mat("Architecture / blue glass", (0.035, 0.18, 0.28), metallic=0.28, roughness=0.15)
cyan = mat("Smart network / cyan", (0.01, 0.45, 0.86), metallic=0.2, roughness=0.24, emission=(0.0, 0.55, 1.0), strength=3.0)
cyan_soft = mat("Smart network / soft blue", (0.10, 0.38, 0.62), emission=(0.02, 0.3, 0.75), strength=1.1)
orange = mat("Smart mobility / orange", (0.95, 0.28, 0.05), emission=(1.0, 0.12, 0.01), strength=1.7)
yellow = mat("Smart energy / yellow", (0.93, 0.67, 0.08), emission=(1.0, 0.48, 0.01), strength=1.0)
magenta = mat("Smart health / magenta", (0.72, 0.08, 0.35), emission=(0.8, 0.02, 0.24), strength=1.1)
tree_trunk = mat("Trees / trunk", (0.19, 0.11, 0.055), roughness=1.0)
tree_leaf = mat("Trees / leaf", (0.08, 0.30, 0.13), roughness=0.95)
tree_leaf_light = mat("Trees / leaf light", (0.18, 0.48, 0.18), roughness=0.95)
solar = mat("Energy / solar panel", (0.02, 0.11, 0.22), metallic=0.45, roughness=0.18, emission=(0.01, 0.12, 0.3), strength=0.45)

COL_BASE = collection("00_Diorama_Base")
COL_WATER = collection("01_Water_Green_Network")
COL_ROADS = collection("02_Autonomous_Mobility")
COL_BUILDINGS = collection("03_Mixed_Use_Buildings")
COL_LANDMARKS = collection("04_Seven_Smart_Services")
COL_NATURE = collection("05_Urban_Nature")
COL_LABELS = collection("06_Map_Labels")
for col in (COL_BASE, COL_WATER, COL_ROADS, COL_BUILDINGS, COL_LANDMARKS, COL_NATURE, COL_LABELS):
    bpy.context.scene.collection.children.link(col)


# Exhibition plinth and a gently irregular city boundary.
cylinder("Diorama_Base", (0, 0, -1.2), 41.5, 2.0, base_dark, vertices=96, target=COL_BASE)
cylinder("Diorama_Chrome_Rim", (0, 0, -0.15), 40.7, 0.22, base_edge, vertices=96, target=COL_BASE)
cylinder("City_Terrain", (0, 0, 0.05), 39.5, 0.35, terrain, vertices=96, target=COL_BASE)
for radius, z, width in ((40.0, 0.32, 0.13), (38.7, 0.37, 0.055)):
    curve(f"Digital_Rim_{radius}", ring_points(radius, radius, 128), z, width, cyan, True, COL_BASE)

# The two river edges and the central blue-green heart.
river_north = [(-39, 26), (-31, 24), (-23, 26), (-15, 25), (-7, 27), (2, 26), (12, 28), (22, 27), (31, 25), (39, 27),
               (39, 39), (-39, 39)]
river_east = [(27, -39), (26, -30), (29, -22), (27, -14), (30, -5), (28, 4), (31, 13), (29, 22), (32, 31), (39, 39), (39, -39)]
mesh_polygon("Miho_River", river_north, 0.27, water, COL_WATER)
mesh_polygon("Geum_River", river_east, 0.28, water, COL_WATER)
lake = [(x + math.sin(i * 0.72) * 1.3, y + math.cos(i * 0.51) * 0.9)
        for i, (x, y) in enumerate(ring_points(12.0, 8.0, 80, phase=0.15))]
mesh_polygon("Central_Blue_Green_Lake", lake, 0.31, water, COL_WATER)
curve("Lake_Promenade", ring_points(13.1, 9.1, 96, phase=0.15), 0.43, 0.38, walkway, True, COL_WATER)
curve("Lake_Smart_Light", ring_points(12.55, 8.55, 96, phase=0.15), 0.49, 0.075, cyan, True, COL_WATER)

# Transit-first ring and radial links.
outer_ring = ring_points(29.5, 23.7, 104)
inner_ring = ring_points(18.7, 14.6, 96, phase=0.08)
curve("BRT_Autonomous_Ring", outer_ring, 0.48, 1.05, road, True, COL_ROADS)
curve("BRT_Cyan_Guide", outer_ring, 0.56, 0.075, cyan, True, COL_ROADS)
curve("Inner_Mobility_Loop", inner_ring, 0.48, 0.72, road, True, COL_ROADS)
curve("Inner_Mobility_Guide", inner_ring, 0.56, 0.055, cyan_soft, True, COL_ROADS)
radials = [
    [(-34, -16), (-21, -9), (-13, -5)],
    [(-34, 10), (-23, 7), (-14, 4)],
    [(-20, 27), (-13, 17), (-8, 9)],
    [(4, 27), (3, 18), (2, 9)],
    [(28, 18), (20, 11), (12, 5)],
    [(29, -10), (20, -7), (12, -4)],
    [(8, -29), (7, -19), (5, -9)],
    [(-18, -28), (-12, -18), (-7, -9)],
]
for i, pts in enumerate(radials):
    curve(f"Radial_Road_{i+1:02d}", pts, 0.49, 0.62, road, False, COL_ROADS)
    curve(f"Radial_Data_Line_{i+1:02d}", pts, 0.565, 0.045, cyan_soft, False, COL_ROADS)

# Four signature bridges.
bridges = [
    ("Bridge_North", (0, 24.9, 1.15), (6.5, 0.8, 0.22), 0),
    ("Bridge_East", (28.0, 8.0, 1.15), (0.8, 5.2, 0.22), 0),
    ("Bridge_Lake_West", (-12.2, 0.0, 0.9), (3.0, 0.55, 0.18), 0),
    ("Bridge_Lake_East", (12.2, 0.0, 0.9), (3.0, 0.55, 0.18), 0),
]
for name, loc, scale, rot in bridges:
    cube(name, loc, scale, white, 0.14, rot, COL_ROADS)
    cube(name + "_Light", (loc[0], loc[1], loc[2] + 0.25), (scale[0] * 0.95, scale[1] * 0.95, 0.035), cyan, 0.03, rot, COL_ROADS)


def building(name, x, y, sx, sy, height, accent=cyan_soft, rotation=0.0, landmark=False):
    group = COL_LANDMARKS if landmark else COL_BUILDINGS
    cube(name, (x, y, 0.55 + height / 2), (sx, sy, height / 2), white, min(sx, sy) * 0.12, rotation, group)
    cube(name + "_Glass", (x, y, 0.72 + height * 0.52), (sx * 0.83, sy * 0.83, height * 0.39), glass, min(sx, sy) * 0.08, rotation, group)
    cube(name + "_Roof", (x, y, 0.62 + height), (sx * 0.88, sy * 0.88, 0.08), accent, 0.06, rotation, group)
    floors = max(1, min(5, int(height / 2.2)))
    for floor in range(1, floors):
        z = 0.55 + height * floor / floors
        cube(f"{name}_FloorLight_{floor}", (x, y, z), (sx * 0.88, sy * 0.88, 0.025), accent, 0, rotation, group)


# Mixed-use neighbourhood clusters. The lake and major roads remain legible.
districts = [
    ("NorthWest", -24, 16, 11, 7, 0.05),
    ("West", -27, -2, 9, 10, -0.08),
    ("SouthWest", -22, -18, 12, 7, 0.12),
    ("South", -4, -23, 12, 6, -0.05),
    ("SouthEast", 17, -20, 9, 7, 0.08),
    ("East", 22, -4, 7, 10, -0.08),
    ("NorthEast", 18, 17, 8, 6, 0.05),
]
for district_name, cx, cy, spread_x, spread_y, base_rot in districts:
    for i in range(14):
        x = cx + RNG.uniform(-spread_x, spread_x)
        y = cy + RNG.uniform(-spread_y, spread_y)
        if x * x + (y * 1.25) ** 2 < 15.5 ** 2:
            continue
        if x > 25 or y > 23:
            continue
        sx = RNG.uniform(0.65, 1.35)
        sy = RNG.uniform(0.65, 1.45)
        height = RNG.uniform(2.2, 7.2) * (1.15 if district_name in ("NorthWest", "NorthEast") else 1)
        building(f"{district_name}_MixedUse_{i+1:02d}", x, y, sx, sy, height, cyan_soft, base_rot + RNG.uniform(-0.16, 0.16))


# Central AI/Digital Twin civic hub: three connected towers around the lake.
for i, (x, y, h, r) in enumerate(((-4.0, 1.0, 11.0, -0.08), (0.0, 2.0, 15.0, 0.03), (4.2, 0.6, 12.5, 0.09))):
    building(f"AI_DigitalTwin_Tower_{i+1}", x, y, 1.25, 1.45, h, cyan, r, True)
curve("AI_Hub_Skybridge", [(-4, 1), (0, 2), (4.2, 0.6)], 7.0, 0.13, cyan, False, COL_LANDMARKS)
cylinder("AI_Hologram_Plaza", (0, -2.7, 0.55), 2.8, 0.25, silver, vertices=48, target=COL_LANDMARKS)
for radius, z in ((1.9, 1.2), (1.3, 2.1), (0.7, 3.0)):
    curve(f"AI_Hologram_Ring_{radius}", ring_points(radius, radius * 0.45, 48), z, 0.055, cyan, True, COL_LANDMARKS)

# Seven service landmarks, each named for programmatic discovery.
service_specs = [
    ("Mobility_Hub", "모빌리티", (-30, 4), orange),
    ("Smart_Healthcare", "헬스케어", (-18, -25), magenta),
    ("Education_Jobs", "교육·일자리", (5, -27), cyan),
    ("Energy_Environment", "에너지·환경", (24, -17), yellow),
    ("Governance", "거버넌스", (26, 14), cyan),
    ("Culture_Shopping", "문화·쇼핑", (7, 20), orange),
    ("Living_Safety", "생활·안전", (-21, 19), cyan),
]
for idx, (name, label, (x, y), accent) in enumerate(service_specs, 1):
    cylinder(name + "_Plaza", (x, y, 0.55), 3.2, 0.22, grass_light, vertices=32, target=COL_LANDMARKS)
    building(name + "_Center", x, y, 1.8, 1.45, 5.5 + (idx % 3), accent, 0.18 * idx, True)
    curve(name + "_Beacon", ring_points(2.35, 2.35, 48), 0.72, 0.07, accent, True, COL_LANDMARKS)
    cylinder(name + "_DataMast", (x, y, 7.4 + (idx % 3)), 0.09, 2.6, accent, vertices=12, target=COL_LANDMARKS)
    sphere(name + "_DataNode", (x, y, 8.8 + (idx % 3)), 0.32, accent, target=COL_LANDMARKS)

# Energy park: solar array and two compact turbines.
for row in range(3):
    for col in range(5):
        panel = cube(
            f"SolarPanel_{row}_{col}",
            (18.7 + col * 1.15, -23.0 + row * 1.25, 0.9),
            (0.48, 0.34, 0.055),
            solar,
            0.025,
            target=COL_LANDMARKS,
        )
        panel.rotation_euler.x = math.radians(18)
for index, (x, y) in enumerate(((27, -23), (30, -19))):
    cylinder(f"WindTurbine_{index}_Mast", (x, y, 2.7), 0.12, 4.7, white, vertices=16, target=COL_LANDMARKS)
    sphere(f"WindTurbine_{index}_Hub", (x, y, 5.1), 0.25, silver, target=COL_LANDMARKS)
    for blade in range(3):
        angle = blade * math.tau / 3
        cube(
            f"WindTurbine_{index}_Blade_{blade}",
            (x + math.cos(angle) * 0.85, y, 5.1 + math.sin(angle) * 0.85),
            (0.75, 0.07, 0.10),
            white,
            0.06,
            -angle,
            COL_LANDMARKS,
        ).rotation_euler.x = math.pi / 2

# Autonomous bus and pods give scale and make the mobility story immediate.
cube("BRT_Bus", (-30.0, -5.0, 1.05), (1.7, 0.7, 0.62), white, 0.28, -0.18, COL_LANDMARKS)
cube("BRT_Bus_Windows", (-30.0, -5.0, 1.35), (1.35, 0.71, 0.25), glass, 0.12, -0.18, COL_LANDMARKS)
for i, (x, y, rot) in enumerate(((-17, 13, 0.2), (15, 12, -0.3), (16, -12, 0.4), (-12, -15, -0.2))):
    cube(f"Autonomous_Pod_{i+1}", (x, y, 0.92), (0.58, 0.34, 0.28), white, 0.22, rot, COL_LANDMARKS)
    cube(f"Autonomous_Pod_{i+1}_Glass", (x, y, 1.13), (0.38, 0.27, 0.16), glass, 0.14, rot, COL_LANDMARKS)


def tree(name, x, y, scale=1.0):
    cylinder(name + "_Trunk", (x, y, 0.78 * scale), 0.10 * scale, 1.0 * scale, tree_trunk, vertices=8, target=COL_NATURE)
    sphere(name + "_Canopy", (x, y, 1.55 * scale), 0.62 * scale, tree_leaf_light if RNG.random() > 0.5 else tree_leaf,
           scale=(1, 1, 1.25), target=COL_NATURE)


# Park belts along the lake, river edge and city rim.
tree_positions = []
for i in range(54):
    angle = i * math.tau / 54 + RNG.uniform(-0.05, 0.05)
    radius_x = RNG.uniform(14.0, 16.2)
    radius_y = RNG.uniform(10.2, 12.4)
    tree_positions.append((math.cos(angle) * radius_x, math.sin(angle) * radius_y))
for i in range(72):
    angle = i * math.tau / 72 + RNG.uniform(-0.04, 0.04)
    radius = RNG.uniform(34.0, 37.2)
    tree_positions.append((math.cos(angle) * radius, math.sin(angle) * radius))
for i, (x, y) in enumerate(tree_positions):
    tree(f"SmartForest_{i+1:03d}", x, y, RNG.uniform(0.72, 1.15))

# Sensor beacons around the districts.
for i, angle in enumerate([j * math.tau / 16 for j in range(16)]):
    x, y = math.cos(angle) * 25.5, math.sin(angle) * 20.5
    cylinder(f"IoT_Sensor_{i+1:02d}", (x, y, 1.35), 0.055, 1.7, silver, vertices=10, target=COL_LANDMARKS)
    sphere(f"IoT_Node_{i+1:02d}", (x, y, 2.25), 0.16, cyan, target=COL_LANDMARKS)

# Title and legend are modeled geometry, so they survive in any GLB viewer.
text("Map_Title", "세종 스마트시티 국가시범도시", (0, -37.2, 0.56), 2.0, white, target=COL_LABELS)
text("Map_Subtitle", "5-1 생활권 · AI 기반 미래도시", (0, -34.5, 0.56), 0.92, cyan, target=COL_LABELS)
for idx, (_, label, (x, y), accent) in enumerate(service_specs, 1):
    text(f"Service_Label_{idx}", label, (x, y - 3.55, 0.66), 0.66, accent, target=COL_LABELS)

# Metadata makes the asset self-describing for game/editor integrations.
bpy.context.scene["asset_title_ko"] = "세종 스마트시티 국가시범도시 5-1 생활권"
bpy.context.scene["asset_title_en"] = "Sejong 5-1 National Pilot Smart City"
bpy.context.scene["asset_type"] = "stylized exhibition map / digital twin diorama"
bpy.context.scene["coordinate_note"] = "Blender Z-up; glTF export converts to Y-up"
bpy.context.scene["is_survey_grade"] = False
bpy.context.scene["smart_services"] = "mobility, healthcare, education/jobs, energy/environment, governance, culture/shopping, living/safety"

# Lighting and camera for the delivered preview.
world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.032, 0.052, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55

bpy.ops.object.light_add(type="AREA", location=(-22, -20, 42))
key = bpy.context.object
key.name = "Preview_Key"
key.data.energy = 2600
key.data.shape = "DISK"
key.data.size = 24
bpy.ops.object.light_add(type="AREA", location=(25, 18, 30))
fill = bpy.context.object
fill.name = "Preview_Fill"
fill.data.energy = 1900
fill.data.color = (0.18, 0.48, 1.0)
fill.data.size = 20
bpy.ops.object.light_add(type="AREA", location=(0, 5, 46))
top = bpy.context.object
top.name = "Preview_Top"
top.data.energy = 1700
top.data.size = 30
bpy.ops.object.light_add(type="SUN", location=(0, 0, 35))
sun = bpy.context.object
sun.name = "Preview_Sun"
sun.rotation_euler = (math.radians(24), math.radians(-18), math.radians(-28))
sun.data.energy = 2.2
sun.data.angle = math.radians(18)

bpy.ops.object.camera_add(location=(62, -72, 76))
camera = bpy.context.object
camera.name = "Preview_Camera"
direction = Vector((0, 0, 1.0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 98
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT_PREVIEW)
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"

OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB),
    export_format="GLB",
    export_apply=True,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
    export_yup=True,
    export_materials="EXPORT",
)
bpy.ops.render.render(write_still=True)

print(f"CREATED {OUT_GLB}")
print(f"SOURCE  {OUT_BLEND}")
print(f"PREVIEW {OUT_PREVIEW}")

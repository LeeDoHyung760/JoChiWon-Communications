"""Create a bright Sejong Smart City exhibition hall as a self-contained GLB.

Run:
  blender --background --python scripts/create_sejong_smartcity_exhibition.py

The design follows the supplied visual direction: white architectural panels,
dark slatted ceiling, blue edge lighting, a central future-map wall, interactive
kiosks and themed AI/mobility/energy exhibits.
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_GLB = ROOT / "src/assets/maps/sejong-smartcity-exhibition.glb"
OUT_BLEND = ROOT / "src/assets/maps/sejong-smartcity-exhibition-source.blend"
OUT_PREVIEW = ROOT / "src/assets/maps/sejong-smartcity-exhibition-preview.png"
FONT = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")
RNG = random.Random(51454)


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


def material(name, color, roughness=0.52, metallic=0.0, emission=None, strength=1.0, alpha=1.0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, alpha)
    item.use_nodes = True
    bsdf = next(node for node in item.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Transmission Weight"].default_value = 0.22
        item.surface_render_method = "DITHERED"
    return item


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def bevel(obj, width=0.12, segments=3):
    mod = obj.modifiers.new("Soft exhibition edges", "BEVEL")
    mod.width = width
    mod.segments = segments
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def cube(name, location, scale, mat, bevel_width=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel_width:
        bevel(obj, bevel_width)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=32, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return assign(obj, mat)


def sphere(name, location, radius, mat, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, mat)


def curve(name, points, bevel_depth, mat, cyclic=False):
    data = bpy.data.curves.new(name + "Curve", "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = bevel_depth
    data.bevel_resolution = 2
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coords in zip(spline.points, points):
        point.co = (*coords, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return assign(obj, mat)


def text_mesh(name, body, location, size, mat, align="CENTER", rotation=(math.pi / 2, 0, 0), extrude=0.018):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.bevel_depth = 0.004
    if FONT.exists():
        try:
            obj.data.font = bpy.data.fonts.load(str(FONT))
        except RuntimeError:
            pass
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


reset()

# Calm white architecture with navy screens and restrained cyan light.
white = material("Architectural white", (0.84, 0.84, 0.82), roughness=0.42)
white_bright = material("Display white", (0.97, 0.96, 0.92), roughness=0.34)
wall_grey = material("Warm wall grey", (0.67, 0.68, 0.67), roughness=0.62)
floor = material("Polished concrete", (0.39, 0.40, 0.40), roughness=0.28, metallic=0.08)
ceiling = material("Black ceiling", (0.015, 0.02, 0.027), roughness=0.34)
trim = material("Dark trim", (0.045, 0.055, 0.068), roughness=0.26, metallic=0.45)
screen = material("Deep blue display", (0.012, 0.055, 0.105), roughness=0.18, metallic=0.22, emission=(0.005, 0.04, 0.11), strength=0.8)
screen_mid = material("Screen blue panel", (0.02, 0.14, 0.26), roughness=0.24, emission=(0.01, 0.13, 0.34), strength=0.8)
cyan = material("Cyan information light", (0.06, 0.48, 1.0), roughness=0.18, emission=(0.02, 0.48, 1.0), strength=4.5)
cyan_soft = material("Soft cove light", (0.50, 0.72, 1.0), roughness=0.25, emission=(0.20, 0.55, 1.0), strength=2.2)
warm_light = material("Warm cove light", (1.0, 0.88, 0.72), roughness=0.25, emission=(1.0, 0.72, 0.45), strength=2.4)
black_text = material("Graphite lettering", (0.015, 0.018, 0.023), roughness=0.65)
blue_text = material("Blue lettering", (0.05, 0.20, 0.42), roughness=0.45, emission=(0.02, 0.15, 0.45), strength=0.45)
glass = material("Exterior glass", (0.10, 0.24, 0.31), roughness=0.12, metallic=0.12, alpha=0.32)
green = material("Interior plants", (0.06, 0.24, 0.10), roughness=0.95)
green_light = material("Interior plants light", (0.16, 0.41, 0.16), roughness=0.92)
wood = material("Planter wood", (0.25, 0.16, 0.10), roughness=0.72)

# Main room shell, open at the camera side.
cube("Exhibition_Floor", (0, 2, -0.25), (15.5, 17.5, 0.25), floor, 0.08)
cube("Back_Wall", (0, 18.4, 5.2), (15.5, 0.32, 5.4), wall_grey, 0.08)
cube("Left_Wall", (-15.2, 2.0, 5.2), (0.32, 16.7, 5.4), white, 0.08)
cube("Right_Wall", (15.2, 2.0, 5.2), (0.32, 16.7, 5.4), white, 0.08)

# Perimeter light coves and floor navigation lines.
cube("Left_Cove_Light", (-14.75, 2.2, 9.72), (0.045, 16.2, 0.055), warm_light)
cube("Right_Cove_Light", (14.75, 2.2, 9.72), (0.045, 16.2, 0.055), warm_light)
cube("Back_Cove_Light", (0, 17.97, 9.7), (14.7, 0.04, 0.055), warm_light)
curve(
    "Central_Floor_Guide",
    [(-4.6, -12.5, 0.035), (-4.6, -3.3, 0.035), (-3.7, -2.4, 0.035),
     (3.7, -2.4, 0.035), (4.6, -3.3, 0.035), (4.6, -12.5, 0.035)],
    0.055,
    white_bright,
)
for x in (-11.5, 11.5):
    curve(
        f"Side_Floor_Guide_{x}",
        [(x, -10.5, 0.035), (x, 9.5, 0.035), (x * 0.78, 12.5, 0.035)],
        0.045,
        cyan_soft,
    )

# Back wall title and skyline trace.
cube("Main_Title_Backdrop", (0, 17.98, 8.38), (8.45, 0.04, 1.52), trim, 0.14)
text_mesh("Main_Title", "세종 스마트시티 국가시범도시", (0, 17.88, 8.85), 0.86, white_bright)
text_mesh("Main_Subtitle", "AI와 데이터로 연결된 미래도시 · 세종 5-1 생활권", (0, 17.87, 7.95), 0.34, white_bright)
skyline = [(-7.8, 17.96, 7.0), (-7.2, 17.96, 7.0), (-7.2, 17.96, 7.5), (-6.8, 17.96, 7.5),
           (-6.8, 17.96, 6.9), (-6.1, 17.96, 6.9), (-6.1, 17.96, 7.9), (-5.6, 17.96, 7.9),
           (-5.6, 17.96, 7.1), (-4.8, 17.96, 7.1), (-4.8, 17.96, 8.2), (-4.25, 17.96, 8.2),
           (-4.25, 17.96, 7.2), (-3.6, 17.96, 7.2), (-3.6, 17.96, 8.55), (-3.1, 17.96, 8.55),
           (-3.1, 17.96, 7.0), (-2.2, 17.96, 7.0), (-2.2, 17.96, 8.0), (-1.7, 17.96, 8.0),
           (-1.7, 17.96, 7.0), (-0.7, 17.96, 7.0), (-0.7, 17.96, 8.7), (-0.15, 17.96, 8.7),
           (-0.15, 17.96, 7.0), (0.6, 17.96, 7.0), (0.6, 17.96, 8.25), (1.2, 17.96, 8.25),
           (1.2, 17.96, 7.0), (2.1, 17.96, 7.0), (2.1, 17.96, 8.6), (2.65, 17.96, 8.6),
           (2.65, 17.96, 7.15), (3.6, 17.96, 7.15), (3.6, 17.96, 7.9), (4.2, 17.96, 7.9),
           (4.2, 17.96, 7.0), (5.1, 17.96, 7.0), (5.1, 17.96, 8.15), (5.7, 17.96, 8.15),
           (5.7, 17.96, 7.0), (6.5, 17.96, 7.0), (6.5, 17.96, 7.65), (7.2, 17.96, 7.65),
           (7.2, 17.96, 7.0), (7.8, 17.96, 7.0)]
skyline_trace = curve("Back_Wall_Skyline", skyline, 0.026, cyan)
skyline_trace.location.y = -0.16


def framed_panel(name, x, y, z, width, height, title, subtitle):
    cube(name + "_Outer", (x, y, z), (width / 2, 0.15, height / 2), white_bright, 0.32)
    cube(name + "_Glow", (x, y - 0.17, z), (width * 0.48, 0.035, height * 0.47), cyan_soft, 0.26)
    cube(name + "_Inner", (x, y - 0.22, z), (width * 0.455, 0.035, height * 0.42), screen, 0.22)
    text_mesh(name + "_Title", title, (x - width * 0.38, y - 0.28, z + height * 0.31), 0.42, black_text, "LEFT")
    text_mesh(name + "_Subtitle", subtitle, (x - width * 0.38, y - 0.28, z + height * 0.20), 0.17, black_text, "LEFT")
    return (x, y - 0.28, z)


def screen_ui(name, center, width, height, color=cyan):
    x, y, z = center
    # Abstract future-city dashboard built entirely from GLB geometry.
    curve(name + "_MapRing", [
        (x + math.cos(i * math.tau / 48) * width * 0.25, y - 0.03, z + math.sin(i * math.tau / 48) * height * 0.22)
        for i in range(48)
    ], 0.018, color, True)
    for i in range(7):
        bx = x - width * 0.24 + i * width * 0.08
        h = height * (0.10 + (i % 4) * 0.055)
        cube(name + f"_Tower_{i}", (bx, y - 0.05, z - height * 0.10 + h / 2), (width * 0.023, 0.018, h / 2), color, 0.01)
    for row in range(3):
        cube(name + f"_DataBar_{row}", (x + width * 0.26, y - 0.05, z + height * (0.12 - row * 0.09)),
             (width * (0.11 - row * 0.015), 0.018, 0.018), color, 0.008)
    for i in range(4):
        sphere(name + f"_Node_{i}", (x - width * 0.18 + i * width * 0.12, y - 0.06, z + height * 0.19), 0.055, color)


# Central wall presentation: bright frame, five themes and a miniature city.
cube("Future_Map_Frame", (0, 17.82, 4.55), (8.1, 0.26, 2.55), white_bright, 0.38)
cube("Future_Map_Frame_Glow", (0, 17.50, 4.55), (7.83, 0.045, 2.28), cyan_soft, 0.30)
cube("Future_Map_Surface", (0, 17.42, 4.55), (7.50, 0.045, 2.02), white, 0.24)
themes = [("AI 도시", -5.7), ("자율주행", -2.85), ("스마트 에너지", 0), ("AI 행정", 2.85), ("스마트 헬스케어", 5.7)]
for index, (label, x) in enumerate(themes):
    text_mesh(f"Map_Theme_{index}", label, (x, 17.32, 6.0), 0.22, black_text)
    cylinder(f"Map_Theme_Pin_{index}", (x, 17.28, 5.55), 0.045, 0.05, cyan, 16, rotation=(math.pi / 2, 0, 0))
    curve(f"Map_Theme_Line_{index}", [(x, 17.28, 5.53), (x, 17.28, 3.35)], 0.012, cyan_soft)
for i in range(34):
    x = -6.9 + i * 0.42
    height = 0.35 + (math.sin(i * 1.7) + 1) * 0.33 + (0.5 if i in (9, 18, 25) else 0)
    cube(f"Wall_City_{i:02d}", (x, 17.25, 3.22 + height / 2), (0.13, 0.055, height / 2), white_bright, 0.035)
    if i % 3 == 0:
        cube(f"Wall_City_Roof_{i:02d}", (x, 17.18, 3.25 + height), (0.10, 0.018, 0.018), cyan, 0.008)
curve("Wall_City_River", [(-7.1, 17.17, 3.05), (-4, 17.15, 3.35), (-1.5, 17.16, 3.02),
                           (1, 17.16, 3.28), (4, 17.15, 2.98), (7.1, 17.17, 3.20)], 0.075, cyan_soft)

# Left AI exhibit.
cube("AI_Exhibit_Wall", (-11.2, 9.4, 5.25), (3.45, 0.28, 4.5), white_bright, 0.28)
text_mesh("AI_Title", "AI 도시", (-13.7, 9.05, 8.6), 0.62, black_text, "LEFT")
text_mesh("AI_Subtitle", "데이터가 연결된 지능형 도시", (-13.7, 9.04, 7.92), 0.25, black_text, "LEFT")
for index, label in enumerate(("AI 기반 도시 운영", "스마트 안전", "실시간 교통 분석", "예측 행정 서비스")):
    z = 7.05 - index * 0.73
    cube(f"AI_Icon_{index}", (-13.35, 9.00, z), (0.25, 0.035, 0.25), white, 0.08)
    curve(f"AI_Icon_Ring_{index}", [
        (-13.35 + math.cos(i * math.tau / 20) * 0.13, 8.95, z + math.sin(i * math.tau / 20) * 0.13)
        for i in range(20)
    ], 0.018, blue_text, True)
    text_mesh(f"AI_Label_{index}", label, (-12.85, 8.96, z), 0.20, black_text, "LEFT")
cube("AI_Screen_Frame", (-10.2, 8.96, 5.45), (1.55, 0.14, 2.1), trim, 0.18)
cube("AI_Screen", (-10.2, 8.78, 5.45), (1.42, 0.025, 1.97), screen, 0.12)
screen_ui("AI_Screen_UI", (-10.2, 8.70, 5.45), 2.6, 3.5)

# Right mobility and energy exhibits.
for name, title, subtitle, x, accent_kind in (
    ("Mobility", "자율주행 (BRT, UAM)", "더 빠르고 안전한 미래 교통", 8.6, "mobility"),
    ("Energy", "스마트 에너지", "지속가능한 에너지 자립 도시", 12.4, "energy"),
):
    cube(name + "_Wall", (x, 9.4, 5.3), (1.75, 0.28, 4.5), white_bright, 0.26)
    text_mesh(name + "_Title", title, (x - 1.35, 9.04, 8.5), 0.34, black_text, "LEFT")
    text_mesh(name + "_Subtitle", subtitle, (x - 1.35, 9.03, 8.0), 0.18, black_text, "LEFT")
    cube(name + "_Screen_Frame", (x, 8.96, 5.9), (1.42, 0.13, 1.65), trim, 0.15)
    cube(name + "_Screen", (x, 8.79, 5.9), (1.32, 0.025, 1.55), screen, 0.11)
    screen_ui(name + "_UI", (x, 8.71, 5.9), 2.35, 2.6, cyan)
    if accent_kind == "mobility":
        cube("Screen_BRT", (x - 0.35, 8.65, 5.35), (0.60, 0.02, 0.24), white_bright, 0.10)
        for rotor in (-0.45, 0.45):
            curve(f"UAM_Rotor_{rotor}", [(x + rotor - 0.25, 8.64, 6.45), (x + rotor + 0.25, 8.64, 6.45)], 0.025, cyan)
        sphere("UAM_Body", (x, 8.63, 6.35), 0.14, cyan, (1.6, 0.25, 0.65))
    else:
        for col in range(4):
            panel = cube(f"Energy_Panel_{col}", (x - 0.72 + col * 0.48, 8.65, 5.25), (0.18, 0.02, 0.30), cyan, 0.025)
            panel.rotation_euler.z = -0.08
        for offset in (-0.55, 0.55):
            curve(f"Energy_Turbine_{offset}", [(x + offset, 8.64, 6.1), (x + offset, 8.64, 6.85)], 0.025, white_bright)
            sphere(f"Energy_Hub_{offset}", (x + offset, 8.63, 6.85), 0.07, cyan)
    for row in range(3):
        sphere(name + f"_Bullet_{row}", (x - 1.18, 8.92, 3.55 - row * 0.45), 0.055, blue_text)
        cube(name + f"_BulletLine_{row}", (x + 0.1, 8.93, 3.55 - row * 0.45), (0.85, 0.02, 0.025), blue_text, 0.01)


def kiosk(name, x, y, rotation_z=0.0):
    cube(name + "_Base", (x, y, 0.32), (0.82, 0.66, 0.32), white_bright, 0.12, (0, 0, rotation_z))
    cube(name + "_Stem", (x, y, 1.25), (0.42, 0.40, 0.78), white_bright, 0.10, (0, 0, rotation_z))
    screen_obj = cube(name + "_Screen", (x, y - 0.18, 2.18), (0.86, 0.10, 0.62), screen, 0.13, (math.radians(22), 0, rotation_z))
    cube(name + "_ScreenGlow", (x, y - 0.30, 2.20), (0.68, 0.025, 0.42), screen_mid, 0.08, (math.radians(22), 0, rotation_z))
    for i in range(3):
        cube(name + f"_UI_{i}", (x - 0.35 + i * 0.34, y - 0.34, 2.16), (0.09, 0.015, 0.09), cyan, 0.03, (math.radians(22), 0, rotation_z))
    return screen_obj


kiosk("AI_Kiosk", -10.4, 3.5)
kiosk("Mobility_Kiosk", 8.7, 3.6)
kiosk("Energy_Kiosk", 12.2, 2.4)

# Central interactive future-map table.
cube("Central_Table_Platform", (0, -3.4, 0.18), (4.6, 3.6, 0.18), floor, 0.36)
curve("Central_Table_Platform_Light", [
    (-4.45, -6.7, 0.39), (-4.45, -0.1, 0.39), (4.45, -0.1, 0.39), (4.45, -6.7, 0.39)
], 0.055, white_bright)
cube("Central_Table_Base", (0, -3.5, 0.72), (2.35, 1.35, 0.52), white, 0.28)
cube("Central_Table_Frame", (0, -3.72, 2.55), (3.45, 1.85, 0.16), white_bright, 0.24, (math.radians(48), 0, 0))
cube("Central_Table_Screen", (0, -3.88, 2.72), (3.17, 1.58, 0.035), screen, 0.18, (math.radians(48), 0, 0))
text_mesh("Table_Title", "세종 스마트시티 미래지도", (0, -5.10, 3.64), 0.29, white_bright, rotation=(math.radians(48), 0, 0))
for radius in (0.7, 1.3, 1.9):
    points = []
    for i in range(48):
        angle = i * math.tau / 48
        # Keep map UI slightly above and parallel to the tilted screen.
        local_y = math.sin(angle) * radius * 0.50
        local_z = math.cos(angle) * radius * 0.28
        points.append((math.cos(angle) * radius, -4.00 + local_y, 2.82 + local_z))
    curve(f"Table_Map_Ring_{radius}", points, 0.025, cyan, True)
for x, z in ((-2.1, 2.85), (-1.2, 3.05), (0, 2.9), (1.1, 3.12), (2.05, 2.86)):
    sphere(f"Table_Map_Node_{x}", (x, -4.05, z), 0.09, cyan)

# Right foreground information counter.
cube("Future_Counter", (11.6, -5.6, 1.25), (3.5, 1.0, 1.25), white_bright, 0.18)
text_mesh("Future_Counter_Title", "세종의 미래", (9.05, -6.65, 1.75), 0.42, black_text, "LEFT")
text_mesh("Future_Counter_Copy", "시민과 함께 만드는\n스마트 행복 도시", (9.05, -6.67, 1.02), 0.24, black_text, "LEFT")
counter_skyline = [(10.9, -6.66, 0.2), (10.9, -6.66, 1.0), (11.4, -6.66, 1.0), (11.4, -6.66, 1.65),
                   (11.9, -6.66, 1.65), (11.9, -6.66, 0.55), (12.5, -6.66, 0.55), (12.5, -6.66, 1.35),
                   (13.0, -6.66, 1.35), (13.0, -6.66, 0.35), (13.7, -6.66, 0.35)]
curve("Future_Counter_Skyline", counter_skyline, 0.035, cyan)
cube("Future_Counter_Underlight", (11.6, -6.62, 0.15), (3.3, 0.035, 0.045), cyan)

# Lounge on the left and restrained indoor planting.
cube("Lounge_Sofa_Left", (-12.0, -6.8, 0.55), (2.2, 1.15, 0.55), wall_grey, 0.36)
cube("Lounge_Sofa_Back", (-12.0, -5.85, 1.15), (2.2, 0.25, 0.75), wall_grey, 0.30)
cube("Lounge_Ottoman", (-8.8, -6.7, 0.45), (1.2, 1.0, 0.45), trim, 0.30)
cube("Planter", (-14.0, -9.8, 0.58), (1.0, 1.0, 0.58), wood, 0.20)
for i in range(9):
    angle = i * math.tau / 9
    stem_x = -14 + math.cos(angle) * RNG.uniform(0.15, 0.7)
    stem_y = -9.8 + math.sin(angle) * RNG.uniform(0.15, 0.7)
    cylinder(f"Plant_Stem_{i}", (stem_x, stem_y, 1.35), 0.035, 1.2, green, 8)
    sphere(f"Plant_Leaf_{i}", (stem_x, stem_y, 1.95 + RNG.uniform(-0.25, 0.35)), 0.33, green_light if i % 2 else green, (0.7, 1.3, 0.5))

# Left glazed opening to suggest the city beyond.
cube("Left_Window_Frame", (-14.82, -5.0, 5.2), (0.09, 3.3, 4.35), trim, 0.05)
cube("Left_Window_Glass", (-14.70, -5.0, 5.2), (0.035, 3.05, 4.10), glass)
for y in (-7.8, -5.0, -2.2):
    cube(f"Window_Mullion_{y}", (-14.62, y, 5.2), (0.08, 0.055, 4.1), trim)

# Scene metadata for downstream viewers/editors.
scene = bpy.context.scene
scene["asset_title_ko"] = "세종 스마트시티 국가시범도시 전시관"
scene["asset_title_en"] = "Sejong National Pilot Smart City Exhibition"
scene["reference_style"] = "bright white smart-city experience center"
scene["interaction_surfaces"] = "Central_Table_Screen, AI_Kiosk_Screen, Mobility_Kiosk_Screen, Energy_Kiosk_Screen"
scene["is_survey_grade"] = False

# Preview lighting: soft museum ambience with cool display accents.
world = scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.045, 0.062, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.52

for index, (location, energy, size, color) in enumerate((
    ((0, -2, 9.6), 1250, 8.0, (1.0, 0.93, 0.84)),
    ((-9, 5, 8.8), 900, 6.0, (0.82, 0.90, 1.0)),
    ((9, 5, 8.8), 900, 6.0, (0.82, 0.90, 1.0)),
    ((0, 14, 9.0), 1100, 7.0, (0.88, 0.93, 1.0)),
)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = f"Museum_Area_{index+1}"
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color

bpy.ops.object.light_add(type="SUN", location=(0, -4, 12))
sun = bpy.context.object
sun.name = "Museum_Sun"
sun.rotation_euler = (math.radians(18), math.radians(-12), math.radians(-18))
sun.data.energy = 1.3
sun.data.angle = math.radians(30)

bpy.ops.object.camera_add(location=(0, -19.5, 5.4))
camera = bpy.context.object
camera.name = "Preview_Camera"
target = Vector((0, 5.0, 4.85))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 24
scene.camera = camera

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1200
scene.render.resolution_y = 820
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT_PREVIEW)
scene.render.film_transparent = False
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

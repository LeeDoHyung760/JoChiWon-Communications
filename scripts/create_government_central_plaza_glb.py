"""Create the Government Complex Sejong central AI recommendation plaza.

Run:
  blender --background --python scripts/create_government_central_plaza_glb.py

The model is an open-front, game-ready cutaway atrium based on the supplied
central-plaza concept. It contains an elliptical glass shell, hologram stage,
recommendation displays, lounges, kiosks and indoor landscaping.
"""

from pathlib import Path
import math

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/maps/government-central-plaza.glb"
SOURCE = ROOT / "src/assets/maps/government-central-plaza-source.blend"
KOREAN_FONT = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            datablocks.remove(block)


def material(name, color, roughness=0.55, metallic=0.0, emission=None, alpha=1.0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, alpha)
    item.use_nodes = True
    bsdf = next(node for node in item.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 3.2
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Transmission Weight"].default_value = 0.12
        item.surface_render_method = "DITHERED"
        item.use_transparency_overlap = False
    return item


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def apply_bevel(obj, width=0.08, segments=2):
    bevel = obj.modifiers.new("Soft architectural edges", "BEVEL")
    bevel.width = width
    bevel.segments = segments
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def cube(name, location, scale, mat, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel:
        apply_bevel(obj, bevel)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=48, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location
    )
    obj = bpy.context.object
    obj.name = name
    # Primitive cylinders are Z-aligned; authoring coordinates in this file are
    # Y-up, so align the cylinder to the authoring height axis.
    obj.rotation_euler.x = -math.pi / 2
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, mat)


def sphere(name, location, radius, mat, segments=32, rings=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, mat)


def torus(name, location, major_radius, minor_radius, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (
        rotation[0] - math.pi / 2,
        rotation[1],
        rotation[2],
    )
    return assign(obj, mat)


def text_mesh(name, body, location, size, mat, rotation=(math.pi / 2, 0, 0)):
    # Text faces the open front of the Y-up authoring space. The third input
    # component is retained as a useful left/right wall yaw.
    bpy.ops.object.text_add(
        location=location,
        rotation=(0, math.pi + rotation[2], 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.025
    obj.data.bevel_depth = 0.006
    if KOREAN_FONT.exists():
        try:
            obj.data.font = bpy.data.fonts.load(str(KOREAN_FONT))
        except RuntimeError:
            pass
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def ellipse_disk(name, z, rx, rz, depth, mat, vertices=96):
    obj = cylinder(name, (0, z, 0), 1.0, depth, mat, vertices)
    obj.scale.x = rx
    obj.scale.y = rz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def perimeter_segment(name, angle, radius_x, radius_z, width, height, depth, mat, y):
    x = math.cos(angle) * radius_x
    z = math.sin(angle) * radius_z
    tangent = math.atan2(radius_z * math.cos(angle), -radius_x * math.sin(angle))
    return cube(
        name,
        (x, y, z),
        (width / 2, height / 2, depth / 2),
        mat,
        0.035,
        rotation=(0, -tangent, 0),
    )


def curved_shell():
    """Continuous oval glass facade with an open entrance at the camera side."""
    count = 64
    step = math.tau / count
    for index in range(count):
        angle = index * step
        next_angle = angle + step
        # Keep only a clean central walk-in opening. The narrower cut prevents
        # the left facade from looking unfinished while remaining doorless.
        front_delta = (angle + math.pi / 2 + math.pi) % math.tau - math.pi
        if abs(front_delta) < math.radians(14):
            continue
        x = math.cos(angle) * 13.25
        z = math.sin(angle) * 9.7
        nx = math.cos(next_angle) * 13.25
        nz = math.sin(next_angle) * 9.7
        width = math.hypot(nx - x, nz - z) * 1.025
        tangent = math.atan2(nz - z, nx - x)
        cube(
            f"GlassFacade_{index:02d}",
            (x, 3.25, z),
            (width / 2, 3.05, 0.055),
            glass,
            rotation=(0, -tangent, 0),
        )
        cube(
            f"FacadeBase_{index:02d}",
            (x, 0.32, z),
            (width / 2, 0.32, 0.14),
            navy,
            0.025,
            rotation=(0, -tangent, 0),
        )
        cube(
            f"FacadeTop_{index:02d}",
            (x, 6.28, z),
            (width / 2, 0.26, 0.17),
            stone,
            0.04,
            rotation=(0, -tangent, 0),
        )
        for y in (0.72, 3.25, 5.82):
            cube(
                f"FacadeRail_{index:02d}_{int(y*10)}",
                (x, y, z),
                (width / 2, 0.035, 0.04),
                steel,
                rotation=(0, -tangent, 0),
            )
        cube(
            f"FacadeMullion_{index:02d}",
            (x, 3.25, z),
            (0.035, 2.95, 0.075),
            navy,
            rotation=(0, -tangent, 0),
        )

    # Broad white ribbon above the glass, echoing Government Complex Sejong.
    for index in range(32):
        angle = math.radians(10 + index * (160 / 31))
        x = math.cos(angle) * 13.05
        z = math.sin(angle) * 9.5
        next_angle = angle + math.radians(160 / 31)
        nx = math.cos(next_angle) * 13.05
        nz = math.sin(next_angle) * 9.5
        width = math.hypot(nx - x, nz - z) * 1.025
        tangent = math.atan2(nz - z, nx - x)
        cube(
            f"UpperRibbon_{index:02d}",
            (x, 6.62, z),
            (width / 2, 0.46, 0.27),
            stone,
            0.055,
            rotation=(0, -tangent, 0),
        )


def screen_panel(name, position, size, title, accent, rows=3):
    x, y, z = position
    width, height = size
    frame = cube(name + "_Frame", (x, y, z), (width / 2, 0.16, height / 2), charcoal, 0.16)
    frame.rotation_euler.x = math.pi / 2
    surface = cube(name + "_Surface", (x, y - 0.17, z), (width * 0.46, 0.035, height * 0.43), screen, 0.11)
    surface.rotation_euler.x = math.pi / 2
    for row in range(rows):
        cube(
            name + f"_Data_{row}",
            (x - width * 0.16, y - 0.22, z + height * (0.19 - row * 0.18)),
            (width * (0.18 + row * 0.035), 0.02, 0.035),
            accent,
            0.015,
            rotation=(math.pi / 2, 0, 0),
        )
        for bar in range(5):
            bar_h = 0.12 + 0.08 * ((bar + row * 2) % 4)
            cube(
                name + f"_Chart_{row}_{bar}",
                (
                    x + width * (0.02 + bar * 0.07),
                    y - 0.22,
                    z - height * 0.18 + bar_h / 2 + row * 0.07,
                ),
                (0.035, 0.02, bar_h / 2),
                accent,
                0.01,
                rotation=(math.pi / 2, 0, 0),
            )
    text_mesh(name + "_Title", title, (x, y - 0.24, z + height * 0.61), 0.42, letter)


def lounge(name, center, rotation=0.0):
    x, z = center
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    # Six compact seats arranged around two tables.
    for index, offset in enumerate((-2.15, -1.25, 1.25, 2.15)):
        seat = cube(
            f"{name}_Seat_{index}",
            (x + offset * math.cos(rotation), 0.43, z + offset * math.sin(rotation)),
            (0.52, 0.43, 0.62),
            upholstery,
            0.18,
            rotation=(0, 0, rotation),
        )
        for collection in list(seat.users_collection):
            collection.objects.unlink(seat)
        group.objects.link(seat)
    for index, offset in enumerate((-0.62, 0.72)):
        tx = x + offset * math.cos(rotation + math.pi / 2)
        tz = z + offset * math.sin(rotation + math.pi / 2)
        cylinder(f"{name}_Table_{index}", (tx, 0.42, tz), 0.42, 0.08, wood, 32)


def plant(name, location, scale=1.0):
    x, y, z = location
    cylinder(name + "_Pot", (x, y + 0.34 * scale, z), 0.34 * scale, 0.68 * scale, ceramic, 24)
    cylinder(name + "_Soil", (x, y + 0.69 * scale, z), 0.28 * scale, 0.05 * scale, soil, 20)
    for index in range(8):
        angle = index * 2.399
        radius = (0.12 + 0.05 * (index % 3)) * scale
        sphere(
            name + f"_Leaf_{index}",
            (
                x + math.cos(angle) * radius,
                y + (0.98 + 0.12 * (index % 4)) * scale,
                z + math.sin(angle) * radius,
            ),
            0.23 * scale,
            foliage if index % 2 else foliage_dark,
            14,
            8,
            (0.55, 1.55, 0.72),
        )


def kiosk(name, x, z, rotation=0.0):
    """Detailed executive touch kiosk with a web-ready blank display."""
    cos_r, sin_r = math.cos(rotation), math.sin(rotation)

    def local(lx, ly, lz):
        return (
            x + lx * cos_r + lz * sin_r,
            ly,
            z - lx * sin_r + lz * cos_r,
        )

    def part(suffix, position, scale, mat, bevel=0.0, tilt=0.0):
        return cube(
            name + "_" + suffix,
            local(*position),
            scale,
            mat,
            bevel,
            rotation=(tilt, rotation, 0),
        )

    # Layered plinth with a thin floating shadow gap.
    part("Base_Foot", (0, 0.07, 0), (0.72, 0.07, 0.48), charcoal, 0.07)
    part("Base_Metal", (0, 0.17, 0), (0.66, 0.035, 0.43), kiosk_metal, 0.025)
    part("Base_Shadow", (0, 0.23, 0), (0.56, 0.025, 0.35), navy, 0.02)

    # Slim cabinet, recessed front panel and refined edge rails.
    part("Body", (0, 0.79, -0.015), (0.48, 0.56, 0.31), kiosk_metal, 0.09)
    part("Body_Front_Recess", (0, 0.76, 0.315), (0.38, 0.39, 0.018), navy, 0.035)
    part("Body_Access_Panel", (0, 0.70, 0.337), (0.32, 0.27, 0.012), kiosk_dark_metal, 0.025)
    part("Body_Access_Trim", (0, 0.70, 0.353), (0.285, 0.235, 0.008), kiosk_metal, 0.018)
    for side in (-1, 1):
        part(
            f"Body_Side_Rail_{'L' if side < 0 else 'R'}",
            (side * 0.435, 0.79, 0.285),
            (0.022, 0.47, 0.022),
            brass,
            0.01,
        )
    part("Body_Service_Light", (0, 1.16, 0.344), (0.20, 0.022, 0.014), cyan, 0.01)

    # Structural neck and hinge below the angled display.
    part("Neck", (0, 1.29, -0.04), (0.31, 0.18, 0.24), kiosk_dark_metal, 0.055)
    part("Hinge", (0, 1.42, 0.05), (0.43, 0.075, 0.11), charcoal, 0.05, tilt=math.radians(-18))

    # Large 16:10 touch display, tilted like the photographic reference.
    tilt = math.radians(-22)
    part("Display_Housing", (0, 1.73, 0.20), (0.79, 0.55, 0.095), kiosk_metal, 0.12, tilt)
    part("Display_Shadow_Bezel", (0, 1.73, 0.303), (0.705, 0.475, 0.032), charcoal, 0.085, tilt)
    display = part("WebUI_Surface", (0, 1.73, 0.342), (0.655, 0.425, 0.014), kiosk_screen, 0.065, tilt)
    display["web_ui_surface"] = name
    display["aspect_ratio"] = "16:10"
    display["keep_clear"] = True

    # Hardware detail below the display: NFC/contactless reader and status LED.
    part("Reader_Bay", (0, 1.285, 0.363), (0.18, 0.075, 0.025), charcoal, 0.025, tilt)
    part("NFC_Reader", (0, 1.285, 0.393), (0.105, 0.046, 0.012), kiosk_metal, 0.018, tilt)
    part("NFC_Core", (0, 1.285, 0.410), (0.045, 0.022, 0.008), navy, 0.01, tilt)
    part("Status_LED", (0.18, 1.285, 0.405), (0.026, 0.018, 0.008), cyan, 0.008, tilt)
    for index in range(4):
        part(
            f"Speaker_{index + 1}",
            (-0.27 + index * 0.055, 1.285, 0.402),
            (0.012, 0.012, 0.007),
            charcoal,
            0.006,
            tilt,
        )

    # Rear ventilation and discreet manufacturer plate.
    for index in range(5):
        part(
            f"Vent_{index + 1}",
            (-0.22 + index * 0.11, 0.53, -0.335),
            (0.035, 0.012, 0.009),
            charcoal,
            0.006,
        )
    part("Manufacturer_Plate", (0, 0.34, 0.35), (0.14, 0.045, 0.012), brass, 0.012)


reset_scene()

# Materials are intentionally restrained so the scene fits the existing game.
floor = material("Honed administrative limestone", (0.69, 0.69, 0.67), 0.48)
floor_dark = material("Dark stone floor inlay", (0.12, 0.17, 0.20), 0.35, 0.05)
ivory = material("Government warm ivory", (0.78, 0.77, 0.73), 0.48)
stone = material("Architectural limestone", (0.72, 0.72, 0.69), 0.42)
navy = material("Administrative deep navy", (0.025, 0.075, 0.105), 0.28, 0.18)
charcoal = material("Graphite frame", (0.045, 0.065, 0.075), 0.28, 0.28)
steel = material("Brushed stainless steel", (0.34, 0.39, 0.40), 0.24, 0.68)
brass = material("Brushed champagne brass", (0.43, 0.31, 0.14), 0.28, 0.62)
wood = material("Executive smoked walnut", (0.20, 0.115, 0.065), 0.42)
kiosk_metal = material("Kiosk satin aluminum", (0.47, 0.48, 0.47), 0.24, 0.62)
kiosk_dark_metal = material("Kiosk recessed metal", (0.12, 0.15, 0.16), 0.34, 0.42)
kiosk_screen = material("Kiosk blank display glass", (0.008, 0.045, 0.075), 0.10, 0.08)
screen = material("Display black", (0.015, 0.055, 0.075), 0.22, 0.1)
glass = material("Low iron civic glass", (0.31, 0.58, 0.68), 0.08, 0.12, alpha=0.24)
cyan = material("AI cyan", (0.08, 0.69, 1.0), 0.18, 0.12, emission=(0.02, 0.45, 1.0))
blue = material("Data blue", (0.05, 0.36, 0.72), 0.24, emission=(0.02, 0.22, 0.65))
violet = material("Recommendation violet", (0.45, 0.22, 0.88), 0.25, emission=(0.30, 0.10, 0.75))
letter = material("White lettering", (0.88, 0.95, 0.97), 0.3, emission=(0.55, 0.75, 0.85))
upholstery = material("Executive lounge upholstery", (0.51, 0.53, 0.52), 0.58)
ceramic = material("Stone planter", (0.53, 0.54, 0.52), 0.62)
soil = material("Potting soil", (0.09, 0.055, 0.025), 1.0)
foliage = material("Plant leaves", (0.18, 0.44, 0.19), 0.82)
foliage_dark = material("Plant leaves dark", (0.06, 0.25, 0.11), 0.86)

# Elliptical walkable shell.
ellipse_disk("Ground_GovernmentCentralPlaza", -0.16, 14.0, 10.5, 0.32, floor)
ellipse_disk("Floor_Inlay", 0.012, 12.8, 9.25, 0.025, floor_dark)
ellipse_disk("Main_Floor", 0.035, 12.25, 8.7, 0.045, floor)
curved_shell()

# Central AI platform.
ellipse_disk("AI_Platform_Base", 0.18, 3.15, 3.15, 0.34, charcoal)
ellipse_disk("AI_Platform_Stone", 0.39, 2.78, 2.78, 0.12, ivory)
for radius in (2.35, 1.82, 1.28, 0.58):
    torus("AI_Platform_Ring", (0, 0.49, -0.25), radius, 0.045, cyan, rotation=(0, 0, 0))
cylinder("AI_Beam", (0, 1.35, -0.25), 0.14, 1.8, cyan, 20)
sphere("AI_Globe", (0, 2.35, -0.25), 1.22, glass, 36, 20)
for angle in (-0.72, -0.36, 0, 0.36, 0.72):
    ring = torus("AI_Globe_Latitude", (0, 2.35, -0.25), math.cos(angle) * 1.18, 0.018, cyan)
    ring.scale.z = max(0.12, math.cos(angle))
    ring.location.y += math.sin(angle) * 1.10
for angle in (0, math.pi / 3, 2 * math.pi / 3):
    torus(
        "AI_Globe_Longitude",
        (0, 2.35, -0.25),
        1.18,
        0.018,
        cyan,
        rotation=(math.pi / 2, angle, 0),
    )
for index in range(7):
    angle = index * math.tau / 7
    sphere(
        f"AI_Orbit_Node_{index}",
        (math.cos(angle) * 1.58, 2.35 + math.sin(angle * 2) * 0.25, -0.25 + math.sin(angle) * 1.58),
        0.065,
        cyan,
        12,
        8,
    )
text_mesh("Platform_Label", "AI 세종 추천센터", (0, 0.64, -3.12), 0.34, letter, rotation=(math.pi / 2, 0, 0))

# Three clean executive wall panels. Their faces are intentionally empty so
# React/Three web UI can be mounted without fighting baked screens or labels.
center_panel = cube("WebUI_Surface_Center", (0, 3.05, 8.35), (5.4, 3.05, 0.28), wood, 0.16)
left_panel = cube("WebUI_Surface_Left", (-8.1, 2.75, 4.35), (3.65, 2.75, 0.36), wood, 0.16, rotation=(0, -0.36, 0))
right_panel = cube("WebUI_Surface_Right", (8.1, 2.75, 4.35), (3.65, 2.75, 0.36), wood, 0.16, rotation=(0, 0.36, 0))
for panel, slot in (
    (center_panel, "center"),
    (left_panel, "left"),
    (right_panel, "right"),
):
    panel["web_ui_surface"] = slot
    panel["keep_clear"] = True

# Restrained brass datum lines define the administrative architecture while
# leaving every mounting face completely clear for web content.
cube("Center_Panel_Brass_Top", (0, 6.02, 8.02), (5.08, 0.035, 0.025), brass, 0.01)
cube("Center_Panel_Brass_Base", (0, 0.10, 8.02), (5.08, 0.035, 0.025), brass, 0.01)

# Lounge clusters, kiosks and planting.
lounge("Lounge_Left", (-6.6, -4.25), -0.12)
lounge("Lounge_Right", (6.6, -4.25), 0.12)
for name, x, z, rotation in (
    ("Kiosk_Left", -10.5, 0.1, math.pi / 2),
    ("Kiosk_Right", 10.5, 0.1, -math.pi / 2),
    ("Kiosk_Rear_Left", -5.2, 6.35, math.pi),
    ("Kiosk_Rear_Right", 5.2, 6.35, math.pi),
):
    kiosk(name, x, z, rotation)
for index, (x, z, scale) in enumerate(
    (
        (-11.4, -4.9, 1.0),
        (-9.8, 5.9, 1.1),
        (-5.9, 7.0, 0.9),
        (5.9, 7.0, 0.9),
        (9.8, 5.9, 1.1),
        (11.4, -4.9, 1.0),
        (-5.0, -7.8, 0.95),
        (5.0, -7.8, 0.95),
    )
):
    plant(f"Plaza_Plant_{index}", (x, 0, z), scale)

# Subtle navigation markers consumed by future interactions.
for name, x, z, color in (
    ("Marker_DataAnalysis", -8.0, 2.2, blue),
    ("Marker_AIRecommendation", 0, 0.0, cyan),
    ("Marker_CourseBrowse", 8.0, 2.2, violet),
    ("Marker_SaveCourse", 0, -7.7, cyan),
):
    ellipse = cylinder(name, (x, 0.075, z), 0.62, 0.05, color, 32)
    ellipse["interaction"] = name.replace("Marker_", "")

# Export metadata and world origin.
root_marker = bpy.data.objects.new("GovernmentCentralPlaza_Metadata", None)
root_marker["map_name"] = "정부청사 중앙광장"
root_marker["experience"] = "AI 세종 추천센터"
root_marker["spawn_x"] = 0.0
root_marker["spawn_y"] = 0.0
root_marker["spawn_z"] = -7.2
bpy.context.collection.objects.link(root_marker)

# Geometry above is authored in the web renderer's Y-up coordinate system.
# Rotate the complete asset into Blender's Z-up space before the glTF exporter
# performs its standard Blender-to-glTF axis conversion.
asset_root = bpy.data.objects.new("GovernmentCentralPlaza_Root", None)
bpy.context.collection.objects.link(asset_root)
for scene_object in list(bpy.context.scene.objects):
    if scene_object is asset_root:
        continue
    scene_object.parent = asset_root
asset_root.rotation_euler.x = math.pi / 2

# Apply modifiers to ensure identical appearance in the web GLTF loader.
bpy.context.view_layer.objects.active = None
for obj in list(bpy.context.scene.objects):
    if obj.type != "MESH":
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            pass
    obj.select_set(False)

# Remove unused data and export.
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.context.scene["asset"] = "Government Complex Sejong Central Plaza"
bpy.context.scene["units"] = "meters"
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    export_apply=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_yup=True,
)
print(f"Created {OUTPUT}")

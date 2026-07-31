"""Build a stylized panoramic Sejong observatory and export it as GLB.

Run with:
  blender --background --python scripts/create_observatory.py
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_GLB = ROOT / "src/assets/maps/observatory-interior.glb"
OUT_BLEND = ROOT / "src/assets/maps/observatory-source.blend"
PREVIEW = ROOT / "src/assets/maps/observatory-preview.png"
PANORAMA = ROOT / "src/assets/maps/observatory-sejong-panorama.png"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.55,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    transmission: float = 0.0,
    alpha_blend: bool = False,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = color[3]
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha_blend:
        mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
    return mat


MATS: dict[str, bpy.types.Material] = {}


def mat(name: str) -> bpy.types.Material:
    return MATS[name]


def assign(obj: bpy.types.Object, material_value: bpy.types.Material) -> bpy.types.Object:
    obj.data.materials.append(material_value)
    return obj


def bevel(obj: bpy.types.Object, width: float = 0.08, segments: int = 2) -> bpy.types.Object:
    mod = obj.modifiers.new("Soft edges", "BEVEL")
    mod.width = width
    mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material_name: str,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel_width: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat(material_name))
    if bevel_width:
        bevel(obj, bevel_width)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material_name: str,
    *,
    vertices: int = 64,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel_width: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat(material_name))
    if bevel_width:
        bevel(obj, bevel_width)
    return obj


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material_name: str,
    *,
    segments: int = 20,
    rings: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat(material_name))
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material_name: str,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    major_segments: int = 96,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat(material_name))
    return obj


def annulus(
    name: str,
    location: tuple[float, float, float],
    outer_radius: float,
    inner_radius: float,
    depth: float,
    material_name: str,
    *,
    segments: int = 128,
) -> bpy.types.Object:
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    half = depth / 2
    for z in (-half, half):
        for radius in (outer_radius, inner_radius):
            for i in range(segments):
                angle = math.tau * i / segments
                verts.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for i in range(segments):
        n = (i + 1) % segments
        faces.extend(
            [
                (outer_top + i, outer_top + n, inner_top + n, inner_top + i),
                (outer_bottom + n, outer_bottom + i, inner_bottom + i, inner_bottom + n),
                (outer_bottom + i, outer_bottom + n, outer_top + n, outer_top + i),
                (inner_bottom + n, inner_bottom + i, inner_top + i, inner_top + n),
            ]
        )
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    assign(obj, mat(material_name))
    return obj


def text_mesh(
    name: str,
    body: str,
    location: tuple[float, float, float],
    size: float,
    material_name: str,
    *,
    extrude: float = 0.018,
    align: str = "CENTER",
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.bevel_depth = 0.006
    font_candidates = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            try:
                obj.data.font = bpy.data.fonts.load(candidate)
                break
            except RuntimeError:
                pass
    assign(obj, mat(material_name))
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def create_materials() -> None:
    MATS.update(
        {
            "white": material("Architectural ivory", (0.72, 0.76, 0.78, 1), metallic=0.08, roughness=0.24),
            "ceiling": material("Warm ceiling", (0.78, 0.79, 0.76, 1), metallic=0.04, roughness=0.32),
            "frame": material("Graphite window frame", (0.025, 0.045, 0.055, 1), metallic=0.9, roughness=0.18),
            "steel": material("Brushed steel", (0.25, 0.31, 0.34, 1), metallic=0.92, roughness=0.2),
            "brass": material("Satin brass", (0.58, 0.36, 0.10, 1), metallic=0.88, roughness=0.22),
            "dark": material("Equipment dark", (0.035, 0.065, 0.085, 1), metallic=0.38, roughness=0.25),
            "blue": material("Sejong blue", (0.01, 0.28, 0.53, 1), metallic=0.12, roughness=0.3),
            "cyan": material(
                "Skyline glow",
                (0.03, 0.52, 0.88, 1),
                roughness=0.25,
                emission=(0.02, 0.33, 0.72, 1),
                emission_strength=2.5,
            ),
            "light": material(
                "Warm LED",
                (1.0, 0.72, 0.35, 1),
                roughness=0.25,
                emission=(1.0, 0.46, 0.12, 1),
                emission_strength=7.0,
            ),
            "glass": material(
                "Panoramic glass",
                (0.22, 0.53, 0.68, 0.18),
                roughness=0.05,
                metallic=0.08,
                transmission=0.58,
                alpha_blend=True,
            ),
            "screen": material(
                "Photo screen",
                (0.015, 0.18, 0.35, 1),
                roughness=0.22,
                emission=(0.01, 0.16, 0.38, 1),
                emission_strength=1.1,
            ),
            "floor": material("Polished graphite stone", (0.30, 0.35, 0.39, 1), metallic=0.3, roughness=0.16),
            "floor_light": material("Pearl stone inlay", (0.68, 0.72, 0.73, 1), metallic=0.16, roughness=0.2),
            "wood": material("Smoked walnut", (0.30, 0.15, 0.065, 1), roughness=0.3),
            "upholstery": material("Deep blue upholstery", (0.08, 0.19, 0.25, 1), roughness=0.58),
            "leaf": material("Plant leaves", (0.06, 0.29, 0.12, 1), roughness=0.72),
            "leaf2": material("Plant highlights", (0.13, 0.44, 0.19, 1), roughness=0.68),
            "soil": material("Pot soil", (0.12, 0.07, 0.035, 1), roughness=0.95),
        }
    )


def create_panorama_material() -> None:
    """Create an unlit scenic material so the city stays crisp behind the glass."""
    image = bpy.data.images.load(str(PANORAMA), check_existing=True)
    panorama = bpy.data.materials.new("Sejong city panorama")
    panorama.use_nodes = True
    nodes = panorama.node_tree.nodes
    links = panorama.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    texture.extension = "EXTEND"
    emission.inputs["Strength"].default_value = 0.72
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    panorama.use_backface_culling = False
    MATS["panorama"] = panorama


def add_city_panorama() -> None:
    """Wrap the generated Sejong view around the outside of the curved glazing."""
    radius = 15.08
    start = math.radians(-113)
    end = math.radians(113)
    segments = 96
    z_bottom = 0.35
    z_top = 17.62
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []

    for i in range(segments + 1):
        a = start + (end - start) * i / segments
        x, y = radius * math.sin(a), radius * math.cos(a)
        vertices.extend(((x, y, z_bottom), (x, y, z_top)))
    for i in range(segments):
        lower = i * 2
        faces.append((lower, lower + 2, lower + 3, lower + 1))

    mesh = bpy.data.meshes.new("Sejong_city_panorama_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Backdrop_Sejong_city_panorama", mesh)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat("panorama"))

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        segment_index = polygon.index
        u0 = segment_index / segments
        u1 = (segment_index + 1) / segments
        for loop_index, uv in zip(
            polygon.loop_indices,
            ((u0, 0.0), (u1, 0.0), (u1, 1.0), (u0, 1.0)),
        ):
            uv_layer.data[loop_index].uv = uv


def add_floor_and_ceiling() -> None:
    floor = cylinder("COLLISION_FLOOR", (0, 0, 0.0), 15.0, 0.35, "floor", vertices=128)
    floor["walkable"] = True
    cylinder("Floor_inner_inlay", (0, 0.5, 0.19), 6.0, 0.025, "floor_light", vertices=96)
    cylinder("Floor_logo_disc", (0, 0.5, 0.235), 2.6, 0.025, "blue", vertices=64)
    # Simple civic flower emblem.
    for i in range(8):
        a = math.tau * i / 8
        sphere(
            f"Floor_logo_petal_{i+1:02d}",
            (math.cos(a) * 0.72, 0.5 + math.sin(a) * 0.72, 0.28),
            (0.25, 0.53, 0.025),
            "white",
            segments=16,
            rings=8,
        )

    annulus("Roof_annulus", (0, 0, 18.05), 15.25, 12.25, 0.38, "ceiling")
    annulus("Ceiling_recess_ring", (0, 0.4, 17.83), 12.20, 10.65, 0.08, "white", segments=96)
    torus("Ceiling_LED_outer", (0, 0.2, 17.77), 11.5, 0.055, "light")
    torus("Ceiling_LED_inner", (0, 0.4, 17.74), 8.7, 0.045, "light")
    torus("Ceiling_center_ring", (0, 0.5, 17.70), 3.0, 0.12, "ceiling", major_segments=64)


def add_panorama_windows() -> None:
    radius = 14.72
    start = math.radians(-112)
    end = math.radians(112)
    count = 18
    panel_angle = (end - start) / count
    for i in range(count):
        a = start + (i + 0.5) * panel_angle
        panel_width = 2 * radius * math.tan(panel_angle * 0.46)
        x, y = radius * math.sin(a), radius * math.cos(a)
        rot = (0, 0, -a)
        box(
            f"Window_glass_{i+1:02d}",
            (x, y, 9.20),
            (panel_width / 2, 0.035, 8.60),
            "glass",
            rotation=rot,
        )
        edge_a = start + i * panel_angle
        sx, sy = radius * math.sin(edge_a), radius * math.cos(edge_a)
        box(
            f"Window_mullion_{i+1:02d}",
            (sx, sy, 9.15),
            (0.075, 0.11, 8.75),
            "frame",
            rotation=(0, 0, -edge_a),
            bevel_width=0.025,
        )
    for idx, edge_a in enumerate((end,), start=count + 1):
        sx, sy = radius * math.sin(edge_a), radius * math.cos(edge_a)
        box(
            f"Window_mullion_{idx:02d}",
            (sx, sy, 9.15),
            (0.075, 0.11, 8.75),
            "frame",
            rotation=(0, 0, -edge_a),
            bevel_width=0.025,
        )
    # Curved safety rail.
    for i in range(count):
        a = start + (i + 0.5) * panel_angle
        panel_width = 2 * 13.85 * math.tan(panel_angle * 0.46)
        x, y = 13.85 * math.sin(a), 13.85 * math.cos(a)
        box(
            f"Rail_top_{i+1:02d}",
            (x, y, 1.22),
            (panel_width / 2, 0.055, 0.055),
            "steel",
            rotation=(0, 0, -a),
            bevel_width=0.025,
        )
        for z in (0.55,):
            box(
                f"Rail_mid_{i+1:02d}",
                (x, y, z),
                (panel_width / 2, 0.035, 0.035),
                "steel",
                rotation=(0, 0, -a),
            )


def add_rear_architecture() -> None:
    # Rear service wall, with a central entry gap.
    box("Rear_wall_left", (-9.3, -12.2, 4.1), (5.2, 0.35, 3.9), "white", bevel_width=0.12)
    box("Rear_wall_right", (9.3, -12.2, 4.1), (5.2, 0.35, 3.9), "white", bevel_width=0.12)
    box("Rear_wall_upper", (0, -12.2, 6.55), (4.25, 0.35, 1.35), "white", bevel_width=0.12)
    box("Entry_header", (0, -12.2, 4.85), (4.25, 0.4, 0.45), "blue", bevel_width=0.12)
    box("Entry_left", (-3.55, -12.15, 2.45), (0.28, 0.3, 2.05), "frame")
    box("Entry_right", (3.55, -12.15, 2.45), (0.28, 0.3, 2.05), "frame")
    box("Entry_glass", (0, -12.15, 2.45), (3.25, 0.04, 2.0), "glass")
    text_mesh(
        "Entry_sign",
        "세종 360° 전망대",
        (0, -12.58, 4.84),
        0.48,
        "white",
        rotation=(math.pi / 2, 0, 0),
    )


def add_telescope(name: str, x: float, y: float, yaw: float) -> None:
    # Pedestal and articulated binocular body.
    cylinder(f"{name}_base", (x, y, 0.32), 0.62, 0.25, "dark", vertices=32, bevel_width=0.04)
    cylinder(f"{name}_base_trim", (x, y, 0.46), 0.54, 0.045, "brass", vertices=32)
    cylinder(f"{name}_column", (x, y, 1.15), 0.22, 1.45, "steel", vertices=24, bevel_width=0.04)
    cylinder(f"{name}_pivot", (x, y, 1.95), 0.34, 0.55, "dark", vertices=24, rotation=(math.pi / 2, 0, 0))
    dx, dy = math.sin(yaw), math.cos(yaw)
    body_center = (x + dx * 0.15, y + dy * 0.15, 2.18)
    body = box(
        f"{name}_body",
        body_center,
        (0.58, 0.88, 0.32),
        "dark",
        rotation=(0.10, 0, -yaw),
        bevel_width=0.16,
    )
    # Twin objective lenses.
    side_x, side_y = math.cos(yaw), -math.sin(yaw)
    for side in (-1, 1):
        lx = x + dx * 1.04 + side_x * side * 0.30
        ly = y + dy * 1.04 + side_y * side * 0.30
        cylinder(
            f"{name}_lens_{side:+d}",
            (lx, ly, 2.25),
            0.21,
            0.12,
            "cyan",
            vertices=24,
            rotation=(math.pi / 2, 0, -yaw),
        )
    body["interactive"] = True
    body["interactionType"] = "viewpoint"


def add_bench(name: str, x: float, y: float, yaw: float) -> None:
    # Wood side cheeks.
    for side in (-1, 1):
        sx = x + math.cos(yaw) * side * 2.25
        sy = y - math.sin(yaw) * side * 2.25
        box(
            f"{name}_side_{side:+d}",
            (sx, sy, 0.72),
            (0.28, 0.72, 0.72),
            "wood",
            rotation=(0, 0, -yaw),
            bevel_width=0.14,
        )
    box(
        f"{name}_seat",
        (x, y, 0.72),
        (2.05, 0.70, 0.22),
        "upholstery",
        rotation=(0, 0, -yaw),
        bevel_width=0.16,
    )
    for side in (-1, 1):
        fx = x + math.cos(yaw) * side * 1.72
        fy = y - math.sin(yaw) * side * 1.72
        box(
            f"{name}_foot_{side:+d}",
            (fx, fy, 0.24),
            (0.11, 0.42, 0.18),
            "brass",
            rotation=(0, 0, -yaw),
            bevel_width=0.04,
        )
    back_x, back_y = x - math.sin(yaw) * 0.56, y - math.cos(yaw) * 0.56
    box(
        f"{name}_back",
        (back_x, back_y, 1.25),
        (2.05, 0.18, 0.62),
        "upholstery",
        rotation=(0, 0, -yaw),
        bevel_width=0.15,
    )


def add_planter(name: str, x: float, y: float, scale: float = 1.0) -> None:
    cylinder(name + "_pot", (x, y, 0.48 * scale), 0.52 * scale, 0.85 * scale, "white", vertices=32, bevel_width=0.07)
    cylinder(name + "_soil", (x, y, 0.92 * scale), 0.43 * scale, 0.06 * scale, "soil", vertices=24)
    for i in range(9):
        a = i * 2.39996
        r = (0.16 + (i % 3) * 0.08) * scale
        z = (1.08 + (i % 4) * 0.24) * scale
        sphere(
            f"{name}_leaf_{i+1:02d}",
            (x + math.cos(a) * r, y + math.sin(a) * r, z),
            (0.18 * scale, 0.09 * scale, 0.45 * scale),
            "leaf" if i % 2 else "leaf2",
            segments=12,
            rings=7,
        ).rotation_euler[2] = -a


def add_photo_kiosk() -> None:
    box("Kiosk_body", (-9.4, -3.2, 1.55), (1.75, 0.62, 1.65), "white", rotation=(0, 0, -0.35), bevel_width=0.25)
    box("Kiosk_face", (-9.18, -2.62, 1.75), (1.42, 0.055, 1.15), "screen", rotation=(0, 0, -0.35), bevel_width=0.12)
    text_mesh(
        "Kiosk_title",
        "세종 360° 파노라마",
        (-8.79, -2.48, 2.65),
        0.20,
        "white",
        extrude=0.008,
        rotation=(math.pi / 2, 0, -0.35),
    )
    # Stylized panorama on the display.
    box("Kiosk_sky", (-9.03, -2.52, 1.88), (1.04, 0.02, 0.54), "cyan", rotation=(0, 0, -0.35), bevel_width=0.04)
    cylinder("Kiosk_button", (-8.65, -2.42, 0.87), 0.23, 0.08, "cyan", vertices=32, rotation=(math.pi / 2, 0, -0.35))
    kiosk = bpy.data.objects["Kiosk_body"]
    kiosk["interactive"] = True
    kiosk["interactionType"] = "photo"


def add_furniture_and_plants() -> None:
    add_telescope("Telescope_left", -4.5, 8.4, -0.24)
    add_telescope("Telescope_right", 5.4, 8.0, 0.28)
    add_bench("Bench_right", 8.5, -2.7, -0.20)
    add_bench("Bench_left", -7.8, 2.2, 0.35)
    add_photo_kiosk()
    for i, (x, y, s) in enumerate(
        [
            (-12.4, 6.2, 1.05),
            (12.2, 5.8, 1.1),
            (-11.3, -7.5, 0.9),
            (11.5, -7.1, 0.95),
            (-2.4, 11.6, 0.75),
            (2.3, 11.8, 0.78),
        ]
    ):
        add_planter(f"Planter_{i+1:02d}", x, y, s)


def add_lighting_and_camera() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 17.4))
    key = bpy.context.object
    key.name = "Interior_softbox"
    key.data.energy = 1150
    key.data.shape = "DISK"
    key.data.size = 13
    key.data.color = (0.82, 0.92, 1.0)

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 16))
    sun = bpy.context.object
    sun.name = "Daylight"
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-28))
    sun.data.energy = 2.2
    sun.data.angle = math.radians(18)

    # Interior hero view: close to the supplied reference composition.
    bpy.ops.object.camera_add(location=(0.0, -10.7, 2.55))
    camera = bpy.context.object
    camera.name = "Observatory_preview_camera"
    bpy.context.scene.camera = camera
    target = Vector((0, 8.8, 2.35))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 27


def configure_scene() -> None:
    scene = bpy.context.scene
    scene["asset"] = "Sejong Panoramic Observatory"
    scene["units"] = "meters"
    scene.unit_settings.system = "METRIC"
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.color = (0.09, 0.18, 0.28)
    world = scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.055, 0.20, 0.39, 1)
    bg.inputs["Strength"].default_value = 0.72
    scene.view_settings.look = "AgX - Medium High Contrast"


def main() -> None:
    reset_scene()
    create_materials()
    create_panorama_material()
    configure_scene()
    add_floor_and_ceiling()
    add_city_panorama()
    add_panorama_windows()
    add_furniture_and_plants()
    add_lighting_and_camera()

    # Clean hierarchy and useful asset metadata.
    root = bpy.data.objects.new("OBSERVATORY_ROOT", None)
    bpy.context.collection.objects.link(root)
    root["assetType"] = "walkable-interior"
    root["displayName"] = "전망대"
    root["reference"] = "세종의 전경을 한눈에 보는 360도 전망 공간"
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj.parent is None and obj.type not in {"CAMERA", "LIGHT"}:
            obj.parent = root

    bpy.context.scene.render.filepath = str(PREVIEW)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    bpy.ops.render.render(write_still=True)
    print(f"Created {OUT_GLB}")
    print(f"Created {OUT_BLEND}")
    print(f"Created {PREVIEW}")


if __name__ == "__main__":
    main()

"""Render a quick validation preview of the central plaza source blend."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/maps/government-central-plaza-preview.png"
TOP_OUTPUT = ROOT / "src/assets/maps/government-central-plaza-top-preview.png"
scene = bpy.context.scene


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.camera_add(location=(0, 30.5, 19.5))
camera = bpy.context.object
camera.name = "CentralPlazaPreviewCamera"
camera.data.lens = 50
look_at(camera, (0, 0.8, 2.15))
scene.camera = camera

for name, location, energy, size, color in (
    ("Preview_Key", (-10, 14, 18), 2100, 8.0, (1.0, 0.80, 0.65)),
    ("Preview_Fill", (11, 4, 13), 1700, 9.0, (0.58, 0.76, 1.0)),
    ("Preview_Interior", (0, -7, 16), 2400, 10.0, (0.82, 0.92, 1.0)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 1.0, 2.0))

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.render.film_transparent = False
scene.world.color = (0.055, 0.065, 0.075)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"PREVIEW={OUTPUT}")

# A second near-orthographic top view catches unintended facade seams that are
# hidden by the normal game camera.
camera.location = (0, 0, 36)
camera.data.type = "ORTHO"
camera.data.ortho_scale = 34
look_at(camera, (0, 0, 0))
scene.render.filepath = str(TOP_OUTPUT)
bpy.ops.render.render(write_still=True)
print(f"TOP_PREVIEW={TOP_OUTPUT}")

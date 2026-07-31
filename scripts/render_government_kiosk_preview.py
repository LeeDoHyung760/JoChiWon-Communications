"""Render a close validation preview of the detailed government kiosk."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/maps/government-central-plaza-kiosk-preview.png"
scene = bpy.context.scene
screen = bpy.data.objects["Kiosk_Right_WebUI_Surface"]
target = screen.matrix_world.translation + Vector((0, 0, -0.35))
normal = (screen.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.camera_add(location=target + normal * 4.1 + Vector((0, 0, 0.45)))
camera = bpy.context.object
camera.data.lens = 58
look_at(camera, target)
scene.camera = camera

for name, offset, energy, size, color in (
    ("Kiosk_Key", normal * 2.4 + Vector((-1.4, 0.5, 2.5)), 1200, 4.0, (1.0, 0.82, 0.68)),
    ("Kiosk_Fill", normal * 1.5 + Vector((1.8, -0.7, 1.4)), 850, 3.0, (0.60, 0.78, 1.0)),
):
    bpy.ops.object.light_add(type="AREA", location=target + offset)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.world.color = (0.04, 0.05, 0.06)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"KIOSK_PREVIEW={OUTPUT}")

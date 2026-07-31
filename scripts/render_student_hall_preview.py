"""Render a quick preview from student-hall-source.blend."""

from pathlib import Path
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/maps/student-hall-preview.png"
scene = bpy.context.scene


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.camera_add(location=(0, -28.5, 8.8))
camera = bpy.context.object
camera.name = "PreviewCamera"
camera.data.lens = 46
look_at(camera, (0, 2.0, 2.65))
scene.camera = camera

for name, location, energy, size, color in (
    ("Key", (-10, -10, 11), 2200, 9.0, (1.0, 0.78, 0.58)),
    ("Fill", (10, -4, 9), 1600, 8.0, (0.63, 0.76, 1.0)),
    ("Interior", (0, 5, 10), 2500, 11.0, (1.0, 0.84, 0.66)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 2.5, 2.0))

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.world.color = (0.035, 0.04, 0.05)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"PREVIEW={OUTPUT}")

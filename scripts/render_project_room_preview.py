"""Import project-room.glb and render a quick design preview."""

from pathlib import Path
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "src/assets/maps/project-room.glb"
OUTPUT = ROOT / "src/assets/maps/project-room-preview.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MODEL))


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.camera_add(location=(0, -21.5, 8.8))
camera = bpy.context.object
camera.data.lens = 45
look_at(camera, (0, 0.4, 1.35))

scene = bpy.context.scene
scene.camera = camera

for name, location, energy, size, color in (
    ("Key", (-8, -9, 10), 1800, 8.0, (1.0, 0.78, 0.58)),
    ("Fill", (9, -4, 8), 1300, 7.0, (0.60, 0.78, 1.0)),
    ("Interior", (0, 3, 10), 2200, 10.0, (1.0, 0.86, 0.68)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 0, 1.2))

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.world.color = (0.025, 0.035, 0.035)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"PREVIEW={OUTPUT}")

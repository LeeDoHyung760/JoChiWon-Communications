"""Render the new project lobby with the untouched project room behind it."""

from pathlib import Path
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ROOM = ROOT / "src/assets/maps/project-room.glb"
LOBBY = ROOT / "src/assets/maps/project-lobby.glb"
OUTPUT = ROOT / "src/assets/maps/project-lobby-preview.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOM))
bpy.ops.import_scene.gltf(filepath=str(LOBBY))


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.camera_add(location=(0, 27.5, 9.2))
camera = bpy.context.object
camera.data.lens = 39
look_at(camera, (0, 12.3, 1.55))

scene = bpy.context.scene
scene.camera = camera

for name, location, energy, size, color, target in (
    ("Lobby Key", (-7, 22, 10), 1900, 8.0, (1.0, 0.78, 0.58), (0, 13, 1.1)),
    ("Lobby Fill", (8, 17, 9), 1450, 7.0, (0.52, 0.72, 1.0), (0, 12, 1.2)),
    ("Room Glow", (0, 5, 9), 1700, 8.0, (1.0, 0.83, 0.64), (0, 9, 1.4)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1536
scene.render.resolution_y = 864
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.world.color = (0.018, 0.024, 0.025)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"PREVIEW={OUTPUT}")

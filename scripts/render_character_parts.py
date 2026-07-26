import sys
from pathlib import Path

import bpy
from mathutils import Vector


source = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
output = Path(sys.argv[sys.argv.index("--") + 2]).resolve()
output.mkdir(parents=True, exist_ok=True)

bpy.ops.import_scene.gltf(filepath=str(source))
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = False
scene.render.resolution_x = 420
scene.render.resolution_y = 520
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.color = (0.06, 0.06, 0.06)

camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0, -230, 52)
camera.rotation_euler = (1.5708, 0, 0)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 125

meshes = [obj for obj in scene.objects if obj.type == "MESH"]
variants = {
    "body_only": {"tripo_node_f2f741ba"},
    "tie_candidates": {"shirt1_1.001", "tripo_part_2"},
    "body_and_tie": {"tripo_node_f2f741ba", "shirt1_1.001", "tripo_part_2"},
    "all_parts": {obj.name for obj in meshes},
}

for filename, visible_names in variants.items():
    for obj in meshes:
        obj.hide_render = obj.name not in visible_names
    scene.render.filepath = str(output / f"{filename}.png")
    bpy.ops.render.render(write_still=True)
    print(filename, sorted(visible_names))

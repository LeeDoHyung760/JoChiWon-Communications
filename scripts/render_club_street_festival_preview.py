import bpy
import os
from mathutils import Vector

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source = os.path.join(root, 'src', 'assets', 'maps', 'club-street-festival-map.glb')
output = os.path.join(root, 'src', 'assets', 'maps', 'club-street-festival-map-preview.png')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)

def track(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add(location=(46, 58, 64))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 76
track(camera, (0, 0, 0))
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type='AREA', location=(-24, 18, 55))
key = bpy.context.object
key.data.energy = 5200
key.data.size = 28
track(key, (0, 0, 0))

bpy.ops.object.light_add(type='AREA', location=(30, -20, 28))
fill = bpy.context.object
fill.data.energy = 2400
fill.data.size = 22
track(fill, (0, 0, 0))

world = bpy.context.scene.world or bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.use_nodes = True
background = world.node_tree.nodes['Background']
background.inputs['Color'].default_value = (0.08, 0.20, 0.17, 1)
background.inputs['Strength'].default_value = 1.2

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1536
scene.render.resolution_y = 864
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.render.filepath = output
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 2.0
scene.render.image_settings.color_depth = '8'

bpy.ops.render.render(write_still=True)
print(f'Rendered {output}')

import bpy, os
from mathutils import Vector

root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source=os.path.join(root,"src","assets","maps","festival-experience-map.glb")
output=os.path.join(root,"src","assets","maps","festival-experience-map-preview.png")
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
def track(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(27,30,29)); cam=bpy.context.object; cam.data.type='ORTHO'; cam.data.ortho_scale=42; track(cam,(0,0,0)); bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-10,5,35)); sun=bpy.context.object; sun.data.energy=2200; sun.data.size=18; track(sun,(0,0,0))
world=bpy.context.scene.world or bpy.data.worlds.new('World'); bpy.context.scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.78,.88,.81,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1000; scene.render.resolution_y=900; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.filepath=output; scene.view_settings.look='AgX - Medium High Contrast'
bpy.ops.render.render(write_still=True)

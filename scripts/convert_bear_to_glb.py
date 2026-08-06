import bpy
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
source = os.path.abspath(args[0])
target = os.path.abspath(args[1])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source, use_anim=True)

print('BEAR_OBJECTS=' + ','.join(obj.name for obj in bpy.context.scene.objects))
print('BEAR_ACTIONS=' + ','.join(
    f'{action.name}[{int(action.frame_range[0])}-{int(action.frame_range[1])}]'
    for action in bpy.data.actions
))

for action in bpy.data.actions:
    action.use_fake_user = True

bpy.ops.export_scene.gltf(
    filepath=target,
    export_format='GLB',
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_morph=True,
    export_apply=False,
)
print('BEAR_GLB=' + target)

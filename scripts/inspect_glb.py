import sys
from pathlib import Path

import bpy
from mathutils import Vector


for raw_path in sys.argv[sys.argv.index("--") + 1 :]:
    path = Path(raw_path).resolve()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    bpy.ops.import_scene.gltf(filepath=str(path))
    corners = []
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector(map(min, zip(*corners)))
    maximum = Vector(map(max, zip(*corners)))
    size = maximum - minimum
    actions = [(action.name, tuple(action.frame_range)) for action in bpy.data.actions]
    print(
        f"INSPECT {path.name} size=({size.x:.3f},{size.y:.3f},{size.z:.3f}) "
        f"min=({minimum.x:.3f},{minimum.y:.3f},{minimum.z:.3f}) "
        f"actions={actions}"
    )

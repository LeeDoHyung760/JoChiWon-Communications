import sys
from pathlib import Path

import bpy
from mathutils import Vector


path = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.import_scene.gltf(filepath=str(path))

for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector(map(min, zip(*corners)))
    maximum = Vector(map(max, zip(*corners)))
    materials = [slot.material.name if slot.material else "(none)" for slot in obj.material_slots]
    print(
        f"PART name={obj.name!r} "
        f"min=({minimum.x:.2f},{minimum.y:.2f},{minimum.z:.2f}) "
        f"max=({maximum.x:.2f},{maximum.y:.2f},{maximum.z:.2f}) "
        f"materials={materials}"
    )

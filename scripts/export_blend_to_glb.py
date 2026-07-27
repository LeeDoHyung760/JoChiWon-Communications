import sys
from pathlib import Path

import bpy


target = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
target.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=str(target),
    export_format="GLB",
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_yup=True,
)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
print(
    f"Exported {bpy.data.filepath} -> {target} "
    f"({len(meshes)} meshes, {len(bpy.data.actions)} actions)"
)

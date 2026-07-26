import sys
from pathlib import Path

import bpy


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :]
    source = Path(args[0]).resolve()
    target = Path(args[1]).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    if hasattr(bpy.ops.wm, "fbx_import"):
        bpy.ops.wm.fbx_import(filepath=str(source))
    else:
        bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=True)

    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_yup=True,
    )

    objects = list(bpy.context.scene.objects)
    actions = list(bpy.data.actions)
    print(
        f"Converted {source.name}: "
        f"{len(objects)} objects, {len(actions)} actions -> {target}"
    )
    if actions:
        print("Actions:", ", ".join(action.name for action in actions))


if __name__ == "__main__":
    main()

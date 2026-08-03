"""Build a cozy cutaway cottage personal space as a self-contained GLB.

Run:
  blender --background --python scripts/create_personal_space.py

The scene is intentionally texture-free and uses simple PBR materials so it is
portable, light enough for the web, and easy to recolor in Three.js/Blender.
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src/assets/objects"
OUT_GLB = OUT_DIR / "personal-space-cottage.glb"
OUT_BLEND = OUT_DIR / "personal-space-cottage-source.blend"
OUT_PREVIEW = OUT_DIR / "personal-space-cottage-preview.png"
OUT_INTERIOR_PREVIEW = OUT_DIR / "personal-space-cottage-interior-preview.png"
RNG = random.Random(20260803)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            collection.remove(block)


def mat(name, color, roughness=0.7, metallic=0.0, emission=None):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 2.0
    return material


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def bevel(obj, width=0.06, segments=2):
    modifier = obj.modifiers.new("Soft_Edges", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    return obj


def cube(name, location, scale, material, bevel_width=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    if bevel_width:
        bevel(obj, bevel_width)
    return obj


def cylinder(name, location, radius, depth, material, vertices=16, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return assign(obj, material)


def sphere(name, location, radius, material, scale=(1, 1, 1), subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, material)


def plane_disc(name, location, radius, material, vertices=32):
    return cylinder(name, location, radius, 0.035, material, vertices)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def arch_mesh(name, location, width, height, depth, material, segments=10):
    """Extruded flat-bottom arch facing the -Y direction."""
    radius = width / 2
    spring = height - radius
    outline = [(-width / 2, 0), (width / 2, 0), (width / 2, spring)]
    for i in range(segments + 1):
        angle = i * math.pi / segments
        outline.append((math.cos(angle) * radius, spring + math.sin(angle) * radius))
    outline.append((-width / 2, spring))
    verts = []
    for y in (-depth / 2, depth / 2):
        verts.extend([(x, y, z) for x, z in outline])
    count = len(outline)
    faces = []
    faces.append(tuple(range(count - 1, -1, -1)))
    faces.append(tuple(range(count, count * 2)))
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    bevel(obj, 0.035, 2)
    return obj


def gable(name, y, x_center, width, wall_top, peak, depth, material):
    verts = [
        (-width / 2, -depth / 2, 0), (width / 2, -depth / 2, 0), (0, -depth / 2, peak-wall_top),
        (-width / 2, depth / 2, 0), (width / 2, depth / 2, 0), (0, depth / 2, peak-wall_top),
    ]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (x_center, y, wall_top)
    return obj


def unified_gable_roof(name, half_width, half_depth, eave_z, ridge_z, material):
    """Create one detailed roof mesh: shell, raised tiles and ridge are one object."""
    verts = [
        (-half_width,-half_depth,eave_z), (-half_width,0,ridge_z), (-half_width,half_depth,eave_z),
        ( half_width,-half_depth,eave_z), ( half_width,0,ridge_z), ( half_width,half_depth,eave_z),
    ]
    faces = [
        (0,1,2), (3,5,4),       # end gables
        (0,3,4,1),              # front roof slope
        (1,4,5,2),              # back roof slope
        (0,2,5,3),              # closed underside
    ]

    def add_oriented_box(cx,cy,cz,hx,hy,hz,angle_x):
        start=len(verts)
        cos_a, sin_a=math.cos(angle_x),math.sin(angle_x)
        for x,y,z in ((-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),
                      (-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)):
            verts.append((cx+x,cy+y*cos_a-z*sin_a,cz+y*sin_a+z*cos_a))
        faces.extend([
            (start,start+1,start+2,start+3),(start+4,start+7,start+6,start+5),
            (start,start+4,start+5,start+1),(start+1,start+5,start+6,start+2),
            (start+2,start+6,start+7,start+3),(start+4,start,start+3,start+7),
        ])

    # Raised, slightly overlapping clay tiles. They are disconnected mesh islands,
    # but belong to this same roof mesh/node in Blender and the exported GLB.
    slope=(ridge_z-eave_z)/half_depth
    roof_angle=math.atan2(ridge_z-eave_z,half_depth)
    for side in (-1,1):
        for row in range(7):
            distance=.34+row*.56
            y=side*distance
            z=ridge_z-distance*slope+.09
            offset=.34 if row%2 else 0
            for col in range(19):
                x=-6.05+col*.68+offset
                if x+.31>half_width or x-.31<-half_width:
                    continue
                add_oriented_box(x,y,z,.31,.31,.055,-side*roof_angle)

    # Rounded ridge detail, also emitted into this same mesh.
    ridge_start=len(verts)
    ridge_segments=12
    for x in (-half_width,half_width):
        for i in range(ridge_segments):
            a=i*math.tau/ridge_segments
            verts.append((x,math.cos(a)*.14,ridge_z+math.sin(a)*.14))
    for i in range(ridge_segments):
        j=(i+1)%ridge_segments
        faces.append((ridge_start+i,ridge_start+ridge_segments+i,
                      ridge_start+ridge_segments+j,ridge_start+j))
    faces.append(tuple(ridge_start+i for i in range(ridge_segments-1,-1,-1)))
    faces.append(tuple(ridge_start+ridge_segments+i for i in range(ridge_segments)))

    mesh = bpy.data.meshes.new(name+"Mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.materials.append(material)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    bevel(obj,.09,3)
    return obj


def window(name, x, y, z, width=1.35, height=1.35, facing="back"):
    # A warm wooden frame and blue glass; back windows face along Y, side windows along X.
    if facing == "back":
        cube(name + "_Glass", (x, y, z), (width/2, 0.055, height/2), glass, 0.02)
        cube(name + "_FrameTop", (x, y-0.045, z+height/2), (width/2+0.12, 0.08, 0.10), wood, 0.025)
        cube(name + "_FrameBottom", (x, y-0.045, z-height/2), (width/2+0.12, 0.08, 0.10), wood, 0.025)
        cube(name + "_FrameLeft", (x-width/2, y-0.045, z), (0.10, 0.08, height/2), wood, 0.025)
        cube(name + "_FrameRight", (x+width/2, y-0.045, z), (0.10, 0.08, height/2), wood, 0.025)
        cube(name + "_MullionV", (x, y-0.12, z), (0.055, 0.04, height/2), wood)
        cube(name + "_MullionH", (x, y-0.12, z), (width/2, 0.04, 0.055), wood)
    else:
        cube(name + "_Glass", (x, y, z), (0.055, width/2, height/2), glass, 0.02)
        for sy in (-1, 1):
            cube(name + f"_FrameSide_{sy}", (x, y+sy*width/2, z), (0.08, 0.10, height/2), wood, 0.025)
        for sz in (-1, 1):
            cube(name + f"_FrameZ_{sz}", (x, y, z+sz*height/2), (0.08, width/2+0.12, 0.10), wood, 0.025)
        cube(name + "_MullionV", (x-0.12, y, z), (0.04, 0.055, height/2), wood)
        cube(name + "_MullionH", (x-0.12, y, z), (0.04, width/2, 0.055), wood)


def chair(name, x, y, rotation=0):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation
    pieces = [
        cube(name+"_Seat", (0, 0, 1.00), (0.36, 0.36, 0.09), wood, 0.05),
        cube(name+"_Back", (0, 0.31, 1.45), (0.34, 0.08, 0.48), wood, 0.06),
    ]
    for ix in (-1, 1):
        for iy in (-1, 1):
            pieces.append(cube(name+f"_Leg_{ix}_{iy}", (ix*.27, iy*.27, .52), (.06,.06,.48), dark_wood, .025))
    for piece in pieces:
        piece.parent = root
    return root


def pot_plant(name, x, y, z=0.0, size=1.0):
    cylinder(name+"_Pot", (x,y,z+0.22*size), 0.22*size, 0.42*size, terracotta, 12)
    cylinder(name+"_Stem", (x,y,z+0.68*size), 0.045*size, 0.62*size, stem, 8)
    for i in range(7):
        angle = i * 2.399
        lx = x + math.cos(angle)*(.18+.035*i)*size
        ly = y + math.sin(angle)*(.18+.035*i)*size
        lz = z + (.62+.11*(i%4))*size
        sphere(name+f"_Leaf_{i}", (lx,ly,lz), .19*size, leaf, (.55,1,.30), 1).rotation_euler[2] = angle


def bush(name, x, y, scale=1.0, flowers=True):
    for i in range(6):
        angle = i * math.tau / 6
        sphere(name+f"_Mass_{i}", (x+math.cos(angle)*.35*scale,
               y+math.sin(angle)*.28*scale, .35*scale+(i%2)*.1), .48*scale,
               leaf if i%2 else leaf_dark, (1.2,1,.8), 1)
    if flowers:
        for i in range(5):
            angle = i*2.1
            color = flower_yellow if i%2 else flower_pink
            sphere(name+f"_Flower_{i}", (x+math.cos(angle)*.42*scale,
                   y+math.sin(angle)*.32*scale, .67*scale), .085*scale, color, (1,.65,.45), 1)


reset_scene()
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Cozy, slightly desaturated palette inspired by the references.
cream = mat("MAT_Ivory_Plaster", (0.91, 0.83, 0.68), .76)
cream_light = mat("MAT_Interior_Plaster", (0.97, 0.91, 0.79), .86)
wood = mat("MAT_Walnut_Wood", (0.31, 0.12, 0.040), .60)
dark_wood = mat("MAT_Dark_Walnut", (0.115, 0.038, 0.016), .66)
floor_wood = mat("MAT_Oak_Parquet", (0.62, 0.34, 0.12), .62)
roof = mat("MAT_Deep_Terracotta_Roof", (0.47, 0.085, 0.032), .68)
roof_light = mat("MAT_Terracotta_Highlight", (0.75, 0.26, 0.105), .80)
stone = mat("MAT_Foundation_Stone", (0.36, 0.34, 0.29), .94)
stone_light = mat("MAT_Path_Stone", (0.58, 0.55, 0.47), .96)
grass = mat("MAT_Grass", (0.20, 0.39, 0.105), 1.0)
grass_light = mat("MAT_Grass_Light", (0.34, 0.52, 0.15), 1.0)
leaf = mat("MAT_Leaves", (0.16, 0.37, 0.08), 1.0)
leaf_dark = mat("MAT_Leaves_Dark", (0.075, 0.22, 0.045), 1.0)
stem = mat("MAT_Stems", (0.17, 0.26, 0.055), 1.0)
flower_yellow = mat("MAT_Flowers_Yellow", (1.0, .67, .08), .9)
flower_pink = mat("MAT_Flowers_Pink", (1.0, .42, .47), .9)
glass = mat("MAT_Window_Blue", (0.20, 0.57, 0.67), .24, .05)
sofa_green = mat("MAT_Sage_Sofa", (0.39, 0.55, 0.27), .92)
fabric_green = mat("MAT_Gingham_Green", (0.48, 0.64, 0.28), .95)
fabric_cream = mat("MAT_Linen_Cream", (0.91, 0.84, 0.66), .98)
rug_green = mat("MAT_Rug_Green", (0.35, 0.47, 0.20), 1.0)
rug_gold = mat("MAT_Rug_Gold", (0.72, 0.57, 0.20), 1.0)
metal = mat("MAT_Dark_Metal", (0.075, 0.065, 0.052), .36, .5)
brass = mat("MAT_Antique_Brass", (0.58, 0.34, 0.085), .28, .72)
fridge_green = mat("MAT_Retro_Fridge", (0.32, 0.51, 0.34), .42, .05)
counter = mat("MAT_Countertop", (0.78, 0.72, 0.61), .48)
water = mat("MAT_Sink", (0.43, 0.47, 0.45), .26, .65)
fountain_water = mat("MAT_Fountain_Water", (0.12, 0.48, 0.72), .18, .12,
                     emission=(.025,.16,.32))
warm_glow = mat("MAT_Warm_Light", (1.0, .56, .16), .28, emission=(1.0,.35,.04))
red = mat("MAT_Mailbox_Red", (.68,.08,.045), .48, .1)
terracotta = mat("MAT_Plant_Pots", (.60,.20,.08), .9)
book_colors = [mat("MAT_Book_Green", (.17,.36,.18), .8), mat("MAT_Book_Red", (.58,.16,.08), .8),
               mat("MAT_Book_Gold", (.65,.43,.08), .8), mat("MAT_Book_Blue", (.12,.30,.39), .8)]

# Separate semantic collections survive into the source .blend.
architecture = make_collection("COL_Architecture")
furniture = make_collection("COL_Furniture")
decor = make_collection("COL_Decor")
garden = make_collection("COL_Garden")

# Ground island, path and porch.
move_to(cube("ENV_Grass_Island", (0,-.2,-.33), (15.0,11.0,.30), grass, .34), garden)
for i in range(7):
    x = math.sin(i*.8)*.20
    y = -5.35+i*.62
    move_to(cube(f"ENV_Stepping_Stone_{i:02d}", (x,y,.015), (.48,.34,.09), stone_light, .14,
                 rotation=(0,0,RNG.uniform(-.10,.10))), garden)
for step, (y,z,w) in enumerate(((-3.92,.16,1.45),(-3.62,.34,1.30),(-3.34,.52,1.14))):
    move_to(cube(f"ARCH_Porch_Step_{step}", (0,y,z), (w,.34,.16), stone_light,.08), architecture)

# Floor, foundation, three full walls and a low cutaway facade.
move_to(cube("ARCH_Foundation", (0,0,.35), (6.1,4.15,.35), stone,.09), architecture)
move_to(cube("ARCH_Interior_Floor", (0,0,.74), (5.82,3.82,.08), floor_wood,.035), architecture)
for i in range(12):
    move_to(cube(f"ARCH_Floorboard_{i:02d}", (-5.3+i*.96,0,.835), (.012,3.78,.008), dark_wood), architecture)
move_to(cube("ARCH_Back_Wall", (0,3.70,2.72), (5.86,.14,1.88), cream_light,.04), architecture)
move_to(cube("ARCH_Left_Wall", (-5.72,0,2.72), (.14,3.70,1.88), cream_light,.04), architecture)
move_to(cube("ARCH_Right_Wall", (5.72,0,2.72), (.14,3.70,1.88), cream_light,.04), architecture)
move_to(cube("EXTERIOR_Front_Wall_Left", (-3.33,-3.70,2.72), (2.53,.14,1.88), cream,.04), architecture)
move_to(cube("EXTERIOR_Front_Wall_Right", (3.33,-3.70,2.72), (2.53,.14,1.88), cream,.04), architecture)
move_to(cube("EXTERIOR_Front_Door_Header", (0,-3.70,4.10), (.80,.14,.50), cream,.04), architecture)
left_gable = gable("EXTERIOR_Left_Gable", 0, -5.72, 7.40, 4.60, 7.15, .28, cream)
left_gable.rotation_euler[2] = math.pi/2
move_to(left_gable, architecture)
right_gable = gable("EXTERIOR_Right_Gable", 0, 5.72, 7.40, 4.60, 7.15, .28, cream)
right_gable.rotation_euler[2] = math.pi/2
move_to(right_gable, architecture)

# Exposed timber frame.
for x in (-5.55,-3.1,0,3.1,5.55):
    move_to(cube(f"ARCH_Back_Post_{x}", (x,3.50,2.72), (.105,.13,1.88), wood,.025), architecture)
for x in (-5.55,5.55):
    move_to(cube(f"ARCH_Side_Front_Post_{x}", (x,-3.50,2.72), (.13,.13,1.88), wood,.025), architecture)
move_to(cube("ARCH_Back_Top_Beam", (0,3.48,4.46), (5.7,.14,.14), wood,.035), architecture)
move_to(cube("EXTERIOR_Front_Top_Beam", (0,-3.48,4.46), (5.72,.14,.16), wood,.035), architecture)
for x in (-5.55,5.55):
    move_to(cube(f"ARCH_Side_Top_Beam_{x}", (x,0,4.46), (.14,3.46,.14), wood,.035), architecture)

# One continuous roof object keeps the interior hidden from every exterior angle.
# Runtime code can hide EXTERIOR_Roof after the player enters the house.
move_to(unified_gable_roof("EXTERIOR_Roof",6.18,4.08,4.62,7.18,roof),architecture)

# Chimney with block courses.
move_to(cube("ARCH_Chimney_Core", (-4.55,2.75,6.34), (.62,.58,1.65), stone,.045), architecture)
for row in range(5):
    z = 5.16+row*.55
    for side in range(2):
        x = -4.83+side*.56+(row%2)*.12
        move_to(cube(f"ARCH_Chimney_Block_{row}_{side}", (x,2.15,z), (.27,.04,.23), stone_light,.035), architecture)
move_to(cube("ARCH_Chimney_Cap", (-4.55,2.75,8.0), (.76,.72,.16), stone_light,.07), architecture)

# Door and windows on the back/side walls.
move_to(arch_mesh("ARCH_Main_Door", (0,3.48,.82), 1.45, 2.75, .14, wood), architecture)
for z in (1.45,2.15,2.85):
    move_to(cube(f"ARCH_Door_Panel_{z}", (0,3.34,z), (.47,.035,.035), dark_wood,.015), architecture)
move_to(cylinder("ARCH_Door_Handle", (.48,3.27,2.08), .07,.10,metal,12,rotation=(math.pi/2,0,0)), architecture)
# The principal entrance is a real opening assembled from separate wall pieces.
move_to(arch_mesh("EXTERIOR_Entry_Door", (0,-3.48,.82), 1.46, 2.75, .16, wood), architecture)
for z in (1.45,2.15,2.85):
    move_to(cube(f"EXTERIOR_Entry_Door_Panel_{z}", (0,-3.31,z), (.48,.035,.035), dark_wood,.015), architecture)
move_to(cylinder("EXTERIOR_Entry_Door_Handle", (.49,-3.24,2.08), .075,.11,metal,12,
                 rotation=(math.pi/2,0,0)), architecture)
window("ARCH_Living_Window", -3.55, 3.48, 2.95, 1.55, 1.35)
window("ARCH_Kitchen_Window", 3.10, 3.48, 3.12, 1.32, 1.15)
window("ARCH_Left_Window", -5.56, .15, 2.82, 1.45, 1.32, "side")
window("ARCH_Bedroom_Window", 5.56, .75, 2.95, 1.30, 1.25, "side")
window("EXTERIOR_Front_Window_Left", -3.30, -3.88, 2.92, 1.45, 1.30)
window("EXTERIOR_Front_Window_Right", 3.30, -3.88, 2.92, 1.45, 1.30)

# Refined facade: stone pilasters, a shallow entrance canopy, shutters and brass lamps.
for side in (-1,1):
    move_to(cube(f"EXTERIOR_Front_Door_Pilaster_{side}", (side*1.02,-3.91,2.62),
                 (.16,.15,1.76),stone_light,.055),architecture)
    move_to(cube(f"EXTERIOR_Front_Door_Capital_{side}", (side*1.02,-3.94,4.22),
                 (.25,.19,.13),stone_light,.045),architecture)
move_to(cube("EXTERIOR_Front_Door_Canopy", (0,-4.02,4.34), (1.34,.48,.13),
             dark_wood,.08,rotation=(-.12,0,0)),architecture)
move_to(cylinder("EXTERIOR_Entry_Door_Brass_Handle", (.50,-3.99,2.06), .065,.12,brass,16,
                 rotation=(math.pi/2,0,0)),architecture)
for wi,cx in enumerate((-3.30,3.30)):
    for side in (-1,1):
        sx=cx+side*1.02
        move_to(cube(f"EXTERIOR_Front_Shutter_{wi}_{side}", (sx,-3.96,2.92),
                     (.24,.075,.70),wood,.045),architecture)
        for slat in range(4):
            move_to(cube(f"EXTERIOR_Front_ShutterSlat_{wi}_{side}_{slat}",
                         (sx,-4.045,2.48+slat*.29),(.20,.025,.035),brass,.012),architecture)
for i,x in enumerate((-1.48,1.48)):
    move_to(cube(f"EXTERIOR_Front_Lantern_Bracket_{i}",(x,-3.96,3.28),(.06,.08,.28),metal,.025),decor)
    move_to(sphere(f"EXTERIOR_Front_Lantern_Glow_{i}",(x,-4.08,3.58),.18,warm_glow,(.75,.55,1.15),1),decor)

# Bedroom partition: deliberately half height toward the camera.
move_to(cube("ARCH_Bedroom_Partition", (2.65,.40,2.16), (.11,3.02,1.34), cream_light,.04), architecture)
move_to(cube("ARCH_Bedroom_Partition_Beam", (2.65,.40,3.44), (.17,3.04,.13), wood,.03), architecture)
move_to(cube("ARCH_Bedroom_Doorway_Header", (2.65,-2.28,3.02), (.17,.44,.14), wood,.03), architecture)

# Living room rug, sofa, cushions, coffee table and lamp.
move_to(plane_disc("FURN_Living_Rug", (-3.10,-.65,.87), 1.62, rug_green, 32), furniture)
move_to(cube("FURN_Sofa_Base", (-3.85,-.28,1.15), (1.25,.56,.28), sofa_green,.18), furniture)
move_to(cube("FURN_Sofa_Back", (-4.10,.18,1.72), (1.30,.18,.58), sofa_green,.18,
             rotation=(.10,0,0)), furniture)
for x in (-4.85,-2.85):
    move_to(cube(f"FURN_Sofa_Arm_{x}", (x,-.30,1.45), (.18,.58,.43), sofa_green,.16), furniture)
for i,x in enumerate((-4.45,-3.72,-3.0)):
    move_to(cube(f"FURN_Sofa_Cushion_{i}", (x,-.42,1.53), (.34,.38,.15),
                 fabric_cream if i==1 else sofa_green,.10,rotation=(.08,0,0)), furniture)
move_to(cube("FURN_Coffee_Table_Top", (-2.95,-1.45,1.20), (.82,.48,.12), wood,.15), furniture)
for x in (-3.56,-2.34):
    move_to(cube(f"FURN_Coffee_Table_Leg_{x}", (x,-1.45,.97), (.07,.30,.25), dark_wood,.025), furniture)
move_to(cylinder("DECOR_Coffee_Vase", (-2.82,-1.42,1.48), .16,.33,terracotta,12), decor)
for i in range(4):
    move_to(sphere(f"DECOR_Coffee_Flower_{i}", (-2.82+math.cos(i*1.57)*.14,
             -1.42+math.sin(i*1.57)*.14,1.73), .10, flower_yellow if i%2 else flower_pink,
             (1,.7,.5),1), decor)
move_to(cylinder("FURN_Lamp_Stand", (-1.20,2.25,1.45), .055,1.20,metal,12), furniture)
move_to(cylinder("FURN_Lamp_Shade", (-1.20,2.25,2.24), .38,.58,warm_glow,24), furniture)

# Bookcase and books.
move_to(cube("FURN_Bookcase_Body", (-4.55,2.84,2.12), (.82,.30,1.18), wood,.08), furniture)
for shelf in range(4):
    z = 1.12+shelf*.65
    move_to(cube(f"FURN_Bookcase_Shelf_{shelf}", (-4.55,2.47,z), (.76,.35,.07), dark_wood,.025), furniture)
    for book in range(6):
        h = .25+.08*((book+shelf)%3)
        move_to(cube(f"DECOR_Book_{shelf}_{book}", (-5.08+book*.20,2.39,z+.10+h/2),
                     (.07,.12,h/2),book_colors[(book+shelf)%len(book_colors)],.015), decor)
pot_plant("DECOR_Bookcase_Plant", -4.55,2.48,3.38,.55)

# Dining area.
move_to(plane_disc("FURN_Dining_Rug", (.35,-.48,.87), 1.38, rug_green, 32), furniture)
move_to(cube("FURN_Dining_Table", (.25,-.45,1.47), (1.08,.70,.13), wood,.15), furniture)
for x in (-.55,1.05):
    for y in (-.93,.03):
        move_to(cube(f"FURN_Dining_Leg_{x}_{y}", (x,y,1.12), (.08,.08,.38), dark_wood,.025), furniture)
chair("FURN_Dining_Chair_N", .25,.64,0)
chair("FURN_Dining_Chair_S", .25,-1.56,math.pi)
chair("FURN_Dining_Chair_W", -1.16,-.45,math.pi/2)
chair("FURN_Dining_Chair_E", 1.66,-.45,-math.pi/2)
move_to(cylinder("DECOR_Dining_Vase", (.25,-.45,1.78), .14,.34,terracotta,12), decor)
for i in range(5):
    move_to(sphere(f"DECOR_Dining_Flower_{i}", (.25+math.cos(i*1.25)*.16,
             -.45+math.sin(i*1.25)*.16,2.0), .09, flower_yellow if i%2 else flower_pink,
             (1,.65,.45),1), decor)

# Kitchen run, sink, stove, hanging pans and retro refrigerator.
for i in range(4):
    x = .95+i*.92
    move_to(cube(f"FURN_Kitchen_Cabinet_{i}", (x,3.05,1.25), (.43,.48,.43), wood,.045), furniture)
    move_to(cube(f"DECOR_Kitchen_Handle_{i}", (x,2.54,1.36), (.12,.025,.025), metal,.01), decor)
move_to(cube("FURN_Kitchen_Counter", (2.33,3.02,1.74), (1.88,.53,.10), counter,.07), furniture)
move_to(cube("FURN_Kitchen_Sink", (2.48,2.91,1.84), (.47,.30,.035), water,.06), furniture)
move_to(cylinder("DECOR_Kitchen_Faucet", (2.48,3.18,2.10), .055,.48,metal,12,
                 rotation=(math.pi/2,0,0)), decor)
move_to(cube("FURN_Stove", (4.20,3.04,1.70), (.62,.50,.48), dark_wood,.06), furniture)
for x in (3.85,4.20,4.55):
    move_to(cylinder(f"DECOR_Stove_Burner_{x}", (x,2.80,2.21), .16,.035,metal,16), decor)
move_to(cube("FURN_Fridge_Body", (5.03,2.75,1.88), (.50,.68,1.13), fridge_green,.16), furniture)
move_to(cube("FURN_Fridge_Door_Line", (5.03,2.04,1.83), (.44,.025,.025), metal,.01), furniture)
for z in (1.47,2.32):
    move_to(cube(f"FURN_Fridge_Handle_{z}", (4.65,2.02,z), (.035,.035,.22), metal,.02), furniture)
move_to(cube("DECOR_Pan_Rail", (4.18,3.38,3.64), (1.05,.04,.045), dark_wood,.02), decor)
for i,x in enumerate((3.55,4.15,4.72)):
    move_to(cylinder(f"DECOR_Hanging_Pan_{i}", (x,3.28,3.17), .24-i*.025,.08,metal,16,
                     rotation=(math.pi/2,0,0)), decor)
    move_to(cube(f"DECOR_Pan_Handle_{i}", (x,3.27,3.52), (.045,.045,.24), metal,.02), decor)

# Bedroom: bed, checkered blanket strips, pillow, bedside table and lamp.
move_to(plane_disc("FURN_Bedroom_Rug", (4.25,-1.05,.87), 1.28, rug_gold, 32), furniture)
move_to(cube("FURN_Bed_Frame", (4.30,.10,1.15), (1.02,1.72,.26), wood,.12), furniture)
move_to(cube("FURN_Mattress", (4.30,-.10,1.46), (.93,1.46,.20), fabric_cream,.14), furniture)
move_to(cube("FURN_Bed_Headboard", (4.30,1.72,1.90), (1.04,.15,.64), wood,.16), furniture)
move_to(cube("FURN_Bed_Blanket", (4.30,-.62,1.72), (.96,.94,.12), fabric_green,.11), furniture)
for i in range(5):
    move_to(cube(f"DECOR_Blanket_Stripe_X_{i}", (3.58+i*.36,-.62,1.845), (.055,.91,.009),
                 fabric_cream,.01), decor)
for i in range(5):
    move_to(cube(f"DECOR_Blanket_Stripe_Y_{i}", (4.30,-1.32+i*.34,1.85), (.93,.045,.009),
                 fabric_cream,.01), decor)
move_to(cube("FURN_Bed_Pillow", (4.30,1.15,1.82), (.52,.34,.14), fabric_cream,.16), furniture)
move_to(cube("DECOR_Pillow_Accent", (4.30,.92,1.92), (.30,.14,.12), fabric_green,.10), decor)
move_to(cube("FURN_Bedside_Table", (3.10,1.65,1.21), (.39,.39,.37), wood,.07), furniture)
move_to(cylinder("FURN_Bedside_Lamp_Base", (3.10,1.65,1.72), .16,.20,metal,12), furniture)
move_to(cylinder("FURN_Bedside_Lamp_Shade", (3.10,1.65,2.04), .25,.35,warm_glow,20), furniture)

# Wall lamps (emissive geometry only, so the GLB does not force scene lighting).
for i,(x,y,z,rot) in enumerate(((-1.10,3.33,3.35,0), (1.15,3.33,3.35,0), (-5.42,-2.45,3.1,math.pi/2))):
    move_to(cube(f"DECOR_WallLamp_Bracket_{i}", (x,y,z), (.08,.08,.28), metal,.025,
                 rotation=(0,0,rot)), decor)
    move_to(sphere(f"DECOR_WallLamp_Glow_{i}", (x,y-.15 if y>3 else y,z+.28), .18,
                   warm_glow,(.8,.6,1.15),1), decor)

# Exterior flowerbeds, trees and mailbox.
for i,(x,y,s) in enumerate(((-5.7,-4.35,1.05),(-4.35,-4.55,.8),(-2.85,-4.52,.72),
                            (2.70,-4.55,.82),(4.15,-4.48,1.0),(5.55,-4.25,.88),
                            (-6.35,3.90,.72),(6.35,3.80,.78))):
    bush(f"ENV_Bush_{i:02d}",x,y,s,True)
for i,(x,y) in enumerate(((-8.70,2.15),(8.70,1.95))):
    move_to(cylinder(f"ENV_Tree_Stone_Collar_{i}",(x,y,.05),1.18,.16,stone_light,24),garden)
    move_to(cylinder(f"ENV_Tree_Trunk_{i}",(x,y,1.42),.25,2.75,dark_wood,12),garden)
    for layer in range(5):
        z=2.00+layer*.70
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=1.18-layer*.13, radius2=.16,
                                        depth=1.62, location=(x,y,z))
        tree=bpy.context.object; tree.name=f"ENV_Tree_Crown_{i}_{layer}"; assign(tree,leaf_dark if layer%2 else leaf)
        move_to(tree,garden)
move_to(cylinder("ENV_Mailbox_Post", (1.63,-4.62,.70), .10,1.34,dark_wood,10), garden)
move_to(cube("ENV_Mailbox_Box", (1.63,-4.62,1.48), (.34,.48,.30), red,.15), garden)
move_to(cube("ENV_Mailbox_Door", (1.63,-5.10,1.48), (.31,.025,.24), roof_light,.05), garden)
move_to(cube("ENV_Mailbox_Flag", (2.00,-4.62,1.70), (.04,.04,.34), red,.02), garden)
move_to(cube("ENV_Mailbox_FlagTop", (2.00,-4.62,2.00), (.18,.04,.10), red,.03), garden)

# Two-tier courtyard fountain.  Water is geometry, keeping the GLB self-contained.
fx, fy = 10.55, -4.35
move_to(cylinder("ENV_Fountain_Piazza", (fx,fy,-.005), 2.85,.10,stone_light,40), garden)
move_to(cylinder("ENV_Fountain_Foundation", (fx,fy,.12), 2.52,.24,stone_light,40), garden)
move_to(cylinder("ENV_Fountain_Lower_Basin", (fx,fy,.38), 2.18,.38,stone,40), garden)
move_to(cylinder("ENV_Fountain_Lower_Water", (fx,fy,.61), 1.88,.060,fountain_water,40), garden)
bpy.ops.mesh.primitive_torus_add(major_radius=2.02, minor_radius=.20, major_segments=40,
                                 minor_segments=8, location=(fx,fy,.54))
fountain_rim=bpy.context.object; fountain_rim.name="ENV_Fountain_Lower_Rim"; assign(fountain_rim,stone_light); move_to(fountain_rim,garden)
move_to(cylinder("ENV_Fountain_Pedestal", (fx,fy,1.43), .38,1.75,stone_light,24), garden)
move_to(cylinder("ENV_Fountain_Middle_Basin", (fx,fy,2.12), 1.30,.22,stone,32), garden)
move_to(cylinder("ENV_Fountain_Middle_Water", (fx,fy,2.26), 1.06,.05,fountain_water,32), garden)
bpy.ops.mesh.primitive_torus_add(major_radius=1.16, minor_radius=.15, major_segments=32,
                                 minor_segments=8, location=(fx,fy,2.28))
fountain_middle=bpy.context.object; fountain_middle.name="ENV_Fountain_Middle_Rim"; assign(fountain_middle,stone_light); move_to(fountain_middle,garden)
move_to(cylinder("ENV_Fountain_Upper_Stem", (fx,fy,2.80), .22,1.18,stone_light,20), garden)
move_to(cylinder("ENV_Fountain_Upper_Basin", (fx,fy,3.25), .70,.18,stone,28), garden)
move_to(cylinder("ENV_Fountain_Upper_Water", (fx,fy,3.36), .54,.045,fountain_water,28), garden)
move_to(sphere("ENV_Fountain_Finial", (fx,fy,3.86), .27,brass,(1,1,1.28),2),garden)
move_to(cylinder("ENV_Fountain_Water_Jet", (fx,fy,3.48), .065,.82,fountain_water,14),garden)
for i in range(12):
    a=i*math.tau/12
    move_to(sphere(f"ENV_Fountain_Droplet_{i}", (fx+math.cos(a)*.72,fy+math.sin(a)*.72,
             3.04-(i%3)*.20), .085,fountain_water,(.7,.7,1.6),1),garden)

# Expand the building without inflating its furniture, then distribute the garden
# over the larger plot.  Architectural meshes scale; furniture only moves apart.
HOUSE_X, HOUSE_Y = 1.24, 1.20
for obj in list(bpy.context.scene.objects):
    if obj.type not in {"MESH", "EMPTY"}:
        continue
    name=obj.name
    if name.startswith(("ARCH_","EXTERIOR_")):
        obj.location.x *= HOUSE_X
        obj.location.y *= HOUSE_Y
        obj.scale.x *= HOUSE_X
        obj.scale.y *= HOUSE_Y
    elif name.startswith(("FURN_","DECOR_")):
        if obj.parent is None:
            obj.location.x *= HOUSE_X
            obj.location.y *= HOUSE_Y
    elif name.startswith("ENV_") and name != "ENV_Grass_Island" and "Fountain" not in name:
        obj.location.x *= 1.42
        obj.location.y *= 1.36

# A simple sign identifies the root without depending on text/font meshes.
root = bpy.data.objects.new("PERSONAL_SPACE_COTTAGE_ROOT", None)
bpy.context.scene.collection.objects.link(root)
for obj in list(bpy.context.scene.objects):
    if obj != root and obj.parent is None and obj.type in {"MESH", "EMPTY"}:
        obj.parent = root

# Ground-contact origin and metadata useful to loaders.
root["asset_type"] = "personal_space"
root["style"] = "cozy_cutaway_cottage"
root["units"] = "meters"
root["recommended_spawn"] = "0,-2.3,0.9"
root["interior_toggle_prefixes"] = "EXTERIOR_Roof,EXTERIOR_Front_"

# Add camera and sun for the source/preview only; exclude them from the GLB export.
bpy.ops.object.light_add(type="AREA", location=(-4,-5,11))
key = bpy.context.object
key.name = "PREVIEW_Key"
key.data.energy = 2200
key.data.shape = "DISK"
key.data.size = 7
key.rotation_euler = (math.radians(24),0,math.radians(-30))
bpy.ops.object.light_add(type="AREA", location=(7,-1,7))
fill = bpy.context.object
fill.name = "PREVIEW_Fill"
fill.data.energy = 900
fill.data.size = 6
fill.rotation_euler = (math.radians(42),0,math.radians(108))
bpy.ops.object.light_add(type="AREA", location=(0,6,9))
rim = bpy.context.object
rim.name = "PREVIEW_Rim"
rim.data.energy = 1100
rim.data.size = 5
rim.rotation_euler = (math.radians(18),0,math.pi)

bpy.ops.object.camera_add(location=(31,-39,29))
camera = bpy.context.object
camera.name = "PREVIEW_Camera"
direction = Vector((0,0,2.2)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z","Y").to_euler()
camera.data.lens = 55
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT_PREVIEW)
scene.render.film_transparent = False
scene.world.color = (0.055,0.045,0.035)
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_percentage = 100

# Neutral studio floor is preview-only.
studio = cube("PREVIEW_Studio_Floor", (0,0,-.69), (18,18,.05), mat("PREVIEW_Mat",(.055,.045,.035),1.0))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.render.render(write_still=True)

# A second render verifies the expanded interior. These render flags do not alter
# the exported model; loaders may reproduce this view when the player enters.
for obj in bpy.context.scene.objects:
    if obj.name.startswith(("EXTERIOR_Roof","EXTERIOR_Front_")):
        obj.hide_render = True
scene.render.filepath = str(OUT_INTERIOR_PREVIEW)
bpy.ops.render.render(write_still=True)
for obj in bpy.context.scene.objects:
    obj.hide_render = False

# Export only asset hierarchy (no preview lights/camera/studio).
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for child in root.children_recursive:
    child.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_extras=True,
    export_apply=True,
)

mesh_count = len([o for o in root.children_recursive if o.type == "MESH"])
print(f"Created {OUT_GLB} ({mesh_count} meshes)")
print(f"Source: {OUT_BLEND}")
print(f"Preview: {OUT_PREVIEW}")
print(f"Interior preview: {OUT_INTERIOR_PREVIEW}")

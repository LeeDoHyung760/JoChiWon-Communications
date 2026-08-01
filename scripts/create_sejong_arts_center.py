import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "assets", "maps")
GLB = os.path.join(OUT, "sejong-arts-center.glb")
BLEND = os.path.join(OUT, "sejong-arts-center-source.blend")
PREVIEW = os.path.join(OUT, "sejong-arts-center-preview.png")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, rough=0.55, emission=None, strength=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True; bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1); bs.inputs["Metallic"].default_value=metallic
    bs.inputs["Roughness"].default_value=rough
    if emission:
        bs.inputs["Emission Color"].default_value=(*emission,1); bs.inputs["Emission Strength"].default_value=strength
    return m

STONE=mat("Gallery ivory limestone",(.72,.63,.53),rough=.52); HALL_FLOOR=mat("Matte warm gallery floor",(.68,.61,.52),rough=.78)
DARK=mat("Cutaway charcoal",(.035,.045,.06),metallic=.15,rough=.35); WOOD=mat("Walnut",(.16,.055,.025),rough=.48)
RED=mat("Theatre burgundy",(.23,.008,.012),rough=.58); GOLD=mat("Warm brass",(.56,.26,.07),metallic=.75,rough=.24)
BLACK=mat("Black",(.008,.008,.012),rough=.35); GLASS=mat("Glass",(.22,.38,.44),metallic=.05,rough=.12)
GREEN=mat("Foliage",(.025,.16,.045),rough=.75); SOIL=mat("Soil",(.075,.035,.015),rough=1)
WHITE=mat("Lettering",(.96,.90,.78),rough=.28); BLUE=mat("Digital blue",(.025,.12,.34),emission=(.02,.16,.65),strength=2)
PINK=mat("Performance pink",(.5,.035,.15),emission=(.5,.015,.11),strength=.35)
CREAM=mat("Gallery plaster",(.88,.83,.75),rough=.62); VEIN=mat("Marble inlay",(.28,.20,.15),metallic=.1,rough=.24)

def box(name, loc, scale, material, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=(scale[0]/2,scale[1]/2,scale[2]/2)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new("Soft edges","BEVEL"); mod.width=bevel; mod.segments=2
    o.data.materials.append(material); return o

def cyl(name, loc, radius, depth, material, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc); o=bpy.context.object; o.name=name; o.data.materials.append(material); return o

def text_obj(body, loc, size, material, extrude=.015, align="CENTER", rot=(math.pi/2,0,0)):
    bpy.ops.object.text_add(location=loc,rotation=rot); o=bpy.context.object; o.name="Sign_"+body; o.data.body=body; o.data.align_x=align
    o.data.size=size; o.data.extrude=extrude; o.data.bevel_depth=.006; o.data.materials.append(material); return o

def point(name, loc, energy=500, color=(1,.55,.3), radius=.35):
    d=bpy.data.lights.new(name,"POINT"); d.energy=energy; d.color=color; d.shadow_soft_size=radius
    o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); o.location=loc

def plant(loc, s=1):
    cyl("Planter",(loc[0],loc[1],.38*s),.34*s,.65*s,STONE)
    cyl("Soil",(loc[0],loc[1],.72*s),.28*s,.04*s,SOIL)
    for i in range(9):
        ang=i*2.399; length=(.65+.12*(i%3))*s
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.22*s,location=(loc[0]+math.cos(ang)*.22*s,loc[1]+math.sin(ang)*.22*s,.95*s+length*.25))
        leaf=bpy.context.object; leaf.name="Plant foliage"; leaf.scale=(.45,1.5,2.1); leaf.rotation_euler=(math.sin(ang)*.65,math.cos(ang)*.65,ang); leaf.data.materials.append(GREEN)

# Foundation and cutaway perimeter
box("Building foundation",(0,0,-.35),(28,19,.7),DARK,.25)
box("Lobby matte stone floor",(5.0,1.0,.05),(17.4,16.2,.25),HALL_FLOOR,.05)
box("Auditorium floor",(-8.6,0,.12),(9.5,15.8,.38),WOOD,.08)
for name,loc,sc in [
    ("Back wall",(0,8.45,2.9),(28,.55,5.8)),("Right wall",(13.7,0,2.9),(.55,17,5.8)),
    ("Left auditorium wall",(-13.7,0,2.9),(.55,17,5.8)),("Hall divider",(-3.65,2.1,2.65),(.42,12.5,5.3)),
    ("Front lobby wing",(8.5,-7.7,1.7),(10.5,.5,3.4)),("Front hall wing",(-10.5,-7.7,1.7),(6.4,.5,3.4))]: box(name,loc,sc,STONE,.16)

# Gallery-grade architectural detailing: pilasters and luminous cornice
for x in [-2.7,.25,3.2,6.15,9.1,12.05]:
    box("Gallery pilaster",(x,8.05,2.85),(.34,.38,5.2),CREAM,.07)
    box("Pilaster brass foot",(x,7.80,.32),(.52,.16,.24),GOLD,.025)
box("Luminous gallery cornice",(5.0,7.78,5.35),(16.4,.22,.16),WHITE,.04)
box("Luminous side cornice",(13.34,.2,5.35),(.22,15.2,.16),WHITE,.04)

# Lobby poster gallery
poster_cols=[(.03,.07,.2),(.55,.06,.18),(.62,.33,.12),(.02,.08,.2),(.25,.08,.34)]
poster_titles=["SEJONG ORCHESTRA","SPRING FESTIVAL","DANCE & LIGHT","NIGHT CONCERT","ARTS GALA"]
# Five posters centered precisely in the five bays between the six pilasters.
for i,x in enumerate([-1.225,1.725,4.675,7.625,10.575]):
    # 1.62 m width leaves a clear 0.66 m margin from each neighboring pilaster.
    box("Poster frame",(x,8.08,3.18),(1.62,.18,2.72),BLACK,.04)
    pm=mat("Poster %d"%i,poster_cols[i],rough=.42,emission=poster_cols[i],strength=.15)
    box("Poster art",(x,7.96,3.18),(1.40,.05,2.50),pm,.02)
    text_obj(poster_titles[i],(x,7.91,3.30),.145,WHITE,.006)
    text_obj("SEJONG ARTS CENTER",(x,7.90,2.42),.085,WHITE,.004)
    point("Poster spotlight",(x,6.85,5.25),260,(1,.58,.32),.25)

# Minimal museum sculptures on stone plinths
for x,y,kind in [(1.1,3.3,0),(10.7,2.0,1)]:
    box("Sculpture plinth",(x,y,.62),(1.15,1.15,1.15),CREAM,.08)
    if kind==0:
        bpy.ops.mesh.primitive_torus_add(major_radius=.48,minor_radius=.12,major_segments=32,minor_segments=10,location=(x,y,1.72),rotation=(math.pi/2,.25,0))
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.52,location=(x,y,1.65)); bpy.context.object.scale=(.65,.65,1.45)
    sculpture=bpy.context.object; sculpture.name="Brass gallery sculpture"; sculpture.data.materials.append(GOLD)
    point("Sculpture spotlight",(x,y,4.9),290,(1,.78,.56),.2)

# Entrance signage and doors
text_obj("SEJONG ARTS CENTER",(-8.2,8.12,4.15),.42,WHITE,.02)
text_obj("PERFORMING ARTS",(-8.2,8.11,3.65),.16,WHITE,.01)
for x in [-11.8,-10.15,-8.5,-6.85]: box("Auditorium door",(x,-7.42,1.55),(1.42,.18,2.75),WOOD,.05)
for x in [11.8,13.2]: box("Lobby door",(13.42,x-12.5,1.55),(.18,1.15,2.75),WOOD,.04)

# Central planter / seating feature
cyl("Central bench base",(5.5,.45,.33),2.05,.65,STONE,48); cyl("Bench inset",(5.5,.45,.68),1.42,.18,WOOD,48)
cyl("Central soil",(5.5,.45,.8),.95,.25,SOIL,40); plant((5.5,.45),1.35)
for a in range(0,360,60):
    ang=math.radians(a); box("Radial stool",(5.5+math.cos(ang)*2.25,.45+math.sin(ang)*2.25,.34),(.68,.68,.62),STONE,.2)

# Lobby benches
for y in [-5.8,5.45]: box("Lobby bench",(11.5,y,.42),(2.35,.65,.48),WOOD,.1)
for p in [(11.7,-4.5),(10.6,-6.3),(11.8,5.9),(-1.8,6.4)]: plant(p,.72)

# Auditorium stage, curtain, piano, lighting
box("Stage",(-8.6,5.7,.68),(9.0,3.5,1.05),WOOD,.18)
box("Stage backdrop",(-8.6,7.65,3.4),(9.1,.25,4.8),BLACK,.08)
for x in [-12.6,-11.7,-5.5,-4.65]: box("Burgundy curtain",(x,7.25,3.5),(.75,.38,4.9),RED,.14)
text_obj("SEJONG",(-8.6,7.35,3.7),.65,PINK,.025)
box("Piano body",(-11.35,5.55,1.3),(1.65,.9,.42),BLACK,.2); box("Piano lid",(-11.2,5.62,1.62),(1.8,.8,.08),BLACK,.05)
for x in [-11.2,-9.45,-7.7,-5.95]: point("Stage light",(x,5.2,4.9),420,(.8,.05,.55),.2)

# Raked audience floor and seats
for row in range(7):
    y=3.25-row*1.28; z=.78+row*.13
    box("Audience riser",(-8.65,y-.5,z-.42),(8.65,1.3,.28),DARK,.04)
    count=7 if row<2 else 8
    for col in range(count):
        x=-12.0+col*(.97 if count==8 else 1.08)
        box("Seat cushion",(x,y,z),( .72,.62,.25),RED,.11)
        # Backrest sits behind the viewer so every seat faces the SEJONG stage (+Y).
        box("Seat back",(x,y-.24,z+.55),(.72,.18,1.05),RED,.12)
        box("Seat frame",(x,y,z-.35),(.08,.42,.72),GOLD,.03)

# Warm wall sconces and ceiling edge
for y in [-5.4,-2.6,.2,3.0,5.8]:
    box("Wall sconce",(-3.88,y,2.8),(.16,.22,.6),GOLD,.05); point("Sconce glow",(-4.12,y,2.9),130,(1,.35,.12),.18)
for x in [-1,2,5,8,11]:
    point("Lobby downlight",(x,4.2,5.25),520,(1,.82,.65),.5)
    point("Lobby downlight",(x,-2.7,5.25),440,(1,.86,.72),.5)

# Rotate the complete authored map 180 degrees around its center.
for authored in list(bpy.context.scene.objects):
    x,y=authored.location.x,authored.location.y
    authored.location.x=-x; authored.location.y=-y
    authored.rotation_euler.z+=math.pi

# Camera, world, and render (rotated with the map presentation direction)
bpy.ops.object.camera_add(location=(-27,31,25)); cam=bpy.context.object; cam.name="Presentation Camera"
def track(obj, target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
track(cam,(0,.35,1.1)); cam.data.lens=47; bpy.context.scene.camera=cam
world=bpy.context.scene.world or bpy.data.worlds.new("World"); bpy.context.scene.world=world; world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.006,.009,.015,1); world.node_tree.nodes["Background"].inputs["Strength"].default_value=.18
bpy.ops.object.light_add(type='AREA',location=(-4,7,17)); bpy.context.object.data.energy=1900; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=10; track(bpy.context.object,(0,-1,0))
bpy.ops.object.light_add(type='AREA',location=(15,5,10)); bpy.context.object.data.energy=950; bpy.context.object.data.color=(.35,.5,1); bpy.context.object.data.size=8; track(bpy.context.object,(7,-1,1))

scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1280; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=PREVIEW
scene.render.film_transparent=False; scene.render.image_settings.color_mode='RGBA'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_yup=True)
bpy.ops.render.render(write_still=True)
print("CREATED",GLB,BLEND,PREVIEW)

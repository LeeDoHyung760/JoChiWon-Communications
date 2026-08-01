import bpy, math, os
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,"src","assets","maps")
GLB=os.path.join(OUT,"food-experience-map.glb")
BLEND=os.path.join(OUT,"food-experience-map-source.blend")
PREVIEW=os.path.join(OUT,"food-experience-map-preview.png")
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def mat(name,c,rough=.6,metal=0,emit=None,strength=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True; p=m.node_tree.nodes["Principled BSDF"]
 p.inputs["Base Color"].default_value=(*c,1); p.inputs["Roughness"].default_value=rough; p.inputs["Metallic"].default_value=metal
 if emit: p.inputs["Emission Color"].default_value=(*emit,1); p.inputs["Emission Strength"].default_value=strength
 return m
STONE=mat("Warm paving",(.48,.41,.31),.82); BORDER=mat("Island border",(.36,.28,.19),.75)
GRASS=mat("Meadow",(.22,.39,.08),.9); DARKGRASS=mat("Shrub",(.08,.26,.035),.95); LEAF=mat("Tree foliage",(.15,.36,.055),.9)
WOOD=mat("Cafe wood",(.29,.17,.08),.68); DARKWOOD=mat("Dark timber",(.12,.07,.035),.75); CREAM=mat("Canvas cream",(.88,.70,.43),.72)
RED=mat("Red food truck",(.48,.075,.035),.55); ORANGE=mat("Orange truck",(.61,.24,.045),.58); GREEN=mat("Green truck",(.035,.30,.12),.62)
WHITE=mat("Awning white",(.92,.86,.72),.68); BLACK=mat("Tyre",(.018,.018,.014),.82); METAL=mat("Metal",(.24,.25,.23),.28,.7)
GLASS=mat("Window",(.055,.14,.15),.18,.15); WATER=mat("Lake water",(.08,.43,.56),.24,.05)
GOLD=mat("Lamp brass",(.55,.29,.08),.3,.55); BLUE=mat("Portal glow",(.02,.23,.85),.2,emit=(.02,.25,1),strength=5)
SIGN=mat("Sign cream",(.67,.48,.27),.58); FLOWER=mat("Flower",(.75,.34,.14),.7)
YELLOW=mat("Headlight",(1,.72,.18),.2,emit=(1,.55,.08),strength=1.5); REDLIGHT=mat("Tail light",(.7,.015,.01),.25,emit=(.8,.01,.005),strength=.8)

def box(n,loc,size,ma,bev=.08,rot=0):
 bpy.ops.mesh.primitive_cube_add(location=loc,rotation=(0,0,rot)); o=bpy.context.object; o.name=n; o.scale=(size[0]/2,size[1]/2,size[2]/2)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bev: q=o.modifiers.new("Rounded edges","BEVEL"); q.width=bev; q.segments=2
 o.data.materials.append(ma); return o
def cyl(n,loc,r,d,ma,v=20,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=loc,rotation=rot); o=bpy.context.object; o.name=n; o.data.materials.append(ma); return o
def text(body,loc,size,ma,rot=(math.pi/2,0,0)):
 bpy.ops.object.text_add(location=loc,rotation=rot); o=bpy.context.object; o.name="Label_"+body; o.data.body=body; o.data.align_x='CENTER'; o.data.align_y='CENTER'; o.data.size=size; o.data.extrude=.018; o.data.bevel_depth=.006; o.data.materials.append(ma); return o
def point(n,loc,e=110,color=(1,.52,.18),radius=.25):
 d=bpy.data.lights.new(n,'POINT'); d.energy=e; d.color=color; d.shadow_soft_size=radius; o=bpy.data.objects.new(n,d); bpy.context.collection.objects.link(o); o.location=loc
def tree(x,y,s=1):
 cyl("Tree trunk",(x,y,.75*s),.16*s,1.5*s,DARKWOOD,12)
 for dx,dy,dz,r in [(0,0,1.65,.72),(.35,.05,1.55,.52),(-.3,.1,1.5,.5),(0,-.3,1.45,.52)]:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r*s,location=(x+dx*s,y+dy*s,dz*s)); bpy.context.object.name="Tree crown"; bpy.context.object.data.materials.append(LEAF)
def shrub(x,y,s=.55):
 for i in range(4):
  a=i*1.57; bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.38*s,location=(x+math.cos(a)*.2*s,y+math.sin(a)*.2*s,.28*s)); bpy.context.object.name="Shrub"; bpy.context.object.data.materials.append(DARKGRASS)
def chair(x,y,a=0):
 box("Cafe chair seat",(x,y,.44),(.48,.48,.12),WOOD,.06,a); box("Cafe chair back",(x-math.sin(a)*.2,y+math.cos(a)*.2,.78),(.46,.12,.72),WOOD,.06,a)
def table(x,y):
 cyl("Table pedestal",(x,y,.48),.12,.82,METAL,16); cyl("Round table",(x,y,.94),.92,.16,WOOD,32)
 cyl("Parasol pole",(x,y,1.65),.055,1.55,METAL,12); cyl("Parasol",(x,y,2.45),1.25,.16,CREAM,24)
 for a in [0,math.pi/2,math.pi,3*math.pi/2]: chair(x+math.sin(a)*1.28,y-math.cos(a)*1.28,a)
 box("Table tray",(x+.25,y,.99),(.48,.30,.045),DARKWOOD,.025); cyl("Cup",(x+.08,y,1.12),.09,.25,WHITE,12); cyl("Cup",(x+.35,y+.05,1.11),.08,.23,CREAM,12)
def wheel(x,y,z,rot):
 cyl("Truck wheel",(x,y,z),.38,.24,BLACK,20,rot); cyl("Wheel hub",(x,y,z),.15,.26,METAL,16,rot)
def truck(name,x,y,color,angle,label):
 body=box(name,(x,y,1.08),(3.75,1.72,1.72),color,.2,angle)
 # local-to-world helper
 def p(lx,ly,lz): return (x+lx*math.cos(angle)-ly*math.sin(angle),y+lx*math.sin(angle)+ly*math.cos(angle),lz)
 box(name+" cab",p(-1.65,0,1.03),(1.15,1.68,1.58),color,.2,angle)
 box(name+" windshield",p(-2.12,0,1.43),(.08,1.23,.65),GLASS,.04,angle)
 box(name+" front bumper",p(-2.28,0,.58),(.18,1.58,.22),METAL,.05,angle)
 for sy in [-.55,.55]:
  box(name+" headlight",p(-2.39,sy,.83),(.07,.28,.24),YELLOW,.05,angle); box(name+" side mirror",p(-1.85,sy*1.48,1.58),(.16,.18,.22),METAL,.05,angle); box(name+" tail light",p(2.0,sy,.72),(.08,.22,.28),REDLIGHT,.04,angle)
 box(name+" service window",p(.35,-.875,1.35),(1.7,.06,.72),GLASS,.02,angle)
 box(name+" counter",p(.35,-1.02,.93),(1.95,.38,.16),WOOD,.04,angle)
 box(name+" menu panel",p(1.55,-.93,1.34),(.62,.07,.92),DARKWOOD,.035,angle); text("MENU",p(1.55,-.98,1.48),.13,WHITE,rot=(math.pi/2,0,angle))
 box(name+" roof sign",p(.45,0,2.1),(2.15,.62,.48),color,.08,angle); text(label,p(.45,-.33,2.12),.22,WHITE,rot=(math.pi/2,0,angle))
 # striped awning slats
 for i in range(7):
  lx=-.65+i*.34; box(name+" awning stripe",p(lx,-1.04,1.82),(.28,.52,.11),WHITE if i%2 else color,.025,angle)
 for lx in [-1.25,1.25]:
  wx,wy,wz=p(lx,-.88,.46); wheel(wx,wy,wz,(math.pi/2,angle,0)); wx,wy,wz=p(lx,.88,.46); wheel(wx,wy,wz,(math.pi/2,angle,0))

# Raised island, paths and water edge
cyl("Map island",(0,0,-.45),11.7,.9,BORDER,8,rot=(0,0,math.pi/8))
cyl("Grass island",(0,0,.02),11.25,.18,GRASS,8,rot=(0,0,math.pi/8))
cyl("Central plaza",(0,-.25,.18),6.5,.22,STONE,48)
for radius in [2.9,4.55,6.05]:
 bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.025,major_segments=64,minor_segments=6,location=(0,-.25,.305)); bpy.context.object.name="Plaza paving ring"; bpy.context.object.data.materials.append(BORDER)
box("South walkway",(0,-8.1,.2),(3.1,7.0,.24),STONE,.35)
box("North walkway",(0,6.5,.2),(3.0,4.0,.24),STONE,.35)
box("Lake",(6.8,7.8,.17),(9.0,5.0,.18),WATER,.8,rot=-.12)
for i in range(6): box("Water ripple",(4.0+i*.8,7.35+i*.12,.29),(2.6,.035,.025),WHITE,.01,rot=-.12)
for i in range(7):
 x=3.5+i*1.15; box("Lake railing",(x,5.85+i*.08,.65),(.08,.08,.95),WOOD,.02); box("Lake rail",(x,5.84+i*.08,1.0),(1.2,.08,.08),WOOD,.02)
for x,y,r in [(3.2,6.25,.38),(4.3,6.5,.28),(6.4,6.75,.42),(8.4,6.95,.32)]:
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(x,y,.32)); bpy.context.object.name="Lakeside rock"; bpy.context.object.scale=(1.5,.8,.55); bpy.context.object.data.materials.append(BORDER)

# Cafe building at the north-west
box("Cafe building",(-6.0,6.1,1.45),(4.5,3.4,2.75),WOOD,.15,rot=-.12)
box("Cafe front glass",(-5.75,4.52,1.45),(2.7,.12,1.65),GLASS,.04,rot=-.12)
for x in [-6.75,-5.75,-4.75]: box("Cafe window mullion",(x,4.43,1.45),(.08,.16,1.7),DARKWOOD,.02,rot=-.12)
box("Cafe entrance door",(-7.3,4.66,1.3),(1.0,.18,2.15),GLASS,.05,rot=-.12)
box("Cafe roof",(-6.0,6.15,3.0),(5.0,3.9,.35),DARKWOOD,.12,rot=-.12)
box("Cafe sign",(-5.75,4.32,2.45),(2.25,.18,.55),SIGN,.07,rot=-.12); text("FOOD MUSEUM",(-5.7,4.19,2.47),.25,WHITE,rot=(math.pi/2,0,-.12))
for i in range(4): box("Cafe stair",(-5.4,3.65-i*.28,.18+i*.12),(2.6,.5,.22),STONE,.04,rot=-.12)

# Three themed trucks and central dining
truck("Street food truck",6.0,2.8,RED,-.42,"FOOD TRUCK")
truck("Dessert truck",-6.7,-1.0,ORANGE,.32,"DESSERT")
truck("Local food truck",6.1,-4.5,GREEN,-.25,"LOCAL FOOD")
table(-1.7,.5); table(2.0,-1.15)
box("Central planter",(.3,2.55,.48),(1.5,1.5,.75),BORDER,.18); shrub(.3,2.55,1.2)
for cx,cy in [(-4.8,4.4),(4.8,4.6),(-5.2,-3.4),(4.6,-5.0)]:
 box("Flower bed",(cx,cy,.25),(1.55,.75,.34),BORDER,.18)
 for j in range(5):
  fx=cx-.5+j*.25; cyl("Flower stem",(fx,cy,.55),.025,.42,DARKGRASS,8); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.11,location=(fx,cy,.78)); bpy.context.object.name="Flower bloom"; bpy.context.object.data.materials.append(FLOWER)

# Lamps and festoon strings
lamp_positions=[(-5,-4.8),(-2.5,-5.6),(2.4,-5.6),(5.0,-4.4),(-5.3,2.2),(-2.7,3.5),(2.7,3.6),(5.5,1.0)]
for x,y in lamp_positions:
 cyl("Lamp post",(x,y,1.5),.065,2.8,METAL,12); cyl("Lamp cap",(x,y,2.93),.23,.18,GOLD,16); point("Lamp glow",(x,y,2.82),95,(1,.48,.17),.2)
for a,b in [((-5.3,2.2),(-2.5,-5.6)),((-2.7,3.5),(2.4,-5.6)),((2.7,3.6),(5,-4.4)),((-5.3,2.2),(5.5,1.0))]:
 for i in range(9):
  t=i/8; x=a[0]*(1-t)+b[0]*t; y=a[1]*(1-t)+b[1]*t; z=2.72-.55*math.sin(math.pi*t)
  cyl("Festoon bulb",(x,y,z),.075,.12,GOLD,10); point("Festoon glow",(x,y,z),32,(1,.38,.1),.08)

# Portal and information board
for r,z in [(1.15,.30),(.82,.36),(.48,.42)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.065,major_segments=32,minor_segments=8,location=(0,-8.5,z),rotation=(0,0,0)); bpy.context.object.name="Portal ring"; bpy.context.object.data.materials.append(BLUE)
point("Portal light",(0,-8.5,.75),520,(.05,.25,1),1.2)
box("Menu board",(-4.2,-3.9,1.0),(1.05,.22,1.85),DARKWOOD,.07,rot=-.08); text("MENU",(-4.15,-4.04,1.25),.24,WHITE,rot=(math.pi/2,0,-.08))

# Landscaping frame
for x,y,s in [(-8.4,-5.7,1.1),(-7.7,1.5,.9),(-8,7,.95),(-2.8,7.8,.9),(1.3,8.5,1.05),(8.3,5.2,.8),(9,0,.8),(8,-7,.9),(3.7,-8.2,.75),(-4.2,-8,.8)]: tree(x,y,s)
for x,y in [(-8,-3),(-6.8,4),(-3.8,6.5),(3.8,6),(7,5),(8,2),(8,-2),(6,-7),(2,-7.5),(-2,-7.6),(-6,-6)]: shrub(x,y,.9)

# Camera and rendering
def track(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(19,-24,25)); cam=bpy.context.object; cam.name="Isometric Camera"; cam.data.type='ORTHO'; cam.data.ortho_scale=28; track(cam,(0,0,.5)); bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-6,-8,24)); bpy.context.object.data.energy=1900; bpy.context.object.data.size=14; track(bpy.context.object,(0,0,0))
world=bpy.context.scene.world or bpy.data.worlds.new("World"); bpy.context.scene.world=world; world.use_nodes=True; world.node_tree.nodes["Background"].inputs["Color"].default_value=(.82,.88,.80,1); world.node_tree.nodes["Background"].inputs["Strength"].default_value=.7
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=900; sc.render.resolution_y=1000; sc.render.resolution_percentage=100; sc.render.image_settings.file_format='PNG'; sc.render.filepath=PREVIEW; sc.view_settings.look='AgX - Medium High Contrast'
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_yup=True)
bpy.ops.render.render(write_still=True)
print("CREATED",GLB,BLEND,PREVIEW)

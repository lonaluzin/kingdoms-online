"""Original Kingdoms assets. Run with Blender --background --python build_assets.py.
Z is up in Blender; exported glTF uses Y up. No imported or generated image assets.
"""
import bpy, math, random, os, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT=os.path.join(ROOT,'dist','assets'); os.makedirs(OUT,exist_ok=True)
random.seed(814)
def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions): bpy.data.actions.remove(a)
def material(name,color,texture=None,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.72;bs.inputs['Metallic'].default_value=metal
 if texture:
  img=bpy.data.images.new(name+'_paint',width=128,height=128);pixels=[]
  for y in range(128):
   for x in range(128):
    noise=random.random()*.06
    if texture=='wood': pattern=.9+.07*math.sin(x*.4+math.sin(y*.05))
    elif texture=='stone': pattern=.84 if y%24<2 or (x+(y//24%2)*16)%32<2 else .97
    elif texture=='cloth': pattern=.93+.025*((x+y)%3)
    elif texture=='roof': pattern=.78 if y%16<2 or (x+(y//16%2)*10)%20<2 else .98
    else: pattern=.94
    pixels.extend([min(1,c*(pattern+noise)) for c in color]+[1])
  img.pixels=pixels;img.pack();node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;m.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
 return m
M={k:material(k,c,t,metal) for k,c,t,metal in [
 ('stone',(.49,.52,.43),'stone',0),('plaster',(.76,.69,.5),'stone',0),('wood',(.32,.20,.105),'wood',0),('boards',(.56,.38,.18),'wood',0),('roof',(.38,.17,.11),'roof',0),('slate',(.16,.27,.31),'roof',0),('cloth',(.25,.43,.38),'cloth',0),('canvas',(.54,.38,.22),'cloth',0),('steel',(.48,.57,.60),None,.6),('darksteel',(.16,.22,.25),None,.55),('leather',(.24,.13,.065),'wood',0),('skin',(.66,.44,.28),None,0),('gold',(.71,.53,.22),None,.35),('dark',(.08,.12,.105),None,0),('wheat',(.69,.53,.22),None,0),('rock',(.30,.37,.33),'stone',0),('snow',(.69,.74,.68),None,0),('glow',(.10,.68,.49),None,0) ]}
M['glow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.1,.9,.6,1);M['glow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2
parts=[];weights={}
def finish(o,name,mat,bone=None,bevel=0):
 o.name=name;o.data.materials.append(M[mat]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Crafted edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=mat in ['steel','skin','leather']
 if not o.data.uv_layers:
  uv=o.data.uv_layers.new(name='UVMap')
  for face in o.data.polygons:
   axis=max(range(3),key=lambda a:abs(face.normal[a]));axes=[a for a in range(3) if a!=axis]
   for index in face.loop_indices:
    v=o.data.vertices[o.data.loops[index].vertex_index].co;uv.data[index].uv=(v[axes[0]]*.5,v[axes[1]]*.5)
 if bone:vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
 parts.append(o);return o
def box(name,loc,size,mat,bone=None,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;return finish(o,name,mat,bone,bevel)
def sphere(name,loc,size,mat,bone=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc);o=bpy.context.object;o.scale=size;return finish(o,name,mat,bone)
def cylinder(name,a,b,r,mat,bone=None,vertices=12,r2=None):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return finish(o,name,mat,bone,.012)
def roof(name,x,y,z,w,d,h,mat='roof'):
 verts=[(-w/2,-d/2,0),(w/2,-d/2,0),(w/2,d/2,0),(-w/2,d/2,0),(0,-d/2,h),(0,d/2,h)]
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)]);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=(x,y,z);bpy.context.view_layer.objects.active=o;o.select_set(True);return finish(o,name,mat)
def house(w=1.8,d=1.6,h=1.6,roofmat='roof'):
 box('foundation',(0,0,.12),(w+.14,d+.14,.24),'stone')
 box('plaster',(0,0,h/2+.15),(w,d,h),'plaster')
 roof('gable_roof',0,0,h+.15,w+.35,d+.35,.85,roofmat)
 for x in [-w/2+.06,w/2-.06]:box('timber_corner',(x,-d/2-.02,h/2+.15),(.09,.08,h),'wood')
 box('beam',(0,-d/2-.035,.6),(w,.07,.1),'wood');box('door',(-w*.22,-d/2-.05,.68),(.42,.08,1.05),'wood')
 for x in [-w*.3,w*.3]:
  box('window_inset',(x,-d/2-.06,h*.8),(.26,.035,.32),'dark')
  box('window_sill',(x,-d/2-.09,h*.8-.19),(.34,.13,.05),'boards')
  box('window_frame',(x,-d/2-.085,h*.8),(.035,.04,.34),'boards')
 box('chimney',(w*.28,d*.2,h+.6),(.22,.25,.75),'stone')
def export(name,rig=None):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
 scene.world.color=(.18,.21,.20)
 bpy.ops.object.select_all(action='SELECT')
 if rig:
  meshes=[o for o in parts if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
  for o in meshes:o.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();skin=bpy.context.object;skin.name=name+'_skin'
  mod=skin.modifiers.new('Armature','ARMATURE');mod.object=rig;skin.parent=rig
  rig.animation_data.action=None
  for track in rig.animation_data.nla_tracks:track.mute=False
  scene.frame_set(0)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),name+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_yup=True)
 if rig:
  for track in rig.animation_data.nla_tracks:track.mute=track.name!='idle'
  scene.frame_set(1)
  bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),name+'.blend'))
def begin():
 global parts;reset();parts=[]
def armature(bones):
 data=bpy.data.armatures.new('Rig');rig=bpy.data.objects.new('Rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,head,tail,parent in bones:
  b=data.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=data.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');rig.animation_data_create();return rig
def animations(rig,horse=False,beast=False,ranged=False):
 scene=bpy.context.scene;scene.render.fps=30
 for mode,frames in [('idle',60),('walk',30),('run',22),('attack',30),('hit',12),('death',36)]:
  action=bpy.data.actions.new(mode);rig.animation_data.action=action
  for frame in range(1,frames+1,3):
   phase=(frame-1)/(frames-1)*2*math.pi;t=(frame-1)/(frames-1)
   for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
   if mode in ['walk','run']:
    for side,sgn in [('L',1),('R',-1)]:
     if not horse and not beast and 'thighL' in rig.pose.bones:
      rig.pose.bones['thigh'+side].rotation_euler.x=math.sin(phase)*.5*sgn;rig.pose.bones['shin'+side].rotation_euler.x=max(0,-math.sin(phase)*sgn)*.65
      rig.pose.bones['arm'+side].rotation_euler.x=-math.sin(phase)*.25*sgn
     elif horse or beast:
      for n in ['front'+side,'rear'+side]:rig.pose.bones[n].rotation_euler.x=math.sin(phase+(0 if n.startswith('front') else math.pi))*.38*sgn
    if horse:
     for side,sgn in [('L',1),('R',-1)]:
      for n in ['frontShin'+side,'rearShin'+side]:rig.pose.bones[n].rotation_euler.x=max(0,-math.sin(phase)*sgn)*.55
    rig.pose.bones['root'].location.y=abs(math.sin(phase))*(.035 if beast else .025)
   elif mode=='attack':
    if beast:rig.pose.bones['head'].rotation_euler.x=math.sin(phase)*.3
    elif ranged:
     rig.pose.bones['armL'].rotation_euler.x=-.95;rig.pose.bones['foreL'].rotation_euler.x=-.35
     rig.pose.bones['armR'].rotation_euler.x=-.95+math.sin(phase)*.15;rig.pose.bones['foreR'].rotation_euler.x=-.75-math.sin(math.pi*t)*.3
    else:rig.pose.bones['armR'].rotation_euler.x=-.4-math.sin(math.pi*t)*.95;rig.pose.bones['foreR'].rotation_euler.x=-.3;rig.pose.bones['spine'].rotation_euler.z=math.sin(phase)*.12
   elif mode=='idle':rig.pose.bones['spine'].rotation_euler.x=math.sin(phase)*.012
   elif mode=='hit':rig.pose.bones['root'].rotation_euler.x=-math.sin(math.pi*t)*.2
   elif mode=='death':rig.pose.bones['root'].rotation_euler.x=min(1,t*1.5)*1.5;rig.pose.bones['root'].location.y=t*.12
   for b in rig.pose.bones:b.keyframe_insert('rotation_euler',frame=frame);b.keyframe_insert('location',frame=frame)
  # Explicit terminal frame makes exported loops closed and one-shots complete.
  scene.frame_set(1 if mode in ['idle','walk','run'] else frames-2)
  for b in rig.pose.bones:b.keyframe_insert('rotation_euler',frame=frames);b.keyframe_insert('location',frame=frames)
  track=rig.animation_data.nla_tracks.new();track.name=mode;track.strips.new(mode,1,action);track.mute=True
  rig.animation_data.action=None
 for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
def soldier(kind,banner=False):
 begin();rider=kind=='knight';lift=.44 if rider else 0
 bones=[('root',(0,0,0),(0,0,.25),None),('spine',(0,0,.9+lift),(0,0,1.4+lift),'root'),('head',(0,0,1.4+lift),(0,0,1.85+lift),'spine')]
 for side,x in [('L',-.28),('R',.28)]:
  bones += [('arm'+side,(x,0,1.4+lift),(x,0,1.1+lift),'spine'),('fore'+side,(x,0,1.1+lift),(x,-.04,.86+lift),'arm'+side),('thigh'+side,(x*.5,0,.9+lift),(x*1.3,-.25,1.10) if rider else (x*.5,0,.51),'root'),('shin'+side,(x*1.3,-.25,1.10) if rider else (x*.5,0,.51),(x*1.3,-.06,.76) if rider else (x*.5,-.04,.14),'thigh'+side)]
 if rider:
  for side,x in [('L',-.24),('R',.24)]:
   for name,y in [('front',-.52),('rear',.5)]:
    bones.append((name+side,(x,y,.84),(x,y-.08,.46),'root'));bones.append((name+'Shin'+side,(x,y-.08,.46),(x,y,.12),name+side))
 rig=armature(bones)
 box('boots_pelvis',(0,0,.85+lift),(.42,.3,.22),'darksteel','root')
 sphere('tunic',(0,0,1.18+lift),(.26,.17,.33),'cloth','spine')
 if kind not in ['archer','crossbow']:sphere('cuirass',(0,-.10,1.2+lift),(.27,.10,.28),'steel','spine')
 sphere('face',(0,-.035,1.62+lift),(.13,.12,.17),'skin','head')
 sphere('helmet',(0,.015,1.73+lift),(.17,.15,.14),'cloth' if kind=='archer' else 'steel','head')
 box('belt',(0,-.01,.95+lift),(.46,.33,.055),'leather','spine');box('buckle',(0,-.19,.95+lift),(.09,.025,.08),'gold','spine')
 for x in [-.045,.045]:sphere('eye',(x,-.153,1.64+lift),(.013,.012,.012),'dark','head')
 cylinder('helmet_ridge',(0,-.13,1.78+lift),(0,.12,1.79+lift),.012,'gold','head')
 box('brow',(0,-.135,1.69+lift),(.28,.035,.07),'darksteel','head')
 if rider:box('crest',(0,.03,1.87+lift),(.05,.25,.22),'cloth','head')
 for side,x in [('L',-.28),('R',.28)]:
  sphere('pauldron'+side,(x,0,1.4+lift),(.105,.13,.12),'steel','arm'+side)
  cylinder('upper_arm'+side,(x,0,1.37+lift),(x,0,1.11+lift),.07,'cloth','arm'+side)
  cylinder('forearm'+side,(x,0,1.1+lift),(x,-.04,.89+lift),.065,'steel','fore'+side)
  sphere('hand'+side,(x,-.04,.87+lift),(.075,.065,.08),'skin','fore'+side)
  tx=x*1.3 if rider else x*.5;knee=(tx,-.25,1.10) if rider else (tx,0,.51);ankle=(tx,-.06,.76) if rider else (tx,0,.17)
  cylinder('thigh'+side,(x*.5,0,.85+lift),knee,.095,'darksteel','thigh'+side)
  cylinder('shin'+side,knee,ankle,.075,'steel','shin'+side)
  box('boot'+side,(tx,-.12,.72) if rider else (tx,-.075,.12),(.16,.27,.20),'leather','shin'+side)
 if banner:
  cylinder('standard_pole',(.28,-.04,.65+lift),(.28,-.04,2.8+lift),.022,'boards','foreR')
  box('standard_cloth',(.54,-.04,2.53+lift),(.5,.025,.38),'cloth','foreR')
 elif kind in ['spear','knight']:
  cylinder('spear',(.28,-.04,.38+lift),(.28,-.04,2.23+lift),.024,'boards','foreR')
  cylinder('spearhead',(.28,-.04,2.23+lift),(.28,-.04,2.52+lift),.075,'steel','foreR',r2=0)
 elif kind in ['archer','crossbow']:
  if kind=='archer':
   for i in range(8):
    a=-1.1+i*.275;b=a+.275;cylinder('bow',(.28,-.12+math.cos(a)*.25,1.12+lift+math.sin(a)*.35),(.28,-.12+math.cos(b)*.25,1.12+lift+math.sin(b)*.35),.024,'boards','foreR')
   cylinder('bowstring',(.28,0,.81+lift),(.28,0,1.43+lift),.007,'canvas','foreR')
  else:box('crossbow',(.28,-.17,1.03+lift),(.48,.08,.07),'boards','foreR');box('stock',(.28,-.17,1.03+lift),(.06,.45,.08),'wood','foreR')
 else:
  box('sword',(.28,-.04,1.22+lift),(.07,.035,.68),'steel','foreR');box('guard',(.28,-.04,.92+lift),(.21,.055,.045),'gold','foreR')
 if kind not in ['archer','crossbow']:
  sphere('shield',(-.33,-.10,1.1+lift),(.23,.045,.30 if kind=='shield' else .23),'cloth','foreL');sphere('boss',(-.33,-.155,1.1+lift),(.06,.03,.06),'steel','foreL')
 if rider:
  sphere('horse_body',(0,.02,.90),(.32,.66,.32),'leather','root');sphere('horse_neck',(0,-.55,1.2),(.21,.22,.43),'leather','root');sphere('horse_head',(0,-.78,1.42),(.18,.32,.19),'leather','root')
  box('saddle',(0,0,1.18),(.50,.4,.09),'darksteel','root');box('saddlecloth',(0,.1,1.09),(.7,.5,.24),'cloth','root')
  for side,x in [('L',-.24),('R',.24)]:
   for name,y in [('front',-.52),('rear',.5)]:
    cylinder('horse_upper',(x,y,.84),(x,y-.08,.46),.080,'leather',name+side);sphere('horse_knee',(x,y-.08,.46),(.08,.075,.085),'leather',name+'Shin'+side);cylinder('horse_shin',(x,y-.08,.46),(x,y,.16),.055,'leather',name+'Shin'+side);box('hoof',(x,y-.035,.10),(.15,.23,.16),'dark',name+'Shin'+side)
  for x in [-.1,.1]:cylinder('ear',(x,-.7,1.57),(x,-.68,1.78),.06,'leather','root',r2=.02)
  for x in [-.22,.22]:sphere('haunch',(x,.42,.94),(.22,.28,.30),'leather','root')
  for i in range(6):sphere('mane',(0,-.50+i*.065,1.40-i*.06),(.08,.10,.13),'dark','root')
  cylinder('tail',(0,.60,1),(0,.85,.58),.065,'dark','root');sphere('tail_end',(0,.86,.55),(.08,.08,.16),'dark','root')
  for x in [-.18,.18]:cylinder('reins',(x,-.80,1.38),(x,-.04,1.30),.009,'boards','root')
  cylinder('noseband',(-.18,-.97,1.40),(.18,-.97,1.40),.018,'boards','root')
  for x in [-.17,.17]:sphere('horse_eye',(x,-.77,1.48),(.03,.035,.03),'dark','root')
 animations(rig,horse=rider,ranged=kind in ['archer','crossbow']);export(kind+('_banner' if banner else ''),rig)
for kind in ['sword','spear','shield','archer','crossbow','knight']:
 soldier(kind);soldier(kind,True)

begin();house();export('house')
begin();house(2.6,2,1.8,'slate');box('rack',(1.5,0,.7),(.3,1.4,1.3),'wood');export('barracks')
begin();house(2.2,2.3,1.8);box('trough',(1.25,-.8,.35),(.4,1.4,.5),'boards');export('stable')
begin();house(1.8,1.7,2.2,'slate');cylinder('observatory',(0,0,2.6),(0,0,3.8),.45,'stone');sphere('brass_orb',(0,0,3.9),(.18,.18,.18),'gold');export('academy')
begin()
for i in [-1,1]:
 for y in [-.65,.65]:cylinder('post',(i,y,0),(i,y,1.4),.05,'wood')
 roof('awning',i*.02,0,1.4,2.4,1.7,.4,'cloth')
box('counter',(0,-.4,.65),(2.3,.8,.12),'boards')
for x in [-.7,0,.7]:box('crate',(x,-.4,.9),(.4,.38,.4),'boards')
export('market')
begin();house(1.4,1.2,1.2)
for i in range(5):cylinder('logs',(-.7+i*.3,-1,.2),(-.7+i*.3,-2,.2),.14,'wood')
export('lumber')
begin()
for i in range(8):sphere('cut_stone',(random.uniform(-1,1),random.uniform(-.7,.7),.2+random.random()*.4),(.35,.3,.3),'rock')
export('quarry')
begin()
for i in range(4):
 a=i*math.pi/2;cylinder('pillar',(math.cos(a)*.7,math.sin(a)*.7,0),(math.cos(a)*.7,math.sin(a)*.7,1.3),.17,'stone')
sphere('rune',(0,0,1.6),(.24,.24,.38),'glow');export('shrine')
begin()
box('field',(0,0,.05),(2.2,1.7,.1),'leather')
for x in [-.8,-.4,0,.4,.8]:
 for y in [-.6,-.2,.2,.6]:cylinder('stalk',(x,y,.1),(x,y,.65),.018,'wheat');sphere('ear',(x,y,.67),(.055,.04,.11),'wheat')
for y in [-.95,.95]:box('fence',(0,y,.45),(2.4,.045,.07),'boards')
export('farm')
begin();house(1.5,1.3,1.3,'slate')
for x in [-.7,.7]:cylinder('target',(x,-1.1,.7),(x,-1.2,.7),.32,'canvas');cylinder('bullseye',(x,-1.21,.7),(x,-1.23,.7),.11,'roof')
export('archery')
begin()
cylinder('mill_base',(0,0,.05),(0,0,2.4),.55,'plaster',r2=.38,vertices=20);roof('mill_roof',0,0,2.4,1.3,1.3,.65,'wood');box('door',(0,-.52,.48),(.3,.05,.85),'wood')
rotor=bpy.data.objects.new('Rotor',None);bpy.context.collection.objects.link(rotor);rotor.location=(0,-.67,2.0)
for i in range(4):
 a=i*math.pi/2;u=Vector((math.sin(a),0,math.cos(a)));beam=cylinder('rotor_spoke',u*.08,u*1.12,.04,'wood');beam.parent=rotor
 sail=box('lattice_sail',u*.78,(.24,.05,.62),'canvas');sail.rotation_euler.y=a;sail.parent=rotor
 for t in [.55,.75,.95]:bar=box('sail_crossbar',u*t,(.26,.035,.035),'wood');bar.rotation_euler.y=a;bar.parent=rotor
export('mill')
begin();box('cart_bed',(0,0,.50),(1.3,.9,.13),'boards')
for x in [-.65,.65]:box('side',(x,0,.76),(.07,.95,.4),'boards')
for y in [-.45,.45]:box('end',(0,y,.76),(1.3,.065,.4),'boards')
cylinder('axle',(-.82,0,.32),(.82,0,.32),.06,'wood')
for side in [-1,1]:
 x=side*.78;cylinder('wheel',(x-.04,0,.32),(x+.04,0,.32),.31,'wood',vertices=16)
 for i in range(8):a=i*math.pi/4;cylinder('wheel_spoke',(x,0,.32),(x,math.cos(a)*.27,.32+math.sin(a)*.27),.018,'gold')
for x in [-.42,.42]:cylinder('drawbar',(x,-.4,.40),(x,-1.3,.40),.035,'wood')
export('cart')
begin();tent=roof('canvas_tent',0,0,0,2.4,2.5,1.7,'canvas')
import bmesh
bm=bmesh.new();bm.from_mesh(tent.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[0]],context='FACES');bm.to_mesh(tent.data);bm.free()
M['canvas'].use_backface_culling=False
box('bedroll',(0,.25,.13),(.65,1.1,.22),'cloth')
for y in [-1.35,1.35]:cylinder('tent_pole',(0,y,0),(0,y,1.74),.045,'boards')
box('groundsheet',(0,0,.025),(2.2,2.4,.05),'leather')
for side in [-1,1]:
 for y in [-1.2,1.2]:cylinder('guyrope',(side*.9,y,.4),(side*1.4,y,.04),.015,'wood')
export('tent')
begin()
for i in range(5):
 a=i*2*math.pi/5;cylinder('ruin',(math.cos(a)*1.4,math.sin(a)*1.4,0),(math.cos(a)*1.4,math.sin(a)*1.4,1+random.random()),.23,'stone')
export('ruins')
begin()
# An irregular, layered rock ridge rather than a pyramid.
verts=[];rings=8;sides=24
for j in range(rings):
 h=j/(rings-1);r=(1-h)**.8
 for i in range(sides):
  a=i*2*math.pi/sides;noise=1+.13*math.sin(i*2+j)+.08*random.random();verts.append((math.cos(a)*r*noise+.12*h,math.sin(a)*r*noise,2.3*h+.06*random.random()))
faces=[]
for j in range(rings-1):
 for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;faces += [(a,b,a+sides),(b,b+sides,a+sides)]
data=bpy.data.meshes.new('Ridge');data.from_pydata(verts,[],faces);o=bpy.data.objects.new('Mountain',data);bpy.context.collection.objects.link(o);finish(o,'Mountain','rock');o.data.materials.append(M['snow'])
for p in o.data.polygons:p.material_index=1 if p.center.z>1.7 else 0
export('mountain')
begin()
box('keep',(0,0,1.65),(2.6,2.6,3.3),'plaster');roof('keep_roof',0,0,3.3,2.9,2.9,1.2,'slate')
for x in [-.65,.65]:box('keep_window',(x,-1.31,2.4),(.25,.04,.65),'dark')
for i,(x,y) in enumerate([(-2.7,-2.5),(2.7,-2.5),(-2.7,2.5),(2.7,2.5)]):
 start=len(parts);cylinder('tower',(x,y,0),(x,y,2.8),.6,'stone',vertices=16);cylinder('cap',(x,y,2.8),(x,y,3.7),.76,'slate',vertices=16,r2=0);box('arrow_slit',(x,y-.61,1.8),(.12,.03,.48),'dark')
 group=bpy.data.objects.new('Tower_'+str(i),None);bpy.context.collection.objects.link(group)
 for o in parts[start:]:o.parent=group
for i,(loc,size) in enumerate([((0,2.5,.85),(4.8,.35,1.7)),((-2.7,0,.85),(.35,4.7,1.7)),((2.7,0,.85),(.35,4.7,1.7)),((-1.9,-2.5,.85),(1.7,.35,1.7)),((1.9,-2.5,.85),(1.7,.35,1.7))]):
 group=bpy.data.objects.new('Wall_'+str(i),None);bpy.context.collection.objects.link(group);wall=box('wall',loc,size,'stone');wall.parent=group
 for j in range(6):
  x=loc[0]+(j-2.5)*size[0]/6 if size[0]>size[1] else loc[0];y=loc[1]+(j-2.5)*size[1]/6 if size[1]>size[0] else loc[1];o=box('merlon',(x,y,1.8),(.3,.35,.28),'plaster');o.parent=group
box('gate',(0,-2.52,.72),(1.25,.18,1.4),'wood');export('castle')

begin();bones=[('root',(0,0,0),(0,0,.5),None),('spine',(0,0,2),(0,-1,2.2),'root'),('head',(0,-1.2,2.5),(0,-2.8,2.4),'spine')]
for side,x in [('L',-1),('R',1)]:
 for n,y in [('front',-1.3),('rear',1.5)]:bones.append((n+side,(x,y,1.7),(x,y,.25),'root'))
rig=armature(bones);sphere('mass',(0,.3,2.2),(1.5,2.2,1.45),'darksteel','spine');sphere('head',(0,-2.4,2.8),(1.3,1.1,.95),'rock','head')
for side,x in [('L',-1),('R',1)]:
 for n,y in [('front',-1.3),('rear',1.5)]:sphere('leg',(x,y,1.05),(.52,.5,.9),'rock',n+side);box('claw',(x,y-.25,.22),(.75,.95,.35),'darksteel',n+side)
 for i in range(3):sphere('plate',(x*1.25,.9-i*.9,3),(.6,.6,.35),'steel','spine')
 for i in range(4):
  a=(side=='R' and 1 or -1)*(1.0+i*.45);b=(side=='R' and 1 or -1)*(1.0+(i+1)*.45);cylinder('ancient_horn',(a,-2.6,3.1+i*.55),(b,-2.8,3.1+(i+1)*.55),.36-i*.075,'gold','head',r2=max(.02,.29-i*.075))
 sphere('eye',(x*.9,-3.25,3),(.18,.12,.16),'glow','head')
for i in range(5):cylinder('dorsal',(0,1.5-i*.7,3.25),(0,1.5-i*.7,4.1),.26,'steel','spine',r2=0)
animations(rig,beast=True);export('beast',rig)
print('KINGDOMS ASSETS COMPLETE',OUT)

for kind in ['catapult','ram','tower']:
 begin();bones=[('root',(0,0,0),(0,0,.3),None),('spine',(0,0,.4),(0,0,1),'root'),('head',(0,0,1),(0,0,1.4),'spine'),('armR',(0,0,.7),(0,0,1.2),'spine'),('foreR',(0,0,1.2),(0,0,1.5),'armR')]
 rig=armature(bones);box('frame',(0,0,.35),(1.2,1.8,.22),'wood','root')
 for x in [-.7,.7]:
  for y in [-.65,.65]:cylinder('wheel',(x-.05,y,.28),(x+.05,y,.28),.28,'wood','root',vertices=16)
 if kind=='catapult':
  for x in [-.45,.45]:cylinder('brace',(x,-.3,.4),(x,.1,1.15),.07,'boards','spine')
  cylinder('throwing_arm',(0,0,.7),(0,-.4,1.8),.07,'boards','armR');sphere('stone',(0,-.4,1.9),(.2,.2,.2),'rock','foreR')
 elif kind=='ram':
  cylinder('log',(0,-.95,.8),(0,.95,.8),.16,'boards','spine');sphere('iron_head',(0,-1,.8),(.22,.22,.22),'darksteel','spine');roof('protective_roof',0,0,1.1,1.3,1.9,.5,'roof')
 else:
  for x in [-.5,.5]:
   for y in [-.7,.7]:cylinder('post',(x,y,.4),(x,y,2.4),.075,'wood','spine')
  for z in [1,1.7,2.4]:box('platform',(0,0,z),(1.3,1.8,.12),'boards','spine')
  box('shield_front',(0,-.9,1.45),(1.3,.12,2),'boards','spine')
 animations(rig);export(kind,rig)


begin()
for i in range(18):
 x=random.uniform(-1.2,1.2);y=random.uniform(-.65,.65);o=box('broken_masonry',(x,y,.08+random.random()*.23),(.2+random.random()*.35,.2+random.random()*.3,.18+random.random()*.24),'stone');o.rotation_euler=(random.random()*.3,random.random()*.3,random.random()*3)
for i in range(3):o=box('splintered_beam',(-.4+i*.4,0,.14),(.10,1.5,.12),'wood');o.rotation_euler.z=i*.8
export('rubble')

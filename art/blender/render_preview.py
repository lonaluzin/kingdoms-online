"""Render a reusable asset's Blender source with a simple soft studio setup."""
import bpy, os, math
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE,'knight.blend'))
scene=bpy.context.scene
rig=bpy.data.objects.get('Rig')
if rig:
 for track in rig.animation_data.nla_tracks:track.mute=track.name!='idle'
scene.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200)
ground=bpy.context.object;ground.name='Preview floor'
mat=bpy.data.materials.new('Studio grass');mat.diffuse_color=(.17,.23,.14,1);ground.data.materials.append(mat)
bpy.ops.object.camera_add(location=(3.6,-5,3))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3;scene.camera=camera
for loc,power,size in [((2,-4,6),650,4),((-4,-1,3),400,3),((1,4,5),800,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector((0,0,1))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.25,.3,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.filepath=os.path.join(HERE,'knight-preview.png');scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE,'knight-studio.blend'))
bpy.ops.render.render(write_still=True)

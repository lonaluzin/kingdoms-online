"""Choose idle as the default editable source clip, preserving all other NLA actions."""
import bpy, os, glob
here=os.path.dirname(os.path.abspath(__file__))
for file in glob.glob(os.path.join(here,'*.blend')):
 bpy.ops.wm.open_mainfile(filepath=file)
 for obj in bpy.context.scene.objects:
  if obj.type=='ARMATURE' and obj.animation_data:
   for track in obj.animation_data.nla_tracks:track.mute=track.name!='idle'
 bpy.context.scene.frame_set(1)
 bpy.ops.wm.save_as_mainfile(filepath=file)

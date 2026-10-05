"""Original camp and ruin buildings, using the same authored material palette."""
from pathlib import Path
source=Path(__file__).with_name('build_assets.py').read_text(encoding='utf-8')
exec(compile(source.split("for kind in ['sword'")[0],str(Path(__file__)), 'exec'),globals())

begin();tent=roof('hunting_lodge',0,0,.7,2.1,2,.9,'canvas')
for x in [-.9,.9]:box('timber_wall',(x,0,.5),(.12,1.9,1),'wood')
box('back_wall',(0,.9,.5),(1.9,.12,1),'boards')
for x in [-.55,.55]:
 cylinder('antler',(x,0,1.7),(x*1.5,0,2.1),.04,'boards')
 for y in [-.12,.12]:cylinder('antler_tine',(x*1.4,0,2),(x*1.7,y,2.25),.018,'boards')
box('drying_rack',(1.35,0,.7),(.06,1.5,1.4),'wood');box('hide',(1.39,0,.85),(.025,.65,.75),'canvas');export('hunting')

begin()
for x in [-1,1]:
 for y in [-.8,.8]:cylinder('stockade',(x,y,0),(x,y,1.5),.08,'wood')
roof('trophy_awning',0,0,1.5,2.2,1.9,.35,'canvas')
for x,y in [(-.65,-.45),(.55,-.35),(-.4,.5),(.65,.5)]:
 box('chest',(x,y,.4),(.65,.48,.6),'boards');box('iron_band',(x,y-.25,.4),(.06,.035,.6),'darksteel');box('lock',(x,y-.29,.47),(.13,.06,.15),'gold')
box('trophy_board',(0,.85,1.2),(1.25,.12,.45),'wood');sphere('trophy_shield',(0,.76,1.2),(.22,.04,.22),'steel');export('spoils')

begin();roof('mercenary_roof',0,0,1.55,2.5,2,.75,'canvas')
for x in [-1.05,1.05]:
 for y in [-.85,.85]:cylinder('post',(x,y,0),(x,y,1.6),.075,'boards')
box('bunk',(0,.55,.35),(1.7,.6,.5),'wood');box('bedroll',(0,.55,.68),(1.6,.55,.18),'cloth')
for x in [-.65,-.2,.25,.7]:
 cylinder('weapon_rack',(x,-.78,.1),(x,-.78,1.5),.025,'boards');cylinder('spearpoint',(x,-.78,1.5),(x,-.78,1.73),.06,'steel',r2=0)
box('rack_crossbar',(0,-.77,.9),(1.9,.09,.09),'wood');sphere('shield',(1.25,0,.75),(.07,.28,.36),'darksteel');export('mercenaries')

begin();box('excavation',(0,0,.025),(2.5,2.1,.05),'leather');box('shaft',(0,0,.055),(1.15,1.1,.035),'dark')
for x in [-.9,.9]:cylinder('hoist_post',(x,0,0),(x,0,1.8),.1,'boards')
cylinder('hoist_beam',(-1.1,0,1.8),(1.1,0,1.8),.11,'wood');cylinder('rope',(0,0,.15),(0,0,1.8),.018,'canvas')
for x,y in [(-.8,-.7),(.9,.7),(1,-.6)]:sphere('unearthed_stone',(x,y,.2),(.3,.35,.25),'stone')
for i in range(5):box('ladder_rung',(.6,-.5,.12+i*.15),(.4,.05,.05),'boards')
export('excavation')

begin();box('archive_base',(0,0,.1),(2.3,2.1,.2),'stone')
for x in [-.85,.85]:
 for y in [-.75,.75]:cylinder('ancient_column',(x,y,.15),(x,y,2),.14,'stone',vertices=16)
roof('archive_vault',0,0,2,2.3,2,.65,'stone')
box('reading_desk',(0,-.35,.8),(1.6,.7,.15),'boards');box('stone_table',(0,-.35,.4),(.4,.4,.8),'stone')
for i in range(4):box('book',(-.55+i*.35,-.35,.92),(.25,.4,.1),'cloth' if i%2 else 'roof')
box('inscribed_tablet',(0,.75,1.15),(1.4,.12,1.55),'stone')
for i in range(4):box('inscription',(-.42+i*.28,.68,1.35),(.08,.02,.42),'gold')
export('archive')

begin();box('forge_base',(0,0,.1),(2.3,2.1,.2),'stone')
for x in [-.8,.8]:box('forge_pillar',(x,.5,.8),(.38,.65,1.6),'rock')
box('lintel',(0,.5,1.65),(2,.7,.38),'stone');box('furnace',(0,.5,.55),(.9,.4,.6),'dark')
for x in [-.2,0,.2]:sphere('rune_fire',(x,.2,.5),(.08,.09,.28),'glow')
box('anvil',(0,-.7,.85),(.85,.3,.28),'darksteel');box('anvil_pedestal',(0,-.7,.42),(.4,.4,.8),'stone')
for x in [-1.15,1.15]:cylinder('rune_spire',(x,0,.15),(x,0,1.75),.17,'glow',vertices=6,r2=0)
export('runeforge')

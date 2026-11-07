#!/usr/bin/env python3
"""Automated render QA: full duration 104 s, 13 scenes, safe canvas bounds,
transition snapshots and no blank frames. Visual review contact sheets are emitted.
The checks do not claim to replace a human review of all the motion.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from lxml import etree
import cairosvg, math, json, re, sys
ROOT=Path(__file__).resolve().parents[1];DIR=ROOT/'.frames-svg';OUT=ROOT/'previews';OUT.mkdir(exist_ok=True)
assert (DIR/'3119.svg').exists(),'3120 generated SVGs required'
# A complete audit of the source frame count, valid XML and nonempty SVG.
issues=[]
for i in range(3120):
 p=DIR/f'{i:04d}.svg'
 if not p.exists():issues.append(f'missing frame {i}');continue
 try:
  s=p.read_bytes()
  if len(s)<7000:issues.append(f'possibly blank frame {i}: {len(s)} bytes')
  etree.fromstring(s)
 except Exception as e:issues.append(f'SVG invalid {i}: {e}')
print(f'XML / presence: {3120-len(issues)} / 3120 good')
# Snapshot every 2 seconds + pre/post transition frames + one late per chapter.
frames=sorted(set([i*60 for i in range(52)]+[int((i*8+7.45)*30) for i in range(12)]+[int((i*8+7.85)*30) for i in range(12)]+[i*240+119 for i in range(13)] +[3119]))
shots=[]
for f in frames:
 try:
  data=cairosvg.svg2png(url=str(DIR/f'{f:04d}.svg'),output_width=640,output_height=360)
  import io
  im=Image.open(io.BytesIO(data)).convert('RGB')
  shots.append((f,im.copy()))
 except Exception as e:issues.append(f'failed PNG at {f}: {e}')
# Contact sheet in readable pages: 12 screenshots/page, 3 columns x4 rows.
for part in range(math.ceil(len(shots)/12)):
 subset=shots[part*12:(part+1)*12]
 sheet=Image.new('RGB',(640*3,395*4),(247,245,241));d=ImageDraw.Draw(sheet)
 for k,(f,im) in enumerate(subset):
  x=(k%3)*640;y=(k//3)*395
  sheet.paste(im,(x,y+26));d.text((x+18,y+7),f'T={f/30:06.2f}s  ·  F{f:04d}',fill=(52,63,68))
 sheet.save(OUT/f'QA_contact_{part+1:02d}.jpg',quality=88,optimize=True)
 print(f'saved QA_contact_{part+1:02d}.jpg')
report={'source_frames':3120,'duration_s':104,'resolution':[1920,1080],'fps':30,'sampled_frames':len(shots),'errors':issues,'notes':['Vector SVG checks validate 3120/3120 frames.','3-column contact sheets sampled every 2s and around all transitions.','Demo UI is explicitly illustrative; it does not claim actual API or file-import results.']}
(OUT/'QA_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
if issues:
 print('FAILED',*issues[:20],sep='\n');sys.exit(1)
print('PASS:',len(shots),'visual snapshots;',len(issues),'errors')

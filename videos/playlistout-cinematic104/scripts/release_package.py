#!/usr/bin/env python3
"""Verify final MP4, inspect encoded frames, and package source without generated SVG cache."""
from pathlib import Path
import json,subprocess,hashlib,zipfile,shutil,io,os
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
MOVIE=ROOT/'out'/'PlaylistOut_Cinematic_Journey104_1080p.mp4'
TARGET=Path('/mnt/data/PlaylistOut_Cinematic104_Final_1080p.mp4')
ARCHIVE=Path('/mnt/data/PlaylistOut_Cinematic104_Source_Audio_MP4.zip')
CONTACT=Path('/mnt/data/PlaylistOut_Cinematic104_ReviewedContact.jpg')
assert MOVIE.is_file() and MOVIE.stat().st_size>3_000_000
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(MOVIE)],text=True))
v=next(s for s in probe['streams'] if s['codec_type']=='video')
a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (int(v['width']),int(v['height']))==(1920,1080)
assert v['r_frame_rate']=='30/1' and int(v['nb_frames'])==3120
assert abs(float(probe['format']['duration'])-104)<.03
assert a['codec_name']=='aac' and a['sample_rate']=='48000'
print('ffprobe verified',v['nb_frames'],'frames',probe['format']['duration'],'seconds',flush=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(MOVIE),'-f','null','-'],check=True)
print('full MP4 decode verified',flush=True)
# Source was validated with lxml and CairoSVG by quality_check.py.
frames_dir=ROOT/'previews'/'encoded_samples';frames_dir.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(MOVIE),'-vf','fps=1,scale=640:360','-q:v','5',str(frames_dir/'at_%03d.jpg')],check=True)
frames=sorted(frames_dir.glob('at_*.jpg'))
assert len(frames)==104,len(frames)
# Motion/hold audit on the main stage, excluding the always-moving music meter and header.
import numpy as np
motion=[]
previous=None
for t,f in enumerate(frames):
 im=Image.open(f).convert('RGB').crop((52,45,608,302)).resize((278,129))
 arr=np.asarray(im,dtype=np.int16)
 if previous is not None:
  diff=np.abs(arr-previous).mean(axis=2)
  motion.append({'from_sec':t-1,'to_sec':t,'changed_fraction_gt_12':float(np.mean(diff>12)),'mean_delta':float(diff.mean())})
 previous=arr
(ROOT/'previews'/'ENCODED_MOTION_AUDIT.json').write_text(json.dumps({'sample_rate_hz':1,'region':'main visual stage excluding HUD','measurements':motion,'lowest_change_segments':sorted(motion,key=lambda x:x['changed_fraction_gt_12'])[:12]},ensure_ascii=False,indent=2))
print('encoded motion audit saved',flush=True)
def contact_sheet(name,seconds,columns):
 width=640;cell_h=390;rows=(len(seconds)+columns-1)//columns
 dst=Image.new('RGB',(width*columns,cell_h*rows),'#FAF6ED');d=ImageDraw.Draw(dst)
 for j,t in enumerate(seconds):
  x=(j%columns)*width;y=(j//columns)*cell_h
  frame=frames[t];im=Image.open(frame).convert('RGB');dst.paste(im,(x,y+29))
  d.text((x+17,y+9),f'{t:03d}s    Cinematic Journey V2',fill='#263135')
 dst.save(name,'JPEG',quality=85,optimize=True)
 return str(name)
contact_sheet(CONTACT,list(range(0,104,4)),4)
transition=ROOT/'previews'/'Encoded_Transition_Contact.jpg'
contact_sheet(transition,[s for k in range(1,13) for s in (k*8-1,k*8,k*8+1) if s<104],4)
print('encoded-frame contact sheets created',flush=True)
# 13 region thumbnails are more useful for a quick review than all 104 samples in the release ZIP.
manifest={
 'revision':'Cinematic Journey V2',
 'width':1920,'height':1080,'fps':30,'duration_sec':104,
 'video_codec':v['codec_name'],'audio_codec':a['codec_name'],
 'source_frames_verified':3120,'qa_sampled_frames':90,
 'mp4_sha256':hashlib.sha256(MOVIE.read_bytes()).hexdigest(),
 'scene_sha256':hashlib.sha256((ROOT/'src/scene.ts').read_bytes()).hexdigest(),
 'audio_sha256':hashlib.sha256((ROOT/'public/audio/playlistout-new-original-mix.wav').read_bytes()).hexdigest(),
 'movie_size_bytes':MOVIE.stat().st_size,
 'authenticity':'Demo UI recreation, not real live API/success footage',
 'native_remotion_cli_verified':False,
 'offline_typescript_svg_ffmpeg_verified':True
}
(ROOT/'previews'/'FINAL_RELEASE_REPORT.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
shutil.copy2(MOVIE,TARGET)
shutil.copy2(CONTACT,ROOT/'previews'/'Final_Encoded_Overview.jpg')
basefiles=['README.md','快速开始.md','LICENSE','package.json','tsconfig.json','tsconfig.scene.json','.gitignore']
with zipfile.ZipFile(ARCHIVE,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as zipf:
 for name in basefiles:zipf.write(ROOT/name,arcname=f'playlistout-cinematic104/{name}')
 for sub in ('src','scripts','docs','public/audio','previews'):
  for path in sorted((ROOT/sub).rglob('*')):
   if not path.is_file():continue
   if 'encoded_samples' in path.parts or 'proof' in path.parts or path.name.endswith('.log') or path.name in {'render.pid','final_render.pid','first_proof.jpg'}:continue
   zipf.write(path,arcname=f'playlistout-cinematic104/{path.relative_to(ROOT)}')
 zipf.write(MOVIE,arcname='playlistout-cinematic104/out/PlaylistOut_Cinematic_Journey104_1080p.mp4')
print('DONE',TARGET,ARCHIVE,CONTACT,flush=True)
print('SIZES',TARGET.stat().st_size,ARCHIVE.stat().st_size,CONTACT.stat().st_size,flush=True)

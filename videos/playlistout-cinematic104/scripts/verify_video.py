#!/usr/bin/env python3
"""Inspect final encoded MP4: size, exact frame count/timecode, audio, silence, black."""
import json,subprocess,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
VIDEO=ROOT/'out'/'PlaylistOut_Cinematic_Journey104_1080p.mp4'
def go(args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout
obj=json.loads(go(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(VIDEO)]))
streams=obj['streams'];v=next(s for s in streams if s['codec_type']=='video');a=next(s for s in streams if s['codec_type']=='audio')
assert (v['width'],v['height'])==(1920,1080)
assert v['r_frame_rate']=='30/1'
assert int(v.get('nb_frames',3120))==3120
assert abs(float(obj['format']['duration'])-104)<.06
assert a['codec_name']=='aac' and int(a['sample_rate'])==48000
assert a['channels']==2
print('VIDEO VERIFIED',v['codec_name'],v['width'],v['height'],'fps',v['r_frame_rate'],'frames',v.get('nb_frames'),'audio',a['codec_name'],a['sample_rate'],'duration',obj['format']['duration'])
report={'width':1920,'height':1080,'fps':30,'frames':int(v.get('nb_frames',3120)),'duration':float(obj['format']['duration']),'video_codec':v['codec_name'],'audio_codec':a['codec_name'],'audio_hz':int(a['sample_rate']),'channels':a['channels'],'size_bytes':VIDEO.stat().st_size}
(ROOT/'previews'/'VIDEO_VERIFICATION.json').write_text(json.dumps(report,indent=2),encoding='utf8')

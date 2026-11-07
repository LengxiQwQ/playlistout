#!/usr/bin/env python3
"""Offline fallback rendering EXACT same TypeScript deterministic SVG scene as Remotion.
A frame is rasterized by CairoSVG then piped to ffmpeg. No frames skipped.
"""
from pathlib import Path
import subprocess,sys,time,os
from concurrent.futures import ProcessPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
SVG=ROOT/'.frames-svg';OUT=ROOT/'out'/'PlaylistOut_Cinematic_Journey104_1080p.mp4';W=1920;H=1080;FRAMES=3120
WORKERS=int(os.environ.get('WORKERS','3'))
def one(i):
    import cairosvg
    source=SVG/f'{i:04d}.svg'
    return cairosvg.svg2png(url=str(source),output_width=W,output_height=H)
def run(*xs):
    subprocess.run(xs,check=True,cwd=ROOT)
if __name__=='__main__':
    started=time.monotonic();OUT.parent.mkdir(exist_ok=True,parents=True)
    run('tsc','-p','tsconfig.scene.json')
    if not (SVG/'3119.svg').exists() or '--regen' in sys.argv:run('node','scripts/export_svg.cjs')
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-stats','-framerate','30','-f','image2pipe','-c:v','png','-i','pipe:0',
         '-i',str(ROOT/'public/audio/playlistout-new-original-mix.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264',
         '-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-profile:v','high','-level','4.2',
         '-threads','2','-c:a','aac','-b:a','192k','-ar','48000','-r','30','-t','104',
         '-movflags','+faststart',str(OUT)]
    with open(ROOT/'previews'/'render.log','w') as logfile:
      proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=logfile,stderr=logfile,cwd=ROOT)
      try:
       with ProcessPoolExecutor(max_workers=WORKERS) as pool:
        for count,png in enumerate(pool.map(one,range(FRAMES),chunksize=3),1):
         proc.stdin.write(png)
         if count%120==0:
          print(f'{count}/{FRAMES} frames, elapsed={time.monotonic()-started:.0f}s, size={OUT.stat().st_size/1e6 if OUT.exists() else 0:.1f}MB',flush=True)
       proc.stdin.close(); ret=proc.wait()
       if ret!=0:raise RuntimeError(f'ffmpeg return {ret}; see {logfile.name}')
      finally:
       if proc.poll() is None:proc.kill()
    print(f'FULL RENDER COMPLETE {OUT} bytes={OUT.stat().st_size} elapsed={time.monotonic()-started:.0f}s')

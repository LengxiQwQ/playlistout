#!/usr/bin/env python3
"""Playlist Out / new BGM: 120 BPM, ORIGINAL toy-funk / chiptune composition.
No audio samples, loops, commercial recordings or third-party stems are used.
Outputs music, effects, and mix, with deterministic phase and beat locations.
"""
from pathlib import Path
import numpy as np, wave, math
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/audio';DEST.mkdir(exist_ok=True,parents=True)
SR=32000; SECONDS=104.; N=int(SR*SECONDS); BPM=120; BT=60/BPM
RNG=np.random.default_rng(261107)
music=np.zeros((N,2),np.float32);fx=np.zeros_like(music)
def freq(note):
    keys={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    pitch=note[:-1]; octv=int(note[-1]); return 440*2**(((octv+1)*12+keys[pitch]-69)/12)
def place(arr,seconds,samples,vol=1.,pan=0):
    pos=int(seconds*SR);k=max(0,-pos); pos=max(0,pos);leng=min(len(samples)-k,N-pos)
    if leng<=0: return
    sig=samples[k:k+leng]*vol
    arr[pos:pos+leng,0]+=sig*math.sqrt((1-pan)*.5)
    arr[pos:pos+leng,1]+=sig*math.sqrt((1+pan)*.5)
def env(t,attack,decay,sustain=0):
    return np.minimum(1,t/max(attack,1e-4))*(np.exp(-t/max(decay,1e-4))*(1-sustain)+sustain)
def pluck(note,dur=.31):
    t=np.arange(int(dur*SR))/SR;f=freq(note)
    # Steely, percussive FM tine with a toy organ overtone.
    phase=2*np.pi*f*t + .9*np.exp(-t*18)*np.sin(2*np.pi*2.04*f*t)
    wave=.58*np.sin(phase)+.24*np.sin(2*phase)+.12*np.sin(3*phase)
    return (wave*env(t,.006,.17)).astype('float32')
def chip(note,dur=.22):
    t=np.arange(int(dur*SR))/SR;f=freq(note)
    harmonics=sum(np.sin(2*np.pi*f*t*k)*(1/k**1.2) for k in [1,3,5,7,9])
    return (harmonics*.28*env(t,.002,.12)).astype('float32')
def bass(note,dur=.46):
    t=np.arange(int(dur*SR))/SR;f=freq(note)
    glide=f*(1+0.10*np.exp(-t*20));phase=2*np.pi*np.cumsum(glide)/SR
    sig=.64*np.sin(phase)+.20*np.sin(2*phase)+.10*np.sin(3*phase)
    return (sig*env(t,.012,.25,.065)).astype('float32')
def pad(note,dur=.75):
    t=np.arange(int(dur*SR))/SR;f=freq(note)
    wave=.40*np.sin(2*np.pi*f*t)+.13*np.sin(2*np.pi*(f*1.004)*t)+.09*np.sin(4*np.pi*f*t)
    shape=np.minimum(1,t/.13)*np.minimum(1,(dur-t)/.26)
    return (wave*shape*.8).astype('float32')
def kick():
    t=np.arange(int(.45*SR))/SR
    ph=2*np.pi*(61*t+(114-61)*(.065/(2*np.pi*11))*(1-np.exp(-t*2*np.pi*11))*2*np.pi) # short initial pitch drop
    sig=np.sin(ph)*np.exp(-t*18)
    click=RNG.standard_normal(len(t)).astype('float32')*np.exp(-t*160)*.08
    return (sig+click).astype('float32')
def snare():
    t=np.arange(int(.35*SR))/SR;noise=RNG.standard_normal(len(t)).astype('float32')
    # No external sample. High passed white noise plus synthetic body.
    hp=noise-np.convolve(noise,np.ones(33,dtype='float32')/33,'same')
    return (hp*.33*np.exp(-t*19)+np.sin(2*np.pi*185*t)*np.exp(-t*21)*.18).astype('float32')
def hat(openhat=False):
    dur=.27 if openhat else .12
    t=np.arange(int(dur*SR))/SR;noise=RNG.standard_normal(len(t)).astype('float32')
    hp=noise-np.convolve(noise,np.ones(11,dtype='float32')/11,'same')
    return (hp*.18*np.exp(-t*(19 if openhat else 45))).astype('float32')
def pop():
    t=np.arange(int(.22*SR))/SR;f=470+360*np.exp(-t*38)
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*25)*.23).astype('float32')
def click():
    t=np.arange(int(.11*SR))/SR
    return ((RNG.standard_normal(len(t))*.10+np.sin(2*np.pi*1200*t)*.14)*np.exp(-t*75)).astype('float32')
def whoosh():
    t=np.arange(int(.42*SR))/SR;noise=RNG.standard_normal(len(t))
    hp=noise-np.convolve(noise,np.ones(71)/71,'same')
    e=np.sin(np.pi*t/.42)**1.6
    return (hp*.12*e).astype('float32')
roots=[('C2',['C4','E4','G4','B4']),('A1',['A3','C4','E4','G4']),('F2',['F3','A3','C4','E4']),('G1',['G3','B3','D4','F4'])]
# 52 bars -> 208 beats (104 seconds), one chord per bar.
for bar in range(52):
    start=bar*2.0;root,chord=roots[bar%4]
    section=bar//4
    energy=[.72,.88,.80,.90,.95,.84,1.03,.94,.83,.92,.73,1.06,.98][section]
    if section==10:energy*=.88
    for beat in [0,1,2,3]:
        if beat in (0,2) or (beat==3 and bar%4==3):place(music,start+beat*BT,kick(),.24*energy,0)
        if beat in (1,3):place(music,start+beat*BT,snare(),.23*energy,-.04)
        for sub in range(2):
            swing=.023 if sub else 0
            place(music,start+(beat+sub*.5)*BT+swing,hat(sub==1 and beat==3),(.13 if sub else .19)*energy, .28 if sub else -.22)
    for off,scale in [(0,.74),(.75,.53),(1.50,.67),(2.25,.46),(3,.60),(3.5,.37)]:
        # Sequence in beat units. Roots move by octave for the fun bass line.
        name=root
        place(music,start+off*BT,bass(name,.32),scale*.23*energy,-.1)
    for off in [.5,1.5,2.5,3.5]:
        for j,note in enumerate(chord[:3]):
            place(music,start+off*BT+.006*j,pluck(note,.22),.071*energy,(-.44+j*.38))
    if bar%2==0:
        for j,note in enumerate(chord):place(music,start+.1,pad(note,.89),.055*energy,(-.5+j*.29))
# Hook melody: memorable but ORIGINAL 4-bar phrase, variations in each section.
melody=[(0,'E5'),(.75,'G5'),(1.5,'A5'),(2.25,'G5'),(3,'E5'),(3.5,'D5'),
        (4,'C5'),(4.75,'E5'),(5.5,'G5'),(6.25,'D5'),(7,'E5'),(7.5,'C5')]
melody2=[(0,'C5'),(.75,'E5'),(1.5,'G5'),(2.25,'E5'),(3,'D5'),(3.5,'C5'),
        (4,'A4'),(4.75,'C5'),(5.5,'E5'),(6.25,'G5'),(7,'E5'),(7.5,'C5')]
for group in range(26):
    section=(group*2)//4; level=.52 if section==0 else (.84 if section%3!=2 else .70)
    if section==10:level=.36
    pat=melody if group%2==0 else melody2
    for j,(bt,noteName) in enumerate(pat):
        timbre=chip if (j+group)%3==0 else pluck
        place(music,group*4+bt*BT,timbre(noteName,.24),.18*level,(-.42 if j%2==0 else .37))
    # 4-note sonic signature on bookends.
    if group in (0,12,25):
        for k,noteName in enumerate(['C5','E5','G5','D6']):
            place(music,group*4+.1+k*.17,chip(noteName,.24),.15,(-.45+k*.27))
# Fixed, editorial sound cue sheet. Every cue is placed on beat or half-beat.
sfx_times=[(0.5,'pop'),(1.5,'pop'),(2.5,'pop'),(3.5,'pop'),(4,'slide'),(7.5,'slide'),
(8,'pop'),(10,'pop'),(12,'click'),(15.5,'slide'),(16,'pop'),(18,'click'),(20,'click'),(22,'pop'),(23.5,'slide'),
(24,'pop'),(26,'click'),(29,'click'),(30,'pop'),(31.5,'slide'),
(32,'pop'),(33,'pop'),(34,'pop'),(35,'pop'),(36,'pop'),(37,'pop'),(39.5,'slide'),
(40,'pop'),(42.5,'click'),(44,'click'),(47.5,'slide'),(48,'pop'),(50,'click'),(52,'click'),(54,'slide'),(56,'pop'),
(58,'click'),(60,'click'),(63.5,'slide'),(64,'pop'),(66,'pop'),(70,'click'),(71.5,'slide'),
(72,'pop'),(75,'pop'),(79.5,'slide'),(80,'pop'),(84,'click'),(87.5,'slide'),
(88,'pop'),(89,'click'),(91,'click'),(93,'click'),(95.5,'slide'),
(96,'pop'),(98,'click'),(100,'slide'),(101,'pop'),(102,'pop'),(103.5,'click')]
for when,name in sfx_times:
    if name=='slide':place(fx,when,whoosh(),.41,0)
    elif name=='pop':place(fx,when,pop(),.52,(when%3-1)*.2)
    else:place(fx,when,click(),.39,-.25 if int(when)%2 else .25)
# Cinematic travelling-ticket gestures, precisely at 120 BPM eighth-note grid.
# Each 2.5-second world-camera move starts at bar-boundary minus 1.25s,
# flies past the center downbeat, and settles at plus 1.25s.
def journey_sweep(dur=1.12):
    t=np.arange(int(dur*SR))/SR
    noise=RNG.standard_normal(len(t)).astype('float32')
    hp=noise-np.convolve(noise,np.ones(101,dtype='float32')/101,'same')
    shape=(np.sin(np.pi*t/dur)**1.4)
    air=hp*.073*shape
    gliss=np.sin(2*np.pi*np.cumsum(350+1150*(t/dur)**1.9)/SR)*.061*shape
    return (air+gliss).astype('float32')
for k in range(1,13):
    b=k*8.0
    place(fx,b-1.25,journey_sweep(),.62,-.38 if k%2 else .38)
    place(fx,b-.25,chip(['G5','E5','C5','A4'][k%4],.25),.41,.3)
    place(fx,b,pop(),.73,-.12 if k%2 else .12)
    place(fx,b+.75,click(),.39,.42 if k%2 else -.42)
    # Dip the accompaniment briefly just before the reveal, then recover on the downbeat.
    first=int((b-.24)*SR);last=int((b+.14)*SR)
    pulse=np.arange(last-first,dtype='float32')/(last-first)
    dip=(1-.17*np.sin(np.pi*pulse))
    music[first:last]*=dip[:,None]

# short air of space on music and SFX; stay away from muddy reverbs.
for delay,gain in [(int(SR*.104),.085),(int(SR*.181),.053)]:
    music[delay:]+=music[:-delay].copy()*gain
for delay,gain in [(int(SR*.070),.10)]:fx[delay:]+=fx[:-delay].copy()*gain
# Final soundtrack: new arrangement and new sound design, not previous pilot music.
combined=music+fx
# Gentle intro, 1.5s ending fade; avoid clipping.
t=np.arange(N,dtype='float32')/SR
shape=np.minimum(1,t/.32)*np.minimum(1,(SECONDS-t)/1.1)
combined*=shape[:,None]
music*=shape[:,None];fx*=shape[:,None]
scale=.78/max(.001,float(np.max(np.abs(combined))))
print('music peak',float(np.max(np.abs(music))),'fx peak',float(np.max(np.abs(fx))),'mix scale',scale)
def write(name,arr):
    a=np.clip(arr*scale,-1,1);pcm=(a*32767).astype('<i2')
    with wave.open(str(DEST/name),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
    print(name,'bytes', (DEST/name).stat().st_size)
write('playlistout-new-original-mix.wav',combined)
write('music-stem.wav',music)
write('sfx-stem.wav',fx)
(DEST/'MUSIC_LICENSE.txt').write_text('Original synthesized composition and sound effects, generated for this Playlist Out video project. No external samples or commercial recordings used. BPM: 120. Duration: 104 seconds. Music copyright in this deliverable is released under CC0-1.0 for re-editing by the project owner.\n',encoding='utf8')

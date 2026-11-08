from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path(r"D:\Projects\playlistout\videos\playlistout-premiere")
q=root/"qa"/"phone-v4"
font=ImageFont.truetype(str(root/"public"/"fonts"/"NotoSansSC-VF.ttf"),24)
small=ImageFont.truetype(str(root/"public"/"fonts"/"NotoSansSC-VF.ttf"),15)
names=[("5.0","INTRO"),("10.5","PARSE INPUT"),("14.0","PARSE RESULT"),("22.0","EXPORT"),("30.0","BATCH"),("40.0","CLI"),("50.0","ECOSYSTEM"),("55.0","FINALE")]
W,H=844,475; pad=24; label=44
canvas=Image.new("RGB",(W*2+pad*3, (H+label)*4+pad), "#f2ecdf"); d=ImageDraw.Draw(canvas)
for i,(sec,name) in enumerate(names):
    col=i%2; row=i//2
    x=pad+col*(W+pad); y=pad+row*(H+label+18)
    d.text((x,y),f"{name}  ·  {sec}s",font=font,fill="#2d3436")
    fname = sec.rstrip("0").rstrip(".")
    canvas.paste(Image.open(q/f"p-{fname}.jpg").convert("RGB"),(x,y+label-8))
canvas.save(root/"qa"/"phone-sheet-v4.jpg",quality=92)
print(root/"qa"/"phone-sheet-v4.jpg",canvas.size)

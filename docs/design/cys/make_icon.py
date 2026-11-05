from PIL import Image, ImageDraw, ImageFont
S='/private/tmp/claude-501/-Users-thomasmundheim-Development-LDRGLPRx/4c489dfa-5556-4a5c-8e6e-bca91a2ccd45/scratchpad'; N=1024; RED=(0xE8,0x35,0x2B); YEL=(0xFF,0xD4,0x00); WHITE=(255,255,255)
FONT="/Users/thomasmundheim/Development/LDRGLPRx/docs/design/cys/fonts/Anton-Regular.ttf"
W=round(N*0.88); GAP=34
lines=[("COUNT",WHITE),("YOURSELF",WHITE),("SKINNY",YEL)]
tiles=[]
for t,c in lines:
    f=ImageFont.truetype(FONT,400)
    m=Image.new("L",(3000,1500),0); ImageDraw.Draw(m).text((50,50),t,font=f,fill=255)
    m=m.crop(m.getbbox())
    s=W/m.width
    f=ImageFont.truetype(FONT,round(400*s))
    m=Image.new("L",(4000,4000),0); ImageDraw.Draw(m).text((50,50),t,font=f,fill=255)
    m=m.crop(m.getbbox()); m=m.resize((W,m.height))
    tiles.append((m,c))
    print(t,m.size)
# target heights: SKINNY ~ 50% of icon, rest share remainder
total=N-2*round(N*0.06)-2*GAP   # vertical content budget
hs=[m.height for m,_ in tiles]
skin=round(N*0.50)
rest=total-skin
r=rest/(hs[0]+hs[1])
th=[round(hs[0]*r),round(hs[1]*r),skin]
print(th)
img=Image.new("RGB",(N,N),RED)
blk=sum(th)+2*GAP; y=(N-blk)//2
for (m,c),h in zip(tiles,th):
    m=m.resize((W,h),Image.LANCZOS)
    img.paste(Image.new("RGB",(W,h),c),((N-W)//2,y),m); y+=h+GAP
img.save("/Users/thomasmundheim/Development/LDRGLPRx/apps/count-yourself-skinny-ios/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png")
img.save(f"{S}/tabloid-1024.png")
for n in (180,60,40): img.resize((n,n),Image.LANCZOS).save(f"{S}/tabloid-{n}.png")
def prev(bg,name):
    big=img.resize((180,180),Image.LANCZOS); k=Image.new("L",(180,180),0)
    ImageDraw.Draw(k).rounded_rectangle((0,0,179,179),radius=40,fill=255)
    c=Image.new("RGB",(240,240),bg); c.paste(big,(30,30),k); c.save(f"{S}/{name}")
prev((255,255,255),"tabloid-prev-white.png"); prev((20,20,22),"tabloid-prev-dark.png")

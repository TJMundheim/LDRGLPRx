from PIL import Image, ImageDraw, ImageFilter
import random, math
W,H=2667,1500
def make(name, glow_xy, seed, strength=1.0, wave=True):
    strength*=0.72
    random.seed(seed)
    base=Image.new('RGB',(W,H),(8,16,38))
    # radial glows
    g=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(g)
    for (cx,cy,r,col) in glow_xy:
        for k in range(60,0,-1):
            rr=r*k/60; a=(1-k/60)**2*strength
            c=tuple(int(v*a) for v in col)
            d.ellipse([cx-rr,cy-rr,cx+rr,cy+rr],fill=c)
    g=g.filter(ImageFilter.GaussianBlur(60))
    base=Image.blend(base,Image.fromarray(__import__('numpy').clip(__import__('numpy').asarray(base,dtype=int)+__import__('numpy').asarray(g,dtype=int),0,255).astype('uint8')),1.0)
    # network nodes concentrated near glow 0
    net=Image.new('RGBA',(W,H),(0,0,0,0)); nd=ImageDraw.Draw(net)
    cx,cy,r,_=glow_xy[0]
    pts=[]
    for i in range(95):
        ang=random.random()*2*math.pi; dist=abs(random.gauss(0,r*0.9))
        pts.append((cx+dist*math.cos(ang), cy+dist*math.sin(ang)))
    for i,p in enumerate(pts):
        for q in pts[i+1:]:
            dd=math.dist(p,q)
            if dd<170: nd.line([p,q],fill=(120,160,255,int(45*(1-dd/170))),width=2)
    for p in pts:
        s=random.choice([3,4,5,7]); col=random.choice([(140,180,255),(230,185,95),(180,150,240)])
        nd.ellipse([p[0]-s,p[1]-s,p[0]+s,p[1]+s],fill=col+(165,))
    glow=net.filter(ImageFilter.GaussianBlur(6))
    base=base.convert('RGBA'); base.alpha_composite(glow); base.alpha_composite(net)
    # dust
    dl=Image.new('RGBA',(W,H),(0,0,0,0)); dd_=ImageDraw.Draw(dl)
    for i in range(500):
        x,y=random.random()*W,random.random()*H; s=random.random()*2.2
        dd_.ellipse([x-s,y-s,x+s,y+s],fill=(200,210,255,random.randint(30,110)))
    base.alpha_composite(dl)
    if wave:
        wl=Image.new('RGBA',(W,H),(0,0,0,0)); wd=ImageDraw.Draw(wl)
        for j,(col,amp,off) in enumerate([((230,180,90),40,0),((120,150,255),30,1.3),((230,180,90),22,2.1)]):
            pts=[(x, H-95+amp*math.sin(x/260+off)+ (x/W)*-30) for x in range(0,W,6)]
            wd.line(pts,fill=col+(150-j*30,),width=3)
        base.alpha_composite(wl.filter(ImageFilter.GaussianBlur(4))); base.alpha_composite(wl)
    base.convert('RGB').save(name,quality=88)

make('m_main.jpg',[(2450,180,520,(40,70,150)),(300,1400,600,(110,85,30))],11,1.0)
make('m_title.jpg',[(1300,750,900,(45,75,170)),(2300,1300,500,(150,110,35))],12,1.1)
make('m_body.jpg',[(1900,700,760,(170,45,30)),(2400,200,400,(170,140,20)),(200,200,500,(90,30,30))],13,1.1)
make('m_brain.jpg',[(1900,700,760,(50,90,210)),(2400,200,400,(150,110,35)),(200,200,500,(60,40,130))],14,1.15)
make('m_bank.jpg',[(1900,700,760,(130,30,45)),(2400,200,400,(160,130,70)),(200,200,500,(70,60,40))],15,1.1)

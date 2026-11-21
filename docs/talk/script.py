import re,glob,sys
from pptx import Presentation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Image, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from xml.sax.saxutils import escape
# usage: python3 script.py deck.pptx out.pdf VERSION [slide_image_dir]   (images named sl-01.jpg ... from render_slides.sh)
DECK, OUT, V = sys.argv[1], sys.argv[2], sys.argv[3]
IMGDIR = sys.argv[4] if len(sys.argv) > 4 else 'slides'
p=Presentation(DECK)
import zipfile
x=zipfile.ZipFile(DECK).read('ppt/presentation.xml').decode()
ids=re.findall(r'<p:sldId id="(\d+)"',x); secs={}
for name,body in re.findall(r'<p14:section name="([^"]+)"[^>]*>(.*?)</p14:section>',x,re.S):
    for i in re.findall(r'<p14:sldId id="(\d+)"',body): secs[i]=name
def title_of(sl):
    for sh in sl.shapes:
        if sh.is_placeholder and sh.has_text_frame and sh.text_frame.text.strip(): return sh.text_frame.text
    for sh in sl.shapes:
        if sh.has_text_frame:
            t=sh.text_frame.text.strip()
            if len(t)>3 and t!=t.upper(): return t.split('\n')[0]
    return ''
NAVY=colors.HexColor('#0A1430');GOLD=colors.HexColor('#A8822E');GRAY=colors.HexColor('#5B6475')
H=ParagraphStyle('h',fontName='Helvetica-Bold',fontSize=10,textColor=GOLD,spaceAfter=2,leading=13)
T=ParagraphStyle('t',fontName='Times-Bold',fontSize=17,textColor=NAVY,leading=21,spaceAfter=8)
L=ParagraphStyle('l',fontName='Helvetica-Bold',fontSize=10,textColor=GRAY,spaceBefore=6,spaceAfter=4)
B=ParagraphStyle('b',fontName='Helvetica',fontSize=12,leading=16.5,spaceAfter=7,textColor=colors.HexColor('#1F2430'))
def footer(c,d):
    c.saveState();c.setFont('Helvetica',8);c.setFillColor(GRAY)
    c.drawString(0.75*inch,0.45*inch,f'My4MLife  |  Body, Brain, Bank talk {V}  |  Presenter script')
    c.drawRightString(7.75*inch,0.45*inch,'Page %d'%d.page);c.restoreState()
doc=SimpleDocTemplate(OUT,pagesize=letter,leftMargin=0.75*inch,rightMargin=0.75*inch,topMargin=0.6*inch,bottomMargin=0.7*inch,title=f'My4MLife Talk {V} – Presenter Script',author='Dr. TJ Mundheim')
st=[Spacer(1,1.6*inch),Paragraph('PRESENTER SCRIPT',H),Paragraph('Begin with the End in Mind: Body, Brain, Bank',ParagraphStyle('c',parent=T,fontSize=26,leading=31)),
    Paragraph(f'Dr. TJ Mundheim  ·  My4MLife  ·  Talk {V}  ·  30–40 minutes',B),Spacer(1,0.25*inch),
    Paragraph('<b>Before the doors open:</b> on every seat, a wrapped snack, a small water and the seat card ("Don\'t open your snack until Dr. TJ says so"; the back has the MindSpan assessment QR code). Put the pre-show slide (slide 1) on screen. Regenerate the QR codes with tonight\'s event tag, and fill in the Wi-Fi details.',B),
    Paragraph('<b>Timing guide:</b> Opening ~5 min (slides 2–6) · Body ~8 min (7–13) · Brain ~12 min (14–21) · Bank ~8 min, longer or shorter for the room (22–29) · Close and drawing ~6 min (30–34), then Q&amp;A. To stay inside 40 minutes, shorten the Bank section for general crowds.',B),
    Paragraph('One page per slide: the slide on top, what to say underneath. The Sources slide stays in the deck for questions.',B),PageBreak()]
imgs=sorted(glob.glob(IMGDIR.rstrip('/')+'/sl-*.jpg'))
assert len(imgs)==len(p.slides),(len(imgs),len(p.slides))
OVR={3:"Take one bite. Count every chew.",4:"Most people chew 10–15 times. Tonight, we count to 32.",7:"You'll never count a calorie. You'll count to 32 instead.",13:"Why does any of this matter? Because of how it ends.",16:"Up to 45% of dementia cases may be preventable or delayed",20:"The granddaughter's wedding",21:"Who are you doing this for?",26:"Medicare pays $0 toward custodial care",30:"Last bite. Fork down. Count to 32 with me."}
for i,(sl,img) in enumerate(zip(list(p.slides),imgs)):
    notes=sl.notes_slide.notes_text_frame.text
    long=len(notes)>1100; sty=B; iw=(5.6 if long else 6.6)*inch
    st.append(Paragraph(f'SLIDE {i+1}  ·  {escape(secs.get(ids[i],"")).upper()}',H)); st.append(Paragraph(escape(OVR.get(i+1,title_of(sl)).replace('\n',' ')),T))
    t=Table([[Image(img,width=iw,height=iw*9/16)]],colWidths=[iw],hAlign='LEFT');t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,GRAY)]+[(k,(0,0),(-1,-1),0) for k in ('LEFTPADDING','RIGHTPADDING','TOPPADDING','BOTTOMPADDING')]))
    st+=[t,Paragraph('WHAT TO SAY',L)]
    for para in [q for q in notes.split('\n') if q.strip()]:
        para=escape(para.strip()); para=re.sub(r'\[([^\]]+)\]',r'<i>[\1]</i>',para)
        para=re.sub(r'^(PRE-SHOW LOOP\.)',r'<b>\1</b>',para)
        st.append(Paragraph(para,sty))
    st.append(PageBreak())
st.pop(); doc.build(st,onFirstPage=footer,onLaterPages=footer)

// ══════════════════════════════════════════
// DATA
// ══════════════════════════════════════════
const STORAGE_KEY = '4m_workbook_v1';

function defaultState() {
  return {
    name:'', startDate:'', cohort:'', motivation:'', why:'',
    scores:{}, plans:{}, priorities:['','',''], commitments:['','',''],
    morn:{}, cold:{}, mornRef:{},
    supps:{}, cogLog:{}, trainLog:{},
    base:{weight:'',waist:'',energy:'',focus:'',sleep:'',mood:''},
    w4:{weight:'',waist:'',energy:'',focus:'',sleep:'',mood:'',audit:'',squat:'',mornDays:'',coldDays:''},
    identity:'', wins:['','',''],
    m2:{training:'',nutrition:'',supplements:'',cognitive:'',accountability:''},
    grad:'', regenPri:'', regenNext:'',
    w4audit:{}, str:{},
    cogRatings:{}, protein:'', wRef:{}
  };
}

let S = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return Object.assign(defaultState(), saved);
    }
  } catch(e){}
  return defaultState();
})();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch(e){}
}

// ══════════════════════════════════════════
// FACTORS
// ══════════════════════════════════════════
const FACTORS = [
  { n:'00', name:'Allergies & immune reactivity', tag:'IMMUNE', tc:'#9B4D8A',
    act:['List all known food allergies and sensitivities (gluten, dairy, nuts, shellfish, etc.)',
         'Note environmental allergies — pollen, mold, dust mites, pet dander',
         'Consider that undiagnosed food sensitivities drive gut inflammation and leaky gut',
         'An elimination diet (remove top 8 allergens for 3 weeks) is the gold standard for identification',
         'Allergic load = immune burden = neuroinflammatory risk — reducing it is brain optimization'],
    imm:['Request an IgE and IgG food sensitivity panel from your physician',
         'Start a 3-day food/symptom journal — track what you eat and how you feel 30–60 min after',
         'Remove known allergens completely for 30 days — not partially'],
    adv:['Chronic allergic load increases cortisol and histamine — both impair sleep and cognition',
         'Leaky gut and food sensitivities are tightly linked — gut repair in Week 1 addresses root cause',
         'Consider working with a functional medicine provider on full allergy/sensitivity testing'],
    res:[{n:'FARE — Food Allergy Research & Education',u:'https://www.foodallergy.org'},
         {n:'Viome — gut and immune testing',u:'https://www.viome.com'}] },
    { n:'01', name:'Mental health & mental wellness', tag:'Connected Mind', tc:'#2E7FD9',
    sub:'Anxiety, depression, mood instability, or unaddressed trauma', cm:true,
    imm:['Complete the Connected Mind assessment BEFORE scoring this factor',
         'Rate your current mood, anxiety, and emotional stability honestly — this is private',
         'Practice box breathing right now: 4 in, hold 4, out 4, hold 4 — repeat 4 times',
         'Identify one recurring thought pattern that most disrupts your mental wellness'],
    tools:['Depression and anxiety directly accelerate neuroinflammation and cognitive decline',
           'Many 4M interventions are direct mental health tools: sleep, exercise, cold exposure, purpose',
           'Magnesium, omega-3, and methylated B-complex all have peer-reviewed mood support evidence',
           'The gut-brain axis is bidirectional — improving gut health improves mental health directly'],
    adv:['Working with a therapist is the highest-leverage intervention for persistent symptoms',
         'Track mood, anxiety, and focus weekly using the 1–10 self-rating scale throughout',
         'This program addresses root causes — every 4M pillar is a mental health intervention'],
    res:[{n:'Psychology Today — find a therapist',u:'https://www.psychologytoday.com/us/therapists'},
         {n:'NAMI Helpline',u:'https://www.nami.org/help'},
         {n:'Huberman Lab — depression & anxiety tools',u:'https://hubermanlab.com'}] },

  { n:'02', name:'Gut microbiome health', tag:null,
    sub:'Bloating, irregular digestion, processed food diet, or frequent antibiotic use',
    imm:['Add one fermented food today: Greek yogurt, kefir, sauerkraut, or kimchi',
         'Replace one ultra-processed snack with a high-fiber whole food this week',
         'Practice box breathing after meals — digestion is optimal in parasympathetic state',
         'Drink 8–16 oz bone broth daily — glycine and collagen repair the gut lining directly'],
    tools:['Your gut and brain communicate directly via the vagus nerve — 24 hours a day',
           'Aim for 30 different plant foods per week — diversity is the medicine here',
           'Your gut produces 90% of your serotonin — mood is a gut issue as much as a brain issue',
           'P. gingivalis from poor oral health can enter the gut and worsen dysbiosis — factors 02 and 03 are linked'],
    adv:['Consider Viome or Genova GI Effects comprehensive gut testing',
         'Rule out SIBO or leaky gut with your physician if issues are persistent',
         'Avoid unnecessary antibiotics and NSAIDs — both cause lasting microbiome damage'],
    res:[{n:'Viome gut testing',u:'https://viome.com'},
         {n:'Seed DS-01 probiotic',u:'https://seed.com'},
         {n:'ZOE nutrition program',u:'https://zoe.com'}] },

  { n:'03', name:'Poor dental health & oral microbiome', tag:'Oral · Brain · Heart', tc:'#D4920A',
    sub:'Gum disease, bleeding gums, poor hygiene, or no recent dental cleaning',
    imm:['Schedule a dental cleaning this month — one annual cleaning reduces cardiovascular risk by 14%',
         'Brush twice daily with a remineralizing toothpaste — before bed is the most critical session',
         'Floss every night — gum disease begins in the spaces your toothbrush cannot reach',
         'Oil pull with coconut oil for 10 minutes each morning to reduce oral bacterial load',
         'Scrape your tongue daily — this removes bacterial biofilm where pathogens accumulate'],
    tools:['P. gingivalis travels from leaky gums to the brain — detected in Alzheimer\'s brain tissue post-mortem',
           'Meta-analysis: 10× higher Alzheimer\'s risk when oral bacteria are found in brain tissue',
           'The same periodontal pathogens clog arteries, elevate CRP, and impair endothelial function',
           'YOU NEED A STRONG HEART TO HAVE A STRONG BRAIN — cardiovascular health IS brain health',
           'Blood carries oxygen to neurons — compromised cardiac function means compromised cognition',
           'One dental cleaning per year independently reduces cardiovascular risk by 14%',
           'One daily toothbrushing reduces cardiovascular risk by 9%'],
    adv:['Find a biological or holistic dentist — they treat oral health as whole-body health',
         'Request a salivary microbiome test to identify your specific oral pathogens',
         'Oral probiotics (S. salivarius K12 and M18) competitively displace harmful bacteria',
         'Periodontal therapy has been shown to reduce systemic CRP and improve endothelial function'],
    res:[{n:'IAOMT — find a biological dentist',u:'https://iaomt.org/for-patients/search/'},
         {n:'American Academy of Periodontology',u:'https://perio.org/for-patients'},
         {n:'IFM — oral microbiome & cardiometabolic',u:'https://ifm.org'},
         {n:'Huberman Lab — oral health protocol',u:'https://hubermanlab.com'}] },

  { n:'04', name:'Sunlight & vitamin D', tag:null,
    sub:'Less than 20 min daily outdoor exposure, known D deficiency, or mostly indoor lifestyle',
    imm:['Get outside within 60 minutes of waking — no sunglasses — 10–20 minutes minimum',
         'Order a vitamin D blood test — no prescription needed at most walk-in labs',
         'Stack sunlight time with box breathing and morning movement simultaneously'],
    tools:['Vitamin D is a steroid hormone regulating over 2,000 genes including brain protection pathways',
           'Target serum level: 50–80 ng/mL — most men over 35 test at 20–30 without knowing',
           'Always pair D3 with K2 (100mcg) to direct calcium to bones and not arteries',
           'Morning sunlight sets your circadian rhythm independently of vitamin D — both matter'],
    adv:['Test again 90 days after supplementing to confirm levels have normalized',
         'Magnesium is required to convert D3 to its active hormonal form — take both',
         'Use a UVB lamp in winter if you live above 35 degrees latitude'],
    res:[{n:'GrassrootsHealth D*Action',u:'https://grassrootshealth.net'},
         {n:'Examine.com — Vitamin D',u:'https://examine.com/supplements/vitamin-d/'},
         {n:'Huberman Lab — light & circadian rhythm',u:'https://hubermanlab.com'}] },

  { n:'05', name:'Alcohol consumption', tag:null,
    sub:'More than 7 drinks per week, binge drinking, or drinking nightly to unwind',
    imm:['Track every drink for 7 days — no judgment, just honest honest data to work from',
         'Identify your primary trigger: stress, habit, social pressure, or boredom',
         'Practice box breathing when a craving hits — it is the fastest cortisol intervention available'],
    tools:['Alcohol crosses the blood-brain barrier and directly damages neurons with every drink',
           'Disrupts sleep architecture and destroys REM sleep — even one drink affects deep sleep quality',
           'Raises cortisol, inflames the gut lining, and shrinks the hippocampus with chronic use',
           'Over 7 drinks per week is the clinical threshold where neurological risk accelerates measurably'],
    adv:['Consider a 30-day alcohol-free challenge — Dry January or Sober October as entry points',
         'Try the Reframe or I Am Sober apps for guided reduction and accountability',
         'If drinking feels uncontrollable, speak with your physician — this is medical not moral'],
    res:[{n:'Reframe app',u:'https://reframeapp.com'},
         {n:'Dry January',u:'https://dryjanuary.org.uk'},
         {n:'Huberman Lab — alcohol & the brain',u:'https://hubermanlab.com'}] },

  { n:'06', name:'Sleep quality & duration', tag:null,
    sub:'Less than 7 hours most nights, poor quality, frequent waking, or no consistent schedule',
    imm:['Set a fixed wake time and hold it 7 days per week — including weekends without exception',
         'Get 10 minutes of outdoor light within 60 minutes of waking — this anchors your circadian clock',
         'Take 400mg magnesium glycinate 30 minutes before bed starting tonight'],
    tools:['The glymphatic system flushes amyloid beta plaques during deep sleep — and only during deep sleep',
           'Less than 7 hours means your brain does not complete its full nightly cleaning cycle',
           'One night of poor sleep measurably elevates amyloid beta the following day',
           'Consistent wake time is more powerful than consistent bedtime for circadian anchoring'],
    adv:['Consider a sleep study if you snore heavily, wake gasping, or feel unrefreshed consistently',
         'Avoid caffeine after 12pm — it has a 5–7 hour half-life and disrupts sleep architecture',
         'No alcohol within 3 hours of sleep — it completely destroys REM sleep stages'],
    res:[{n:'Huberman Lab sleep toolkit',u:'https://hubermanlab.com/newsletter/toolkit-for-sleep'},
         {n:'Sleep Foundation',u:'https://sleepfoundation.org'},
         {n:'Oura Ring',u:'https://ouraring.com'}] },

  { n:'07', name:'Poor nutrition quality', tag:'Keto-Paleo', tc:'#1D9E75',
    sub:'Ultra-processed food, poor animal food quality, or chronic under-eating protein',
    imm:['Set your eating window now: first meal after 9am (after morning routine), last meal by 7pm — work toward moving to 6pm, then 5pm over time',
         'Do your morning routine completely fasted — water or black coffee only, nothing else',
         'Swap one meal this week to grass-fed beef, wild game, or wild-caught salmon',
         'Eliminate ALL seed oils immediately: canola, soybean, corn, sunflower, safflower',
         'Try Force of Nature ancestral blend this week as your organ meat introduction'],
    tools:['Build every meal around high-quality animal protein — grass-fed, wild game, wild fish',
           'Cook exclusively in animal fats: tallow, lard, ghee, duck fat, or grass-fed butter',
           'Protein target: target bodyweight (lbs) × 0.9 = your daily gram requirement',
           'Bone broth daily — collagen, glycine, and gut lining repair in every cup'],
    adv:['Explore nose-to-tail eating: beef liver 1–2x per week is the Month 2 nutritional target',
         'Source from grass-fed suppliers: ButcherBox, US Wellness Meats, Vital Choice',
         'Month 2 extends fast to 16:8 — first meal after 11am as metabolic flexibility builds',
         'Month 3 moves to 18:6 fasting — by then most men find extended fasting surprisingly easy'],
    res:[{n:'ButcherBox — grass-fed beef & wild salmon',u:'https://butcherbox.com'},
         {n:'US Wellness Meats — organ meats & game',u:'https://uswellnessmeats.com'},
         {n:'Force of Nature — ancestral blend',u:'https://forceofnaturemeats.com'},
         {n:'Vital Choice — wild-caught seafood',u:'https://vitalchoice.com'},
         {n:'Ancestral Supplements — organ capsules',u:'https://ancestralsupplements.com'}] },

  { n:'08', name:'Physical inactivity & injuries', tag:'KOT', tc:'#D85A30',
    sub:'Not exercising regularly, or chronic injuries preventing consistent movement',
    imm:['Schedule your 3 training days in your calendar right now — these are non-negotiable',
         'Start your morning movement stack tomorrow: fireside squat, sumo squat, lunge, hip circles',
         'If injured, identify which movements you CAN do safely — movement always beats rest'],
    tools:['Resistance training elevates BDNF by up to 300% — Miracle-Gro for your neurons',
           'KOT system: knees over toes is the solution to chronic joint pain, not the problem',
           '3 training days + 2 Zone 2 walks per week is your complete weekly movement protocol',
           'Zone 2 cardio builds mitochondrial density and independently elevates BDNF'],
    adv:['BPC-157 has emerging peer-reviewed evidence for tendon and joint repair',
         'Physical therapy for any injury limiting you 3+ months is worth every dollar',
         'The KOT morning protocol progression builds long-term joint health systematically'],
    res:[{n:'KOT Beginner Playlist — Ben Patrick',u:'https://www.youtube.com/c/TheKneesovertoesguy'},
         {n:'Examine.com — BPC-157',u:'https://examine.com/supplements/bpc-157/'},
         {n:'APTA — Find a physical therapist',u:'https://choosept.com'}] },

  { n:'08b', name:'Injury history & joint health', tag:'JOINTS', tc:'#C04A20',
    act:['List all current injuries, surgeries, or chronic pain areas honestly',
         'Joint pain is a signal — inflammation is upstream of injury and must be addressed',
         'KOT system: knees over toes is the long-term solution to joint degeneration',
         'Begin tibialis anterior work and reverse Nordic progressions — Ben Patrick fundamentals',
         'Consider whether unresolved injuries are limiting your training and quality of life'],
    res:[{n:'KOT Channel — Ben Patrick',u:'https://www.youtube.com/c/TheKneesovertoesguy'},
         {n:'ATG Online Coaching',u:'https://www.atgonlinecoaching.com'}] },
    { n:'09', name:'Chronic stress', tag:null,
    sub:'Persistent work, financial, or relationship stress — cortisol chronically elevated',
    imm:['Name your single biggest cortisol driver — write it down specifically and precisely right now',
         'Add one 10-minute daily decompression ritual: walk, breathwork, or complete silence',
         'Practice box breathing any time stress spikes: 4 in, hold 4, out 4, hold 4'],
    tools:['Chronically elevated cortisol literally shrinks the hippocampus — this is measurable on MRI',
           'Cortisol disrupts sleep, inflames the gut, suppresses testosterone, and impairs memory formation',
           'Reduce phone notifications by 50% today — digital overstimulation chronically elevates cortisol'],
    adv:['Phosphatidylserine 100–300mg daily helps blunt the cortisol response directly',
         'HRV tracking measures your stress recovery objectively — Whoop or Garmin are best in class',
         'Adaptogens: ashwagandha and rhodiola both have peer-reviewed cortisol-modulating evidence'],
    res:[{n:'Huberman Lab — stress & anxiety tools',u:'https://hubermanlab.com'},
         {n:'HeartMath HRV biofeedback',u:'https://heartmath.com'},
         {n:'Calm app',u:'https://calm.com'}] },

  { n:'10', name:'Excess body fat', tag:null,
    sub:'Significant visceral or abdominal fat — waist over 40 in, or body fat over 25%',
    imm:['Measure your waist at the navel right now and record that number in your workbook',
         'Calculate your protein target: target bodyweight (lbs) × 0.9 = daily grams',
         'Cut one ultra-processed food from your daily routine starting today'],
    tools:['Visceral fat is metabolically active — it produces cytokines that cross the blood-brain barrier',
           'Waist circumference at the navel is your best daily proxy for visceral fat — not the scale',
           'The 3-day training protocol directly targets visceral fat via improved insulin sensitivity',
           'Resistance training + high protein targets visceral fat faster than caloric restriction alone'],
    adv:['A DEXA scan or InBody scan gives accurate and actionable body fat percentage',
         'If waist is over 40 inches, request metabolic bloodwork: HbA1c, fasting insulin, triglycerides',
         'Visceral fat responds rapidly to the combined 4M protocol — expect significant change by Day 60'],
    res:[{n:'InBody scan locator',u:'https://inbodyusa.com/pages/find-a-location'},
         {n:'Peter Attia — metabolic health',u:'https://peterattiamd.com'},
         {n:'DEXA scan locator',u:'https://dexascan.com'}] },

  { n:'11', name:'Social isolation & lack of purpose', tag:null,
    sub:'Limited meaningful connection, or absence of goals that genuinely excite you',
    imm:['Reach out to one person you have been meaning to connect with this week — today',
         'Write down one goal that genuinely excites you for the next 90 days',
         'Introduce yourself actively in the 4M cohort group before the next live call'],
    tools:['Loneliness raises dementia risk as much as smoking 15 cigarettes per day — peer-reviewed',
           'Purpose activates the prefrontal cortex and keeps dopamine systems calibrated with age',
           'The Waldorf study found social connection is the single strongest predictor of cognitive health at 80',
           'This cohort is itself a direct intervention for this risk factor — use it actively not passively'],
    adv:['If isolation feels entrenched, consider a therapist or a structured men\'s accountability group',
         'Ikigai: find the overlap of what you love, what you\'re good at, what the world needs, and what pays',
         'The 4M alumni community at graduation directly addresses this factor long-term'],
    res:[{n:'Meetup.com',u:'https://meetup.com'},
         {n:'Good Men Project',u:'https://goodmenproject.com'}] },

  { n:'12', name:'Cognitive disengagement', tag:null,
    sub:'No learning, reading, creative hobbies, or mentally stimulating activities daily',
    imm:['Commit to 30 minutes of uninterrupted reading today — no phone, no TV, no interruptions',
         'Download a dual n-back app and complete your first session this week',
         'Identify one new skill you want to start learning this month and write it down'],
    tools:['Neural circuits that are not regularly activated begin to prune — use it or lose it is literal biology',
           'Dual n-back is the only cognitive training with peer-reviewed transfer to real-world intelligence',
           'Long-form reading rebuilds the sustained attention capacity that digital media has systematically eroded',
           'Cognitive reserve built over years is your best protection against Alzheimer\'s onset'],
    adv:['Take a language class, chess course, or music lesson — novelty drives neuroplastic change',
         'Track cognitive performance weekly: rate focus, memory, and mood each 1–10 every Sunday evening',
         'The combination of dual n-back + long-form reading is the most evidence-backed cognitive protocol available'],
    res:[{n:'Dual N-Back app (iOS)',u:'https://apps.apple.com/us/app/dual-n-back/id507031600'},
         {n:'Duolingo',u:'https://duolingo.com'},
         {n:'Lumosity',u:'https://lumosity.com'}] }
];

const SUPPLEMENTS = [
  {n:'The Doctor TJ Special', d:'As directed (compounded)', t:'Morning — fasted or with small meal', w:'BPC-157 + L-Glutamine proprietary blend — gut lining repair, neuroinflammation reduction, dual gut-brain protection', week1:true, special:true},
  {n:'Magnesium glycinate', d:'300–400mg', t:'Before bed', w:'Sleep quality, cortisol regulation, neuroprotection — most impactful first supplement for sleep', week1:true, special:false},
  {n:'Omega-3 EPA/DHA', d:'2–3g EPA/DHA', t:'With a meal (Week 2+)', w:'Anti-inflammatory, neuronal membrane integrity, mood regulation, cardiovascular support', week2:true},
  {n:'Vitamin D3 + K2', d:'5,000 IU D3 + 100mcg K2-MK7', t:'With a fatty meal (Week 2+)', w:'Neuroprotection, testosterone support, immune function — K2 ensures calcium goes to bones not arteries', week2:true},
  {n:'B-complex (methylated)', d:'As directed', t:'With breakfast (Week 3+)', w:'Neurotransmitter synthesis, energy metabolism, homocysteine clearance — methylated forms only (B6 as P-5-P, B12 as methylcobalamin)', week3:true},
  {n:"Lion's mane mushroom", d:'500–1000mg', t:'Daily morning (Month 2+)', w:'NGF production, neuroplasticity, memory formation — introduced in Month 2', future:true},
  {n:'Bacopa monnieri', d:'300mg', t:'Daily — 12-week cycle (Month 2+)', w:'Memory consolidation, anxiety reduction — introduced in Month 2', future:true},
  {n:'Phosphatidylserine', d:'100–300mg', t:'Daily (Month 2+)', w:'Cortisol regulation, cognitive sharpness — introduced in Month 2', future:true}
];

const MOVEMENTS = [
  {n:'Box breathing', p:'4–6 rounds of 4-4-4-4 throughout · set intention in fireside squat', u:'https://www.youtube.com/watch?v=tybOi4hjZFQ'},
  {n:'Fireside squat (or Sumo)', p:'60–90 sec · Fireside = heels flat, hips below parallel · Sumo = feet wide, press knees out · choose based on current mobility · sumo is the modification', u:'https://youtube.com/watch?v=xHQ5ZPdqvJo'},
  {n:'Lunge stretch', p:'45 sec each side · back knee down · press hips forward', u:'https://youtube.com/watch?v=1l5ZEcHJ0yU'},
  {n:'Hip circles', p:'30 sec each direction · large slow deliberate circles', u:'https://youtube.com/watch?v=Zzh_cBhAQsA'},
  {n:'Morning sunlight', p:'10–20 min · face toward sky · no sunglasses · stack with breathing', u:null},
  {n:'Cold shower finish', p:'1 min minimum fully cold · non-negotiable from Day 1', u:'https://youtube.com/watch?v=pq6WHJzOkno'}
];

const TABS = [
  {id:'dash',  label:'Dashboard',           icon:'⚡'},
  {id:'w1',    label:'Week 1 — Mitigate',   icon:'🧠'},
  {id:'morn',  label:'Morning Protocol',    icon:'🌅'},
  {id:'w2',    label:'Week 2 — Muscle',     icon:'💪'},
  {id:'nutr',  label:'Nutrition & Fasting', icon:'🥩'},
  {id:'w3',    label:'Week 3 — Mind',       icon:'🔬'},
  {id:'w4',    label:'Week 4 — Motivate',   icon:'🎯'},
  {id:'regen', label:'Bonus — Regenerative',icon:'⊕'}
];

const WCOLORS = {
  1:{bg:'#085041', ac:'#1D9E75', label:'Week 1 — All 4 Pillars Begin Today',
     sub:'Mitigate · Muscle · Mind · Motivate — baselines, audit & first actions',
     focus:'Mitigate (deep focus): 12-Factor Audit'},
  2:{bg:'#7A2E14', ac:'#E05C2A', label:'Week 2 — Build the Foundation',
     sub:'Mitigate · Muscle · Mind · Motivate — actions in motion, tracking begins',
     focus:'Muscle (deep focus): Movement & Protein'},
  3:{bg:'#0C447C', ac:'#2E7FD9', label:'Week 3 — Deepen the Work',
     sub:'Mitigate · Muscle · Mind · Motivate — full supplement stack + mid-month check',
     focus:'Mind (deep focus): Full Supplement Stack'},
  4:{bg:'#3C3489', ac:'#6B5ED4', label:'Week 4 — Integration & Identity',
     sub:'Mitigate · Muscle · Mind · Motivate — re-audit, progress, Month 2 commitment',
     focus:'Motivate (deep focus): Identity & Month 2 Vision'}
};

const FASTING = [
  {m:'Month 1', w:'14:10', f:'After 9am (post-morning routine)', l:'By 7PM → 6PM → 5PM (progress by closing earlier)', n:'Foundation — build the habit. Move LAST meal earlier as you adapt.', c:'#1D9E75'},
  {m:'Month 2', w:'16:8',  f:'After 11am', l:'Before 7pm', n:'Deepen fat adaptation',         c:'#E05C2A'},
  {m:'Month 3', w:'18:6',  f:'After 12pm', l:'Before 6pm', n:'Significant autophagy',          c:'#2E7FD9'},
  {m:'Month 4', w:'OMAD',  f:'1–4 hr window',l:'Variable', n:'Deep cellular renewal',          c:'#6B5ED4'}
];

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
let curTab = 'dash';
let openFactor = null;
let factorTab = 'imm';

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function auditFilled() { return Object.values(S.scores).filter(v=>v>0).length; }
function auditTotal()  { return Object.values(S.scores).reduce((a,b)=>a+(Number(b)||0),0); }
function mornings()    { return Object.values(S.morn).filter(Boolean).length; }
function colds()       { return Object.values(S.cold).filter(Boolean).length; }

function riskBand(score) {
  if (score <= 28) return {label:'Low risk',    color:'#1D9E75', bg:'rgba(29,158,117,.1)'};
  if (score <= 49) return {label:'Moderate risk',color:'#D4920A', bg:'rgba(212,146,10,.1)'};
  return              {label:'High risk — fastest results', color:'#E05C2A', bg:'rgba(224,92,42,.1)'};
}

function scoreBtnColor(n) {
  if (n <= 2) return '#1D9E75';
  if (n === 3) return '#D4920A';
  return '#E05C2A';
}

// ══════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════
function weekBanner(w) {
  const wc = WCOLORS[w];
  return `<div class="week-banner" style="background:${wc.bg}CC;border:1px solid ${wc.ac}55">
    <div class="week-tag" style="color:${wc.ac};margin-bottom:4px">WEEK ${w} OF 4</div>
    <div class="week-name">${wc.label}</div>
    <div class="week-sub" style="margin-top:5px">${wc.sub}</div>
    <div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#fff">⭐ ${wc.focus}</div>
  </div>`;
}

function scoreBtns(fNum) {
  const sc = S.scores[fNum] || 0;
  return [1,2,3,4,5].map(n => {
    const c = scoreBtnColor(n);
    const active = sc === n;
    return `<button class="score-btn" 
      style="background:${active?c:'#FFFFFF'};color:${active?'#fff':'#6A9A74'};border-color:${active?c:'#D8E8DC'}"
      onclick="setScore('${fNum}',${n});event.stopPropagation()">${n}</button>`;
  }).join('');
}

function morningTracker(w) {
  const wc = WCOLORS[w];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dayBtns = days.map((d,i) => {
    const key = `w${w}d${i+1}`;
    const done = S.morn[key];
    return `<button class="day-btn"
      style="background:${done?wc.ac:'#FFFFFF'};color:${done?'#fff':'#5A8A64'};border-color:${done?wc.ac:'#D8E8DC'}"
      onclick="toggleDay('morn','${key}')">
      <span style="font-size:10px;font-weight:700">${d.charAt(0)}</span>
      <span style="font-size:8px;color:inherit;opacity:.7">${i+1}</span>
    </button>`;
  }).join('');
  const coldBtns = days.map((d,i) => {
    const key = `cw${w}d${i+1}`;
    const done = S.cold[key];
    return `<button class="cold-btn"
      style="background:${done?'#2E7FD9':'#FFFFFF'};color:${done?'#fff':'#6A9A74'};border-color:${done?'#2E7FD9':'#D8E8DC'}"
      onclick="toggleDay('cold','${key}')">${d.charAt(0)}</button>`;
  }).join('');
  const doneCt = days.filter((_,i) => S.morn[`w${w}d${i+1}`]).length;
  return `<div class="card" style="border-color:${wc.ac}55">
    <div class="card-title"><span style="color:${wc.ac}">Week ${w}</span> Morning Protocol Tracker</div>
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Tap each day you completed all 7 elements</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">${dayBtns}</div>
    <div class="g2" style="margin-bottom:12px">
      <div>
        <label>Days completed</label>
        <div style="font-size:26px;font-weight:700;color:${wc.ac};margin-top:4px">${doneCt} / 7</div>
      </div>
      <div>
        <label>Cold showers</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${coldBtns}</div>
      </div>
    </div>
    <label>Week ${w} morning reflection</label>
    <textarea placeholder="How did the protocol feel? What improved? What was hard?"
      oninput="S.mornRef['w${w}']=this.value;save()">${esc(S.mornRef[`w${w}`]||'')}</textarea>
  </div>`;
}

function factorDetail(f) {
  const tabs = [{k:'imm',l:'Immediate'},{k:'tools',l:'Tools'},{k:'adv',l:'Advanced'},{k:'res',l:'Resources'}];
  const tabBtns = tabs.map(t =>
    `<button class="ftab${factorTab===t.k?' active':''}" onclick="setFactorTab('${t.k}')">${t.l}</button>`
  ).join('');

  let content = '';
  const bullet = (items, color) => items.map(item =>
    `<div class="bitem"><span class="dot" style="color:${color}">▸</span><span style="color:#1A3A20">${esc(item)}</span></div>`
  ).join('');

  if (factorTab === 'imm')   content = bullet(f.imm, '#1D9E75');
  else if (factorTab === 'tools') content = bullet(f.tools, '#2E7FD9');
  else if (factorTab === 'adv')   content = bullet(f.adv, '#D4920A');
  else content = `<div style="display:flex;flex-wrap:wrap;gap:7px">
    ${f.res.map(r => `<a class="res-pill" href="${r.u}" target="_blank">${esc(r.n)} ↗</a>`).join('')}
  </div>`;

  return `<div class="factor-body">
    ${f.cm ? `<div style="background:#1E5FA0;border-radius:9px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:4px">Connected Mind — Complete Before Scoring</div>
      <div style="font-size:11px;color:#B5D4F4;margin-bottom:8px">Complete this assessment before finalizing your score for Factor 01.</div>
      <a href="#" class="btn sm primary">Take the Assessment ↗</a>
    </div>` : ''}
    <div class="info-box" style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.25);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:11px;color:#3A6A44"><strong style="color:#1D9E75">Box breathing</strong> — 4 counts in · hold 4 · out 4 · hold 4 · repeat 4 times</span>
      <a href="https://youtube.com/watch?v=tybOi4hjZFQ" target="_blank" class="btn xs primary">▶ Watch</a>
    </div>
    <div class="ftab-row">${tabBtns}</div>
    <div style="margin-bottom:14px">${content}</div>
    <label>My personal action plan for this factor</label>
    <textarea placeholder="What specifically will I do? When? How will I measure progress?"
      oninput="S.plans['${f.n}']=this.value;save()">${esc(S.plans[f.n]||'')}</textarea>
  </div>`;
}

// ══════════════════════════════════════════
// PAGE RENDERERS
// ══════════════════════════════════════════
function renderDash() {
  const af = auditFilled(), at = auditTotal(), m = mornings(), c = colds();
  const risk = af === 12 ? riskBand(at) : null;
  return `
  <div class="page-title" style="color:#1D9E75">Mind · Muscle · Mitigate · Motivate</div>
  <div class="page-sub">Month 1 — Brain Optimization for Men 35+</div>

  <div class="card">
    <div class="card-title">Your Profile</div>
    <div class="g3">
      <div><label>Full name</label>
        <input value="${esc(S.name)}" placeholder="Your name"
          oninput="S.name=this.value;save();updateSidebar()"></div>
      <div><label>Start date</label>
        <input value="${esc(S.startDate)}" placeholder="e.g. April 14, 2026"
          oninput="S.startDate=this.value;save()"></div>
      <div><label>Cohort</label>
        <input value="${esc(S.cohort)}" placeholder="Cohort #"
          oninput="S.cohort=this.value;save()"></div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-num" style="color:#1D9E75">${af}/12</div>
      <div class="stat-lbl">FACTORS SCORED</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#1D9E75">${af===12 ? at : '—'}</div>
      <div class="stat-lbl">AUDIT SCORE /60</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#2E7FD9">${m}</div>
      <div class="stat-lbl">MORNINGS DONE</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#2E7FD9">${c}</div>
      <div class="stat-lbl">COLD SHOWERS</div>
    </div>
  </div>

  ${risk ? `<div class="card" style="background:${risk.bg};border-color:${risk.color}55;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:15px;font-weight:700;color:${risk.color};margin-bottom:3px">${risk.label}</div>
        <div style="font-size:12px;color:#4A7A54">
          ${at<=24 ? 'Strong foundations — focus on fine-tuning and optimization.'
          : at<=40 ? 'Multiple factors working against you. Targeted action yields rapid results.'
          : 'This program was built for you. Major gains are available very quickly.'}
        </div>
      </div>
      <div style="font-size:52px;font-weight:700;color:${risk.color};line-height:1">${at}</div>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Month 1 Progress</div>
    ${[
      {l:'Mitigate audit (14 factors)', v:af, mx:14, c:'#1D9E75'},
      {l:'Morning protocol (28 days)',  v:m,  mx:28, c:'#2E7FD9'},
      {l:'Cold shower streak',          v:c,  mx:28, c:'#2E7FD9'}
    ].map(p => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#4A7A54;margin-bottom:5px">
          <span>${p.l}</span><span style="color:${p.c}">${p.v} / ${p.mx}</span>
        </div>
        <div class="pbar-wrap">
          <div class="pbar-fill" style="width:${Math.min(100,(p.v/p.mx)*100)}%;background:${p.c}"></div>
        </div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Quick Navigation</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${TABS.slice(1).map(t =>
        `<button class="btn" onclick="goTo('${t.id}')">${t.icon} ${t.label}</button>`
      ).join('')}
    </div>
  </div>`;
}

function renderW1() {
  const af = auditFilled(), at = auditTotal();

  // ── PILLAR HEADER helper ──
  function pillarHeader(num, title, color, tagline) {
    return `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;
      background:${color};border-radius:10px 10px 0 0;margin:-20px -20px 16px">
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);
        display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
        color:#fff;flex-shrink:0">${num}</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:.02em">${title}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.8);letter-spacing:.04em">${tagline}</div>
      </div>
    </div>`;
  }

  function thisWeekBox(items, color) {
    return `<div style="background:${color}0F;border:1.5px solid ${color}44;border-radius:9px;
      padding:13px 16px;margin-top:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:${color};margin-bottom:9px">
        ▶ START THIS WEEK
      </div>
      ${items.map(i => `<div style="display:flex;gap:9px;padding:5px 0;font-size:12px;
        color:#1A2E1E;line-height:1.5;border-bottom:1px solid ${color}22">
        <span style="color:${color};flex-shrink:0;font-weight:700">✓</span>
        <span>${i}</span>
      </div>`).join('')}
    </div>`;
  }

  // ── MITIGATE factor cards ──
  const factorCards = FACTORS.map(f => {
    const sc = S.scores[f.n] || 0;
    const open = openFactor === f.n;
    return `<div class="factor-card" style="${f.cm ? 'border-color:#2E7FD955' : ''}">
      <div class="factor-header" onclick="toggleFactor('${f.n}')">
        <span class="factor-num">${f.n}</span>
        <div style="flex:1">
          <div class="factor-name">${esc(f.name)}
            ${f.tag ? `<span class="pill" style="background:${f.tc||'#1D9E75'}20;color:${f.tc||'#1D9E75'};margin-left:8px;font-size:9px">${f.tag}</span>` : ''}
          </div>
          <div class="factor-sub">${esc(f.sub)}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center">${scoreBtns(f.n)}</div>
        <span style="color:#6A8A6E;margin-left:8px;font-size:13px">${open ? '▲' : '▼'}</span>
      </div>
      ${open ? factorDetail(f) : ''}
    </div>`;
  }).join('');

  return `${weekBanner(1)}

  <!-- ══ WEEK 1 INTRO ══ -->
  <div style="background:#F0FAF5;border:1.5px solid #B8E8D0;border-radius:11px;padding:16px 20px;margin-bottom:20px">
    <div style="font-size:13px;font-weight:700;color:#1A5A34;margin-bottom:6px">Week 1 — All 4 Pillars Begin Today</div>
    <div style="font-size:12px;color:#3A7A4E;line-height:1.75">
      Week 1 introduces the foundation of every pillar. You will go deep on Mitigate — scoring all 14 risk factors — 
      and establish your baselines for Muscle, Mind, and Motivate. Each pillar gets its own dedicated deep-dive in weeks 2–4. 
      But everything starts <strong>today</strong>.
    </div>
  </div>

  <!-- ══ MOTIVATE — FOUNDATION ══ -->
  <div class="card">
    ${pillarHeader('M4','MOTIVATE — Foundation','#6B5ED4','Why are you here? Lock in your reason before anything else.')}
    <div style="margin-bottom:14px">
    ${['Fear of cognitive decline — I don\'t want to lose my sharpness or independence as I age',
       'Desire to optimize — I want to perform at my absolute peak for as long as possible',
       'Both equally — motivated by avoiding decline AND reaching my highest potential'
    ].map((opt,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
        background:${S.motivation===String(i)?'rgba(107,94,212,.07)':'#FFFFFF'};
        border:1.5px solid ${S.motivation===String(i)?'#6B5ED4':'#D8E8DC'};
        border-radius:8px;cursor:pointer;margin-bottom:7px"
        onclick="S.motivation='${i}';save();render()">
        <div style="width:16px;height:16px;border-radius:50%;
          border:2px solid ${S.motivation===String(i)?'#6B5ED4':'#D8E8DC'};
          background:${S.motivation===String(i)?'#6B5ED4':'transparent'};flex-shrink:0"></div>
        <span style="font-size:12.5px;color:#1A2E1E">${esc(opt)}</span>
      </div>`).join('')}
    </div>
    <label>My "why" — the man I want to be at age 70</label>
    <textarea style="min-height:70px" placeholder="Write it here — you will read this aloud on graduation day..."
      oninput="S.why=this.value;save()">${esc(S.why)}</textarea>
    <label style="margin-top:12px">My identity statement (draft) — "I am a man who..."</label>
    <input placeholder="I am a man who..." value="${esc(S.identity)}"
      oninput="S.identity=this.value;save()">
    ${thisWeekBox([
      'Write your "why" above — be specific about the man you want to be at 70',
      'Complete the Morning Protocol Level 1 every morning starting tomorrow — fasted, outdoors',
      'Cold shower closes every morning from Day 1 — 1 minute minimum, non-negotiable'
    ], '#6B5ED4')}
  </div>

  <!-- ══ MITIGATE — DEEP FOCUS THIS WEEK ══ -->
  <div class="card">
    ${pillarHeader('M1','MITIGATE — Week 1 Deep Focus','#1D9E75','Score all 14 risk factors. Identify your top 3 leverage points.')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:12px;color:#5A8A64">Score each factor honestly 1–5. High score = fastest results when addressed.</div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:700;color:${af===14 ? riskBand(at).color : '#1D9E75'}">
          ${af===14 ? at : `${af}/14`}
        </div>
        <div style="font-size:9px;color:#6A8A6E">${af===14 ? '/ 70 total' : 'factors scored'}</div>
      </div>
    </div>
    <div class="pbar-wrap" style="margin-bottom:16px">
      <div class="pbar-fill" style="width:${(af/14)*100}%;background:#1D9E75"></div>
    </div>
    ${af===14 ? (() => {
      const r = riskBand(at);
      return `<div style="background:${r.color}12;border:1.5px solid ${r.color}44;border-radius:9px;
        padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:700;color:${r.color}">${r.label}</div>
          <div style="font-size:11px;color:#5A8A64;margin-top:2px">
            ${at<=24?'Strong foundations — focus on optimization and fine-tuning.'
            :at<=40?'Multiple factors working against you. Targeted action yields rapid results.'
            :'This program was built for you. Major gains are available very quickly.'}
          </div>
        </div>
        <div style="font-size:44px;font-weight:700;color:${r.color};line-height:1">${at}</div>
      </div>`;
    })() : ''}
    ${factorCards}
    <div style="margin-top:16px">
      <div class="card-title">My Top 3 Priority Factors</div>
      ${[0,1,2].map(i => `
        <div style="margin-bottom:9px">
          <label>${i+1}. ${['Highest score — fastest results','Second priority','Third priority'][i]}</label>
          <input value="${esc(S.priorities[i])}" placeholder="Factor name and number..."
            oninput="S.priorities[${i}]=this.value;save()">
        </div>`).join('')}
      <div class="card-title" style="margin-top:12px">My Specific Commitments</div>
      ${[0,1,2].map(i => `
        <div style="margin-bottom:9px">
          <label>Priority ${i+1} — this week I will</label>
          <input value="${esc(S.commitments[i])}" placeholder="Be specific — what, when, how..."
            oninput="S.commitments[${i}]=this.value;save()">
        </div>`).join('')}
    </div>
    ${thisWeekBox([
      'Score all 12 factors above before Module 1 ends',
      'Write your top 3 priorities and specific commitments',
      'Take the Connected Mind assessment for Factor 01 (link inside factor 01)',
      'Schedule your dental cleaning this month — Factor 03, cardiac + brain protection',
      'Add one fermented food today — yogurt, kefir, sauerkraut, or kimchi (Factor 02)',
      'Start the Doctor TJ Special gut repair protocol — see the Mind section below'
    ], '#1D9E75')}
  </div>

  <!-- ══ MUSCLE — BASELINE ══ -->
  <div class="card">
    ${pillarHeader('M2','MUSCLE — Establish Your Baseline','#E05C2A','Record where you are starting. Week 2 goes deep on training and nutrition.')}
    <div style="font-size:12px;color:#5A7A5E;margin-bottom:16px;line-height:1.7">
      These numbers are not a grade — they are your starting point. You will retest these same 3 strength movements on the FIRST workout of every week. Week 4 comparison will show your 30-day transformation.
    </div>

    <div class="card-title" style="color:#E05C2A">⬆ Week 1 Strength Baseline — 3 Max-Effort Tests</div>
    <p style="font-size:12px;color:#5A4030;line-height:1.8;margin-bottom:12px">
      Perform each test fresh — rest 3–5 min between movements. Record max reps or max hang time.
      Use the modification that lets you complete the movement with good form.
      <strong>Re-test these exact 3 movements as your first exercise every week.</strong>
    </p>
    <div style="display:grid;gap:10px;margin-bottom:16px">
      <div style="background:#FFFFFF;border:1px solid #E05C2A33;border-radius:10px;padding:14px">
        <div style="font-size:12.5px;font-weight:700;color:#7A2E14;margin-bottom:6px">① Pull-ups / Dead Hang</div>
        <div style="font-size:11px;color:#6A5040;line-height:1.7;margin-bottom:10px">
          <strong>Pull-ups:</strong> max reps, dead hang start, chin over bar<br>
          <strong>Dead hang:</strong> hold as long as possible (seconds) — use if pull-ups aren't available yet
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Pull-up reps</label>
          <input type="number" min="0" placeholder="0" style="width:65px;padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:12px"
            value="${esc(S.str?.pullups||'')}" oninput="if(!S.str)S.str={};S.str.pullups=this.value;save()"></div>
          <div style="font-size:11px;color:#9A6A54;padding-top:16px">OR</div>
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Dead hang (sec)</label>
          <input type="number" min="0" placeholder="0" style="width:65px;padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:12px"
            value="${esc(S.str?.deadhang||'')}" oninput="if(!S.str)S.str={};S.str.deadhang=this.value;save()"></div>
        </div>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E05C2A33;border-radius:10px;padding:14px">
        <div style="font-size:12.5px;font-weight:700;color:#7A2E14;margin-bottom:6px">② Push-ups</div>
        <div style="font-size:11px;color:#6A5040;line-height:1.7;margin-bottom:10px">
          <strong>Floor push-up:</strong> chest to floor, full lock-out — max reps<br>
          <strong>Incline:</strong> hands on bar top / counter / bench — good modification<br>
          <strong>Knee push-up:</strong> knees down, straight line from knee to shoulder — entry level
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Reps</label>
          <input type="number" min="0" placeholder="0" style="width:65px;padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:12px"
            value="${esc(S.str?.pushups||'')}" oninput="if(!S.str)S.str={};S.str.pushups=this.value;save()"></div>
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Type</label>
          <select style="padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:11px;color:#5A4030;background:#fff"
            onchange="if(!S.str)S.str={};S.str.pushupsType=this.value;save()">
            <option value="">— select —</option>
            <option value="full" ${S.str?.pushupsType==='full'?'selected':''}>Floor (full)</option>
            <option value="incline" ${S.str?.pushupsType==='incline'?'selected':''}>Incline</option>
            <option value="knee" ${S.str?.pushupsType==='knee'?'selected':''}>Knee push-up</option>
          </select></div>
        </div>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E05C2A33;border-radius:10px;padding:14px">
        <div style="font-size:12.5px;font-weight:700;color:#7A2E14;margin-bottom:6px">③ Bodyweight Squats</div>
        <div style="font-size:11px;color:#6A5040;line-height:1.7;margin-bottom:10px">
          <strong>Full squat:</strong> below parallel, arms forward for counterbalance — max reps<br>
          <strong>Arm-assisted:</strong> hold TRX straps, a counter, or door frame — full depth is the goal regardless
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Reps</label>
          <input type="number" min="0" placeholder="0" style="width:65px;padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:12px"
            value="${esc(S.str?.squats||'')}" oninput="if(!S.str)S.str={};S.str.squats=this.value;save()"></div>
          <div><label style="font-size:10.5px;color:#7A2E14;font-weight:600;display:block;margin-bottom:3px">Type</label>
          <select style="padding:5px 8px;border:1px solid #E05C2A44;border-radius:6px;font-size:11px;color:#5A4030;background:#fff"
            onchange="if(!S.str)S.str={};S.str.squatsType=this.value;save()">
            <option value="">— select —</option>
            <option value="full" ${S.str?.squatsType==='full'?'selected':''}>Unassisted</option>
            <option value="assisted" ${S.str?.squatsType==='assisted'?'selected':''}>Arm-assisted</option>
          </select></div>
        </div>
      </div>
    </div>
    <div style="background:#E05C2A12;border-radius:8px;padding:9px 13px;font-size:11px;color:#7A2E14;margin-bottom:16px">
      💡 <strong>Weekly retest rule:</strong> Test these 3 movements first thing on your first workout of each week (Weeks 2, 3, 4 — same movements, same modifications). Progress is the only metric.
    </div>

    <div class="card-title">Body Composition — Week 1 Baseline</div>
    <div class="g2" style="margin-bottom:16px">
      ${[['weight','Body weight (lbs)'],['waist','Waist at navel (in)'],
         ['energy','Morning energy (1–10)'],['mood','Mood rating (1–10)']].map(([k,l]) => `
        <div>
          <label>${l}</label>
          <input value="${esc(S.base[k]||'')}" placeholder="Record now..."
            oninput="S.base['${k}']=this.value;save()">
        </div>`).join('')}
    </div>

    <div class="card-title">Strength Baseline — Week 1</div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr 0.8fr;gap:8px;margin-bottom:6px">
      ${['Exercise','Weight / resistance','Reps'].map(h =>
        `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#7A9A7E">${h}</div>`
      ).join('')}
    </div>
    ${[['squat','Squat / goblet squat'],['bench','Bench press / push-up'],
       ['pullup','Pull-up / lat pulldown'],['rdl','Romanian deadlift'],
       ['zone2','Zone 2 cardio (minutes)']].map(([k,l]) => `
      <div style="display:grid;grid-template-columns:1.5fr 1fr 0.8fr;gap:8px;margin-bottom:7px;align-items:center">
        <div style="background:#F0FAF5;border:1px solid #D0E8D8;border-radius:7px;
          padding:8px 10px;font-size:11px;color:#3A6A44;font-weight:600">${l}</div>
        <input placeholder="Weight / level" style="font-size:11px"
          value="${esc(S.trainLog[k+'_weight']||'')}"
          oninput="S.trainLog['${k}_weight']=this.value;save()">
        <input placeholder="Reps" style="font-size:11px"
          value="${esc(S.trainLog[k+'_reps']||'')}"
          oninput="S.trainLog['${k}_reps']=this.value;save()">
      </div>`).join('')}

    <div class="card-title" style="margin-top:16px">Nutrition — Starting Point</div>
    <div style="background:#FFF8F0;border:1.5px solid #E05C2A44;border-radius:9px;padding:13px 16px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:#E05C2A;margin-bottom:8px">EATING WINDOW — STARTS TODAY</div>
      <div style="font-size:12px;color:#5A4030;line-height:1.7">
        <strong style="color:#1A2E1E">14:10 window:</strong> First meal after 9am <em>(only after morning routine is complete)</em> · Last meal by 7PM · 
        Morning routine and workout done completely fasted (water or black coffee only). 
        <strong>Progression: shorten your window by moving your last meal earlier — 7PM → 6PM → 5PM.</strong>
        This optimizes insulin, cortisol, and sleep quality. Do NOT eat earlier — only close the window sooner.
        This is the foundation. Month 2 extends to 16:8.
      </div>
    </div>
    <div class="g2">
      <div>
        <label>Target bodyweight for protein calc (lbs)</label>
        <input type="number" placeholder="e.g. 185" value="${esc(S.protein)}"
          oninput="S.protein=this.value;save();render()">
      </div>
      ${Number(S.protein)>0 ? `<div style="background:#F0FAF5;border:1.5px solid #B8E8D0;border-radius:9px;
        padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:28px;font-weight:700;color:#1D9E75">${Math.round(Number(S.protein)*0.9)}g</div>
        <div style="font-size:10px;color:#5A8A64">protein per day target</div>
      </div>` : `<div style="background:#FAFBF9;border:1px solid #D8E8DC;border-radius:9px;
        padding:12px;display:flex;align-items:center;justify-content:center;color:#9AB8A0;font-size:11px">
        Enter weight to calculate →
      </div>`}
    </div>
    ${thisWeekBox([
      'Measure waist at navel and record it above right now — this number will change',
      'Set your eating window: first meal after 9am (after morning routine), last meal by 7pm — progress to 6pm then 5pm over the cohort',
         'Zone 2 walk after your last meal of the day — 15–30 min, easy conversational pace, aids digestion and appetite control',
         'Last meal dessert: dark chocolate (min 80% cacao) + pumpkin seeds — both are dense in magnesium, prime your body for sleep, pair perfectly with your Magnesium Glycinate before bed',
      'Eliminate all seed oils this week: canola, soybean, corn, sunflower, safflower',
      'Schedule your 3 training days in your calendar — non-negotiable',
      'Swap one meal to grass-fed beef, wild game, or wild-caught salmon',
      'Add bone broth daily — 8–16 oz supports gut lining repair alongside the Doctor TJ Special'
    ], '#E05C2A')}
  </div>

  <!-- ══ GUT REPAIR CALLOUT ══ -->
  <div style="background:linear-gradient(135deg,#FFF8E8,#FFF3D0);border:2px solid #D4920A66;
    border-radius:12px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden">
    <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;
      background:radial-gradient(ellipse,rgba(212,146,10,.1),transparent 70%)"></div>
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#D4920A;margin-bottom:8px">
      WEEK 1 PRIORITY — GUT REPAIR
    </div>
    <div style="font-size:16px;font-weight:700;color:#1A2E1E;margin-bottom:10px;line-height:1.3">
      Your Gut Is the Foundation of Your Brain.<br>We Repair It First.
    </div>
    <div style="font-size:12.5px;color:#5A4020;line-height:1.8;margin-bottom:14px">
      The gut-brain axis is bidirectional — inflammation in the gut travels directly to the brain via the 
      vagus nerve. Leaky gut means leaky brain. Before we optimize cognition, we must repair the gut lining 
      that is leaking inflammatory signals upstream. This is why gut repair is Week 1 priority, not Week 2 or 3.
    </div>
    <div class="g2">
      <div style="background:rgba(212,146,10,.08);border:1px solid #D4920A44;border-radius:9px;padding:12px">
        <div style="font-size:11px;font-weight:700;color:#D4920A;margin-bottom:6px">BPC-157 — BRAIN</div>
        <div style="font-size:11px;color:#5A4020;line-height:1.6">
          Oral BPC-157 crosses into systemic circulation and has demonstrated neuroprotective effects — 
          reducing neuroinflammation, supporting dopamine and serotonin pathways, and protecting neurons 
          from oxidative damage. Your brain benefits directly from this gut protocol.
        </div>
      </div>
      <div style="background:rgba(212,146,10,.08);border:1px solid #D4920A44;border-radius:9px;padding:12px">
        <div style="font-size:11px;font-weight:700;color:#D4920A;margin-bottom:6px">BPC-157 + GLUTAMINE — GUT</div>
        <div style="font-size:11px;color:#5A4020;line-height:1.6">
          BPC-157 accelerates repair of the intestinal epithelium and tight junctions that form the gut 
          barrier. L-Glutamine is the primary fuel source for enterocytes — the gut lining cells — 
          and directly rebuilds barrier integrity. Together they are a powerful gut repair stack.
        </div>
      </div>
    </div>
  </div>

  <!-- ══ MIND — BASELINE ══ -->
  <div class="card">
    ${pillarHeader('M3','MIND — Cognitive Baseline + Week 1 Supplements','#2E7FD9','Rate your starting point. Begin the two Week 1 supplements today.')}
    <div style="font-size:12px;color:#3A5A7E;margin-bottom:16px;line-height:1.7">
      Score your cognitive performance for this week honestly. These are your Week 1 baselines — 
      you will rate these every Sunday and the trend line tells the story of what this program is doing.
    </div>

    <div class="card-title">Week 1 Cognitive Baseline</div>
    <div class="g3" style="margin-bottom:20px">
      ${[['focus','Focus'],['memory','Memory'],['mood','Mood']].map(([k,l]) => `
        <div>
          <label>${l} — Week 1 (1–10)</label>
          <input type="number" min="1" max="10" placeholder="1–10"
            value="${esc(S.cogRatings['w1_'+k]||'')}"
            oninput="S.cogRatings['w1_${k}']=this.value;save()">
        </div>`).join('')}
    </div>

    <div class="card-title">Week 1 Supplements — Start These Today</div>

    <!-- Doctor TJ Special -->
    <div style="background:linear-gradient(135deg,#FFF8E8,#FFFBF0);border:2px solid #D4920A55;
      border-radius:11px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#D4920A;color:#fff;padding:3px 10px;border-radius:20px;
              font-size:9px;font-weight:700;letter-spacing:.08em">PROPRIETARY FORMULA</span>
            <span style="background:#E8F8F0;color:#1D9E75;padding:3px 10px;border-radius:20px;
              font-size:9px;font-weight:700;letter-spacing:.08em">GUT + BRAIN</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#1A2E1E;margin-bottom:4px">
            The Doctor TJ Special
          </div>
          <div style="font-size:11px;color:#7A5A20;margin-bottom:8px">
            BPC-157 + L-Glutamine · Oral form · Compounded by pharmacist
          </div>
          <div style="font-size:12px;color:#5A4020;line-height:1.7;margin-bottom:10px">
            <strong style="color:#D4920A">For your gut:</strong> BPC-157 repairs intestinal tight junctions and 
            accelerates gut lining healing. L-Glutamine fuels the enterocytes — the gut wall cells — 
            directly rebuilding barrier integrity and stopping the leaky gut → leaky brain cycle.<br><br>
            <strong style="color:#1D9E75">For your brain:</strong> Oral BPC-157 has systemic absorption with 
            documented neuroprotective effects — reduces neuroinflammation, supports dopamine and serotonin 
            pathways, and protects neurons from oxidative stress. One supplement. Two critical systems.
          </div>
          <div style="font-size:11px;color:#6A5030">
            <strong>Dosing:</strong> As directed on compounded formula · 
            <strong>Timing:</strong> Morning — fasted or with a small meal
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${['Yes','No'].map(v => `
            <button class="btn sm"
              style="background:${S.supps['s0']===v?(v==='Yes'?'#D4920A':'#E8E8E8'):'#FFFFFF'};
                color:${S.supps['s0']===v?'#fff':'#6A7A6A'};
                border-color:${S.supps['s0']===v?(v==='Yes'?'#D4920A':'#999'):'#C8DBC8'}"
              onclick="S.supps['s0']='${v}';save();render()">${v}</button>`
          ).join('')}
        </div>
      </div>
    </div>

    <!-- Magnesium Glycinate -->
    <div style="background:#F0FAF5;border:2px solid #1D9E7555;border-radius:11px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#1D9E75;color:#fff;padding:3px 10px;border-radius:20px;
              font-size:9px;font-weight:700;letter-spacing:.08em">SLEEP + BRAIN</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#1A2E1E;margin-bottom:4px">
            Magnesium Glycinate
          </div>
          <div style="font-size:11px;color:#3A7A54;margin-bottom:8px">
            300–400mg · Before bed · Chelated form for maximum absorption
          </div>
          <div style="font-size:12px;color:#2A5A3E;line-height:1.7;margin-bottom:10px">
            Magnesium is required for over 300 enzymatic reactions in the body. Most men over 35 
            are deficient. The glycinate form crosses the blood-brain barrier readily — 
            calming the nervous system, lowering cortisol, and dramatically improving deep sleep quality. 
            Deep sleep is when your brain's glymphatic system flushes amyloid beta plaques. 
            Better sleep = better brain cleaning every night.
          </div>
          <div style="font-size:11px;color:#3A7A54">
            <strong>Dosing:</strong> 300–400mg · <strong>Timing:</strong> 30 min before bed · 
            <strong>Note:</strong> Glycinate form only — oxide form has poor absorption
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${['Yes','No'].map(v => `
            <button class="btn sm"
              style="background:${S.supps['s1']===v?(v==='Yes'?'#1D9E75':'#E8E8E8'):'#FFFFFF'};
                color:${S.supps['s1']===v?'#fff':'#5A8A64'};
                border-color:${S.supps['s1']===v?(v==='Yes'?'#1D9E75':'#999'):'#C8DBC8'}"
              onclick="S.supps['s1']='${v}';save();render()">${v}</button>`
          ).join('')}
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:#5A8A9E;margin-bottom:16px;font-style:italic;padding:8px 12px;
      background:#F0F8FF;border-radius:7px;border:1px solid #C8DCEE">
      Month 1 supplement schedule: <strong>Week 1</strong> = Doctor TJ Special + Magnesium · <strong>Week 2</strong> = add Omega-3 + D3/K2 · <strong>Week 3</strong> = add Methylated B Complex · <strong>Month 2+</strong> = Lion\'s Mane, Bacopa, Phosphatidylserine →
    </div>

    <div class="card-title">Cognitive Training — Start This Week</div>
    <div style="background:#EEF5FF;border:1.5px solid #2E7FD944;border-radius:9px;padding:13px 16px">
      <div style="font-size:12px;color:#1A3060;line-height:1.7">
        <strong style="color:#2E7FD9">Dual n-back:</strong> The only cognitive training with peer-reviewed 
        transfer to real-world intelligence. 15–20 minutes, 3–4x per week. 
        Download the free app and complete one session this week.
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <a class="res-pill" href="https://apps.apple.com/us/app/dual-n-back/id507031600" target="_blank">Dual N-Back (iOS) ↗</a>
        <a class="res-pill" href="https://duolingo.com" target="_blank">Duolingo ↗</a>
      </div>
    </div>
    ${thisWeekBox([
      'Rate your Week 1 cognitive baseline above — focus, memory, mood 1–10',
      'Start the Doctor TJ Special this morning — fasted or with a small meal',
      'Start magnesium glycinate 300–400mg before bed TONIGHT — this one matters immediately',
      'Download dual n-back app and complete one session this week',
      'Read 30 minutes uninterrupted today — no phone, no TV, no interruptions'
    ], '#2E7FD9')}
  </div>

  <!-- ══ MORNING PROTOCOL ══ -->
  ${morningTracker(1)}

  <!-- ══ WEEK 1 REFLECTION ══ -->
  <div class="card">
    <div class="card-title">Week 1 Reflection — All 4 Pillars</div>
    ${[['mitigate','MITIGATE: Which risk factor surprised you most when you scored it?'],
       ['muscle','MUSCLE: What did your baseline measurements tell you?'],
       ['mind','MIND: How would you honestly describe your cognitive performance this week?'],
       ['motivate','MOTIVATE: What is your single strongest reason for completing this program?'],
       ['bigWin','My biggest win from Week 1'],
       ['different','What will I do differently in Week 2?']
    ].map(([k,l]) => `
      <div style="margin-bottom:12px">
        <label>${l}</label>
        <textarea oninput="S.wRef['w1_${k}']=this.value;save()">${esc(S.wRef['w1_'+k]||'')}</textarea>
      </div>`).join('')}
    <div class="g2" style="margin-top:6px">
      ${[['energy','Energy (1–10)'],['focus','Focus (1–10)'],['sleep','Sleep (1–10)'],['mood','Mood (1–10)']].map(([k,l]) => `
        <div>
          <label>${l} — end of week</label>
          <input type="number" min="1" max="10" placeholder="1–10"
            value="${esc(S.wRef['w1_'+k]||'')}"
            oninput="S.wRef['w1_${k}']=this.value;save()">
        </div>`).join('')}
    </div>
  </div>`;
}


function renderMorn() {
  return `
  <div class="page-title" style="color:#1D9E75">4M Morning Protocol</div>
  <div class="page-sub">Level 1 · Done fasted · Outdoors · Every morning · Cold shower closes</div>

  <div class="card" style="background:rgba(30,95,160,.06);border-color:#2E7FD944">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px">KOT Beginner Playlist — Ben Patrick</div>
        <div style="font-size:11px;color:#B5D4F4">Free YouTube system — the movement foundation of the 4M morning protocol</div>
      </div>
      <a href="https://www.youtube.com/c/TheKneesovertoesguy"
        target="_blank" class="btn primary">Open Full Playlist ↗</a>
    </div>
  </div>

  <div class="info-box" style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.2)">
    <strong style="color:#1D9E75">Stack all 7 elements simultaneously outdoors.</strong>
    Step outside fasted within 60 min of waking. Box breathe throughout. Move through the full sequence.
    Month 1 Morning Protocol: Box breathing → Fireside squat (or sumo if fireside isn't available yet) → Morning sunlight. Cold shower closes every morning — non-negotiable but does NOT have to be immediately after movement. Finish your full morning (workout, warm shower if desired) — THEN cold finish. First meal after 9AM, only after morning routine is complete.
  </div>

  <div class="card">
    <div class="card-title">Level 1 — All 7 Elements</div>
    ${MOVEMENTS.map((mv, i) => `
      <div style="display:flex;gap:13px;padding:12px 0;${i<MOVEMENTS.length-1?'border-bottom:1px solid #E8F0E855':''};align-items:flex-start">
        <div style="width:28px;height:28px;border-radius:50%;background:#0D2E1A;border:1px solid #1D9E75;
          display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
          color:#1D9E75;flex-shrink:0">${i+1}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:#1A3A20;margin-bottom:3px">${esc(mv.n)}</div>
          <div style="font-size:11px;color:#4A7A54;margin-bottom:6px">${esc(mv.p)}</div>
          ${mv.u ? `<a href="${mv.u}" target="_blank" class="btn xs" style="color:#1D9E75;border-color:#1D9E7555">▶ Watch tutorial ↗</a>` : ''}
        </div>
        ${i===6 ? `<span class="pill" style="background:rgba(224,92,42,.12);color:#E05C2A;font-size:9px;flex-shrink:0">NON-NEGOTIABLE</span>` : ''}
      </div>`).join('')}
  </div>

  ${[1,2,3,4].map(w => morningTracker(w)).join('')}`;
}

function renderW2() {
  const wc = WCOLORS[2];
  return `${weekBanner(2)}

  <!-- ══ W2 INTRO ══ -->
  <div class="card" style="background:rgba(224,92,42,.04);border:1px solid rgba(224,92,42,.18)">
    <div style="font-size:14px;font-weight:700;color:#7A2E14;margin-bottom:6px">All 4 Pillars Continue — Week 2</div>
    <div style="font-size:12.5px;color:#5A3020;line-height:1.7">
      Your baseline is set. This week everything moves from measurement to action.
      Deep focus this week is <strong>Muscle</strong> — your movement protocol and protein target.
      All four pillars get check-ins and action items below.
    </div>
  </div>

  <!-- ══ MOTIVATE — W2 ══ -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Week 2 Check-In</div>

    <div style="margin-bottom:12px">
      <label>My WHY (from Week 1) — read it out loud right now</label>
      <textarea style="min-height:52px;background:#F9F7FF;border-color:#C8C0F0;font-size:13px;font-style:italic"
        placeholder="Copy your Week 1 why statement here to keep it front of mind..."
        oninput="S.wRef['w2_why']=this.value;save()">${esc(S.wRef['w2_why']||'')}</textarea>
    </div>

    <div class="g2" style="margin-bottom:12px">
      <div>
        <label>Did my Week 1 identity statement feel true?</label>
        <textarea style="min-height:52px" placeholder="Honest reflection..."
          oninput="S.wRef['w2_identity_check']=this.value;save()">${esc(S.wRef['w2_identity_check']||'')}</textarea>
      </div>
      <div>
        <label>Who is my accountability partner for this cohort?</label>
        <input placeholder="Name and check-in method..."
          value="${esc(S.wRef['w2_acct']||'')}" oninput="S.wRef['w2_acct']=this.value;save()">
        <div style="margin-top:6px">
          <label>We agreed to check in every</label>
          <input placeholder="e.g. Sunday evening by text..."
            value="${esc(S.wRef['w2_acct_freq']||'')}" oninput="S.wRef['w2_acct_freq']=this.value;save()">
        </div>
      </div>
    </div>

    <div style="background:rgba(107,94,212,.06);border:1px solid #C8C0F0;border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#6B5ED4;letter-spacing:.07em;margin-bottom:6px">▶ MOTIVATE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#4A3A80;line-height:1.6">
        Send your WHY statement to your accountability partner by Wednesday.
        No explanation needed — just send it. Let someone outside your own head know what you are doing and why.
      </div>
    </div>
  </div>

  <!-- ══ MITIGATE — W2 ══ -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Top 3 Factor Actions</div>

    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      You identified your top 3 highest-scoring risk factors in Week 1.
      This week: execute the first immediate action for each one.
      Track your progress at the end of the week.
    </div>

    ${[1,2,3].map(n => `
    <div style="background:#F5FAF6;border:1px solid #D8E8DC;border-radius:9px;padding:14px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.06em;margin-bottom:7px">PRIORITY FACTOR ${n}</div>
      <div class="g2">
        <div>
          <label>Factor name (from your Week 1 audit)</label>
          <input placeholder="e.g. Sleep quality..."
            value="${esc(S.wRef['w2_factor'+n+'_name']||'')}"
            oninput="S.wRef['w2_factor${n}_name']=this.value;save()">
        </div>
        <div>
          <label>Week 1 score (1–5) you gave it</label>
          <input type="number" min="1" max="5" placeholder="1–5"
            value="${esc(S.wRef['w2_factor'+n+'_score']||'')}"
            oninput="S.wRef['w2_factor${n}_score']=this.value;save()">
        </div>
      </div>
      <div style="margin-top:8px">
        <label>Immediate action I took this week</label>
        <textarea style="min-height:48px" placeholder="What did you actually do?"
          oninput="S.wRef['w2_factor${n}_action']=this.value;save()">${esc(S.wRef['w2_factor'+n+'_action']||'')}</textarea>
      </div>
      <div style="margin-top:8px">
        <label>End-of-week: did it move the needle? How?</label>
        <input placeholder="Honest assessment..."
          value="${esc(S.wRef['w2_factor'+n+'_result']||'')}"
          oninput="S.wRef['w2_factor${n}_result']=this.value;save()">
      </div>
    </div>`).join('')}

    <div style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.07em;margin-bottom:5px">▶ MITIGATE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#3A6A44;line-height:1.6">
        One immediate action per factor. No perfect plans. Just one small move on each of your top 3.
        Progress compounds — even a 2/5 is better than a 1/5 by week 4.
      </div>
    </div>
  </div>

  <!-- ══ MUSCLE — W2 DEEP FOCUS ══ -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Week 2 Deep Focus — Movement & Protein</div>

    <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#7A3A20;line-height:1.6">
        <strong>Movement starts now.</strong> The KOT beginner playlist (Ben Patrick / Knees Over Toes Guy)
        is your gym-free foundation. 3 sessions this week.
        Protein target must be hit at least 5 out of 7 days.
        Eating window: still 14:10 (first meal after 9am, last before 7pm).
      </div>
    </div>

    <div class="card-title" style="font-size:10px;margin-bottom:8px">WORKOUT LOG — WEEK 2</div>
    <div style="display:grid;grid-template-columns:1.6fr 1fr 0.8fr 1.2fr;gap:8px;margin-bottom:7px">
      ${['Exercise','Weight / Resistance','Reps / Duration','Notes'].map(h =>
        `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6A8A6E">${h}</div>`
      ).join('')}
    </div>
    ${[['squat','Squat / goblet squat'],['hingeRDL','Hip hinge / RDL'],
       ['pushPull','Push + pull superset'],['zone2','Zone 2 walk (minutes)'],
       ['kotSession','KOT session (Y/N)']].map(([k,l]) => `
      <div style="display:grid;grid-template-columns:1.6fr 1fr 0.8fr 1.2fr;gap:8px;margin-bottom:8px;align-items:center">
        <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.15);border-radius:7px;
          padding:8px 10px;font-size:11px;color:#5A3020">${l}</div>
        ${['weight','reps','notes'].map(f => `
          <input placeholder="${f}" style="font-size:11px"
            value="${esc(S.trainLog['w2_'+k+'_'+f]||'')}"
            oninput="S.trainLog['w2_${k}_${f}']=this.value;save()">`).join('')}
      </div>`).join('')}

    <div style="margin-top:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">PROTEIN & EATING WINDOW COMPLIANCE</div>
      <div class="g2">
        <div>
          <label>My protein target (from Week 1 calculator)</label>
          <input placeholder="e.g. 165g/day" value="${esc(S.wRef['w2_protein_target']||'')}"
            oninput="S.wRef['w2_protein_target']=this.value;save()">
        </div>
        <div>
          <label>Days I hit protein target (out of 7)</label>
          <input type="number" min="0" max="7" placeholder="0–7"
            value="${esc(S.wRef['w2_protein_days']||'')}"
            oninput="S.wRef['w2_protein_days']=this.value;save()">
        </div>
        <div>
          <label>Days I held 14:10 eating window (out of 7)</label>
          <input type="number" min="0" max="7" placeholder="0–7"
            value="${esc(S.wRef['w2_fasting_days']||'')}"
            oninput="S.wRef['w2_fasting_days']=this.value;save()">
        </div>
        <div>
          <label>Biggest nutrition win this week</label>
          <input placeholder="What worked?"
            value="${esc(S.wRef['w2_nutr_win']||'')}" oninput="S.wRef['w2_nutr_win']=this.value;save()">
        </div>
      </div>
    </div>

    <div style="margin-top:14px;background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">▶ MUSCLE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#7A3A20;line-height:1.6">
        3 KOT sessions. Hit protein 5 of 7 days. Hold your 14:10 window.
        These three numbers are the only scorecard that matters this week.
        <a class="res-pill" href="https://www.youtube.com/c/TheKneesovertoesguy"
          target="_blank" style="margin-left:8px">KOT Playlist ↗</a>
      </div>
    </div>
  </div>

  <!-- ══ MIND — W2 ══ -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Week 2 Cognitive Check-In</div>

    <div class="g3" style="margin-bottom:14px">
      ${[['focus','Focus'],['memory','Memory'],['mood','Mood']].map(([k,l]) => `
        <div>
          <label>W2 ${l} (1–10)</label>
          <input type="number" min="1" max="10" placeholder="1–10"
            value="${esc(S.cogRatings['w2_'+k]||'')}"
            oninput="S.cogRatings['w2_${k}']=this.value;save()">
          <div style="font-size:9px;color:#8AB89A;margin-top:3px">
            W1 baseline: ${esc(S.cogRatings['w1_'+k]||'—')}
          </div>
        </div>`).join('')}
    </div>

    <div style="margin-bottom:12px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">WEEK 2 SUPPLEMENT COMPLIANCE</div>
      ${['The Doctor TJ Special (BPC-157 + L-Glutamine)','Magnesium Glycinate 300–400mg before bed'].map((name,i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:9px 0;border-bottom:1px solid #E8F0E8">
          <div style="font-size:12px;color:#1A2E1E">${name}</div>
          <div style="display:flex;gap:5px">
            ${['Yes','No'].map(v => `
              <button class="btn xs"
                style="background:${S.supps['w2s'+i]===v?(v==='Yes'?'#1D9E75':'#E8E8E8'):'#FFFFFF'};
                  color:${S.supps['w2s'+i]===v?'#fff':'#4A7A54'};
                  border-color:${S.supps['w2s'+i]===v?(v==='Yes'?'#1D9E75':'#999'):'#D8E8DC'}"
                onclick="S.supps['w2s${i}']='${v}';save();render()">${v}</button>`
            ).join('')}
          </div>
        </div>`).join('')}
    </div>

    <div>
      <label>Am I noticing anything different? Sleep, energy, digestion, focus — anything?</label>
      <textarea style="min-height:58px" placeholder="Honest early observations only. No judgment."
        oninput="S.wRef['w2_mind_obs']=this.value;save()">${esc(S.wRef['w2_mind_obs']||'')}</textarea>
    </div>

    <div style="margin-top:12px;background:rgba(46,127,217,.06);border:1px solid rgba(46,127,217,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#2E7FD9;letter-spacing:.07em;margin-bottom:5px">▶ MIND ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A3050;line-height:1.6">
        Both Week 1 supplements continue every day (Doctor TJ Special + Magnesium Glycinate).
        <strong>Week 2 — Add: Omega-3 fish oil</strong> (2–3g EPA/DHA daily, with a meal) + <strong>D3/K2</strong> (5,000 IU D3 + 100mcg K2-MK7, with a fatty meal).
        Score your cognitive triad (focus / memory / mood) on Sunday.
        Download the dual n-back app and complete your first session before Saturday.
      </div>
    </div>
  </div>

  <!-- ══ W2 MORNING TRACKER ══ -->
  ${morningTracker(2)}

  <!-- ══ W2 REFLECTION ══ -->
  <div class="card">
    <div class="card-title">Week 2 Reflection — All 4 Pillars</div>
    ${[['w2_motivate_ref','MOTIVATE: Did sharing your WHY make it feel more real?'],
       ['w2_mitigate_ref','MITIGATE: Which factor action was hardest to start?'],
       ['w2_muscle_ref','MUSCLE: How did your body feel after your first KOT sessions?'],
       ['w2_mind_ref','MIND: Any early signals from supplements or sleep quality change?']
    ].map(([k,l]) => `
      <div style="margin-bottom:12px">
        <label>${l}</label>
        <textarea oninput="S.wRef['${k}']=this.value;save()">${esc(S.wRef[k]||'')}</textarea>
      </div>`).join('')}
  </div>`;
}

function renderNutr() {
  const pt = Number(S.protein) || 0;
  return `
  <div class="page-title" style="color:#1D9E75">Keto-Paleo Ancestral Nutrition</div>
  <div class="page-sub">Food quality determines brain quality · 9am–7pm eating window · Morning fasted</div>

  <div class="card" style="background:rgba(29,158,117,.05);border-color:rgba(29,158,117,.25)">
    <div style="font-size:15px;font-weight:700;color:#1A2E1E;margin-bottom:7px">The 4M Nutritional Philosophy</div>
    <div style="font-size:12.5px;color:#3A6A44;line-height:1.8">
      Flexible keto-paleo + carnivore-leaning ancestral eating + Weston A. Price principles.
      <strong style="color:#1D9E75">Food quality determines brain quality.</strong>
      High-quality animal protein and fat as the foundation. Wild game and wild fish when available.
      Organ meats. Low-toxin plants. Zero ultra-processed food. Zero seed oils.
    </div>
  </div>

  <div class="card">
    <div class="card-title">My Daily Protein Target</div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <label>Target bodyweight (lbs)</label>
        <input type="number" placeholder="e.g. 185" value="${esc(S.protein)}"
          oninput="S.protein=this.value;save();render()">
      </div>
      ${pt > 0 ? `<div style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.25);
        border-radius:10px;padding:14px 20px;text-align:center;flex-shrink:0">
        <div style="font-size:34px;font-weight:700;color:#1D9E75;line-height:1">${Math.round(pt * 0.9)}g</div>
        <div style="font-size:10px;color:#6A8A6E;margin-top:2px">protein per day</div>
      </div>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-title">4M Food Quality Hierarchy</div>
    ${[
      {tier:'Tier 1 — Foundation', color:'#1D9E75', items:['Grass-fed, grass-finished beef — ribeye, chuck, short rib, brisket','Wild game — venison, elk, bison, wild boar (the nutritional gold standard)','Wild-caught fish — Alaskan salmon, sardines, mackerel, oysters, anchovies','Organ meats — beef liver, heart, kidney, bone marrow','Cooking fats — tallow, lard, duck fat, ghee, grass-fed butter','Cruciferous vegetables — broccoli, cauliflower, Brussels sprouts, cabbage, kale (anti-inflammatory, detox support)','Fermented foods — sauerkraut, kimchi, kefir, hard aged cheeses (cheddar, gouda, parmesan) that fit keto-paleo guidelines']},
      {tier:'Tier 2 — Supporting', color:'#2E7FD9', items:['Pasture-raised eggs — 4–6 daily, the yolk is where the medicine lives','Pasture-raised poultry — whole bird, chicken livers','Avocado, leafy greens, berries','Walnuts and macadamia nuts, pumpkin seeds','Dark chocolate — minimum 80% cacao (pairs with pumpkin seeds as last-meal dessert: magnesium trigger + sleep prep)','Sweeteners: allulose or monk fruit only — zero insulin impact, safe alternatives']},
      {tier:'Eliminate Completely', color:'#E05C2A', items:['ALL sugars in every form — cane sugar, honey, maple syrup, agave, coconut sugar, high-fructose corn syrup, dextrose, maltodextrin — zero exceptions','ALL artificial sweeteners — aspartame, sucralose, saccharin, acesulfame-K, stevia blends with fillers — these maintain insulin response and gut dysbiosis','ALL seed and vegetable oils — canola, soybean, corn, sunflower, safflower','Ultra-processed food of any kind — if it has more than 5 ingredients, question it','Refined grains — bread, pasta, cereal, crackers, anything flour-based','Factory-farmed CAFO meat and farmed Atlantic salmon']}
    ].map(({tier, color, items}) => `
      <div style="margin-bottom:14px">
        <span class="pill" style="background:${color}15;color:${color};margin-bottom:8px;display:inline-block">${tier}</span>
        ${items.map(item => `
          <div class="bitem">
            <span class="dot" style="color:${color}">${tier.includes('Elim') ? '✕' : '▸'}</span>
            <span style="font-size:12px;color:#1A3A20">${esc(item)}</span>
          </div>`).join('')}
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Organ Meat Introduction — Month 1 Progression</div>
    ${[
      {period:'Weeks 1–2', title:'The Ancestral Blend', color:'#D4920A',
       desc:'Force of Nature or US Wellness Meats ancestral blend — beef, heart, and liver mixed in proportions that taste like regular ground beef. Cook exactly like ground beef. Zero taste difference for most men.',
       goal:'Use ancestral blend 2–3x this week in place of regular ground beef.'},
      {period:'Weeks 3–4', title:'Chicken Livers', color:'#D4920A',
       desc:'Sauté in butter with salt and onions for 90 seconds per side — slightly pink center is correct. Or blend cooked chicken livers into a ground meat sauce — completely undetectable.',
       goal:'Eat whole liver once this week OR start desiccated organ capsules daily.'},
      {period:'Month 2+', title:'Beef Liver', color:'#D4920A',
       desc:'Slice thin, soak in milk 1 hour to reduce bitterness, cook in butter with onions 2 min per side maximum. Or freeze raw liver and blend 1 oz into a smoothie — nearly tasteless when frozen.',
       goal:'Target: 3–4 oz beef liver, 1–2 times per week.'}
    ].map(({period, title, color, desc, goal}) => `
      <div style="background:rgba(212,146,10,.06);border:1px solid rgba(212,146,10,.2);
        border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:6px">
          <span class="pill" style="background:rgba(212,146,10,.15);color:${color};font-size:9px">${period}</span>
          <span style="font-size:13px;font-weight:700;color:#1A2E1E">${title}</span>
        </div>
        <div style="font-size:11.5px;color:#8A7040;line-height:1.6;margin-bottom:6px">${esc(desc)}</div>
        <div style="font-size:11px;font-weight:600;color:${color}">Goal: ${esc(goal)}</div>
      </div>`).join('')}
    <div style="margin-top:10px">
      <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Desiccated supplement alternative (for those who won\'t eat organs as food):</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px">
        ${[['Ancestral Supplements','https://ancestralsupplements.com'],
           ['Heart & Soil','https://heartandsoil.co'],
           ['Paleovalley','https://paleovalley.com']
        ].map(([n,u]) => `<a class="res-pill" href="${u}" target="_blank">${n} ↗</a>`).join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">4M Fasting Progression — 120 Days</div>
    <div class="info-box" style="background:rgba(30,95,160,.06);border:1px solid #2E7FD933">
      <span style="font-size:11.5px;color:#B5D4F4">Morning routine is
        <strong style="color:#fff">always done completely fasted.</strong>
        Permitted during the fast: water, black coffee, plain herbal tea, and electrolytes only.
        Nothing else.
      </span>
    </div>
    ${FASTING.map(r => `
      <div style="display:grid;grid-template-columns:1fr 0.7fr 1fr 1fr 1.6fr;gap:8px;
        padding:10px 0;border-bottom:1px solid #E8F0E855;align-items:center;font-size:12px">
        <span style="font-weight:700;color:${r.c}">${r.m}</span>
        <span class="pill" style="background:#FAFBF9;border:1px solid #D8E8DC;color:#1A2E1E">${r.w}</span>
        <span style="color:#5A8A64">First: <span style="color:#1A3A20">${r.f}</span></span>
        <span style="color:#5A8A64">Last: <span style="color:#1A3A20">${r.l}</span></span>
        <span style="font-size:10px;color:#6A8A6E">${r.n}</span>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Affiliate Sourcing Guide</div>
    <div style="font-size:10px;color:#6A8A6E;margin-bottom:12px">FTC Disclosure: Some links in this program are affiliate links. If you purchase through these links, 4M may receive a small commission at no additional cost to you. We only recommend products we personally use and believe in.</div>
    ${[{n:'ButcherBox', d:'Grass-fed beef, wild salmon, pastured chicken — monthly subscription', u:'https://butcherbox.com'},
       {n:'US Wellness Meats', d:'Organ meats, ancestral blends, wild game — widest online selection', u:'https://uswellnessmeats.com'},
       {n:'Force of Nature', d:'Ancestral blend ground meat — available at Whole Foods and online', u:'https://forceofnaturemeats.com'},
       {n:'Vital Choice', d:'Wild Alaskan salmon, sardines, mackerel, oysters, halibut', u:'https://vitalchoice.com'},
       {n:'Ancestral Supplements', d:'Desiccated grass-fed organ capsules — highest commission of all partners', u:'https://ancestralsupplements.com'},
       {n:'Thrive Market', d:'Pantry staples: ghee, tallow, sardines, bone broth, supplements at wholesale', u:'https://thrivemarket.com'}
    ].map(s => `
      <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #E8F0E855;align-items:center">
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:600;color:#1A3A20;margin-bottom:2px">${s.n}</div>
          <div style="font-size:10px;color:#6A8A6E">${s.d}</div>
        </div>
        <a class="res-pill" href="${s.u}" target="_blank" style="flex-shrink:0">Shop ↗</a>
      </div>`).join('')}
  </div>`;
}

function renderW3() {
  const wc = WCOLORS[3];
  return `${weekBanner(3)}

  <!-- ══ W3 INTRO ══ -->
  <div class="card" style="background:rgba(46,127,217,.04);border:1px solid rgba(46,127,217,.18)">
    <div style="font-size:14px;font-weight:700;color:#0C447C;margin-bottom:6px">All 4 Pillars — Mid-Month Deep Work</div>
    <div style="font-size:12.5px;color:#1A3050;line-height:1.7">
      Two weeks in. This is where it gets real. Deep focus this week is <strong>Mind</strong> —
      we introduce the full 7-supplement brain stack.
      Every other pillar gets a mid-month check-in and upgraded actions.
    </div>
  </div>

  <!-- ══ MOTIVATE — W3 ══ -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Momentum & Obstacles</div>

    <div class="g2" style="margin-bottom:12px">
      <div>
        <label>My biggest win from the first 2 weeks</label>
        <textarea style="min-height:52px" placeholder="Something that actually happened..."
          oninput="S.wRef['w3_big_win']=this.value;save()">${esc(S.wRef['w3_big_win']||'')}</textarea>
      </div>
      <div>
        <label>The hardest obstacle I ran into</label>
        <textarea style="min-height:52px" placeholder="Be specific — what exactly got in the way?"
          oninput="S.wRef['w3_obstacle']=this.value;save()">${esc(S.wRef['w3_obstacle']||'')}</textarea>
      </div>
    </div>

    <div style="margin-bottom:12px">
      <label>What did I do when I missed a day or fell short? Did I get back on track?</label>
      <textarea style="min-height:52px" placeholder="The recovery pattern matters more than perfection..."
        oninput="S.wRef['w3_recovery']=this.value;save()">${esc(S.wRef['w3_recovery']||'')}</textarea>
    </div>

    <div style="margin-bottom:12px">
      <label>My identity is evolving — complete this sentence: "The man I am becoming..."</label>
      <textarea style="min-height:52px;font-size:13px;font-style:italic;border-color:#C8C0F0"
        placeholder="The man I am becoming..."
        oninput="S.wRef['w3_identity_evolve']=this.value;save()">${esc(S.wRef['w3_identity_evolve']||'')}</textarea>
    </div>

    <div style="background:rgba(107,94,212,.06);border:1px solid #C8C0F0;border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#6B5ED4;letter-spacing:.07em;margin-bottom:5px">▶ MOTIVATE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#4A3A80;line-height:1.6">
        Share your Week 3 identity sentence with your accountability partner.
        Tell someone what you are actually doing — not just that you are "eating better." Specifics only.
      </div>
    </div>
  </div>

  <!-- ══ MITIGATE — W3 ══ -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Mid-Month Factor Progress</div>

    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      Progress-check your top 3 factors from Week 1.
      Rescore each one based on what you have actually done. Then identify your next step.
    </div>

    ${[1,2,3].map(n => `
    <div style="background:#F5FAF6;border:1px solid #D8E8DC;border-radius:9px;padding:14px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.06em;margin-bottom:7px">FACTOR ${n} — MID-MONTH UPDATE</div>
      <div class="g2" style="margin-bottom:8px">
        <div>
          <label>Factor name</label>
          <input placeholder="Same as Week 1..." value="${esc(S.wRef['w3_factor'+n+'_name']||S.wRef['w2_factor'+n+'_name']||'')}"
            oninput="S.wRef['w3_factor${n}_name']=this.value;save()">
        </div>
        <div>
          <label>Re-score this factor (1–5)</label>
          <input type="number" min="1" max="5" placeholder="Better than Week 1?"
            value="${esc(S.wRef['w3_factor'+n+'_rescore']||'')}"
            oninput="S.wRef['w3_factor${n}_rescore']=this.value;save()">
        </div>
      </div>
      <div>
        <label>What specifically changed? What is still stuck?</label>
        <textarea style="min-height:44px" placeholder="Honest update..."
          oninput="S.wRef['w3_factor${n}_progress']=this.value;save()">${esc(S.wRef['w3_factor'+n+'_progress']||'')}</textarea>
      </div>
      <div style="margin-top:8px">
        <label>Next concrete action — before Week 4 check-in</label>
        <input placeholder="Specific, time-bound action..."
          value="${esc(S.wRef['w3_factor'+n+'_next']||'')}"
          oninput="S.wRef['w3_factor${n}_next']=this.value;save()">
      </div>
    </div>`).join('')}

    <div style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.07em;margin-bottom:5px">▶ MITIGATE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#3A6A44;line-height:1.6">
        Rescore all three factors. Even a half-point improvement is real progress.
        Focus your Week 4 deep-dive on whichever factor has moved the least.
      </div>
    </div>
  </div>

  <!-- ══ MUSCLE — W3 ══ -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Mid-Month Body Check + Progression</div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MID-MONTH BODY COMPOSITION CHECK</div>
      <div class="g2">
        ${[['weight_w3','Body weight (lbs)'],['waist_w3','Waist at navel (in)'],
           ['energy_w3','Morning energy (1–10)'],['sleep_w3','Sleep quality (1–10)']].map(([k,l]) => `
          <div>
            <label>${l}</label>
            <input placeholder="Week 3 measurement..." value="${esc(S.wRef[k]||'')}"
              oninput="S.wRef['${k}']=this.value;save()">
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">STRENGTH PROGRESSION — WEEK 3</div>
      <div style="display:grid;grid-template-columns:1.6fr 1fr 0.8fr 1.2fr;gap:8px;margin-bottom:7px">
        ${['Exercise','Weight','Reps','vs Week 1?'].map(h =>
          `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6A8A6E">${h}</div>`
        ).join('')}
      </div>
      ${[['squat3','Squat / goblet squat'],['hinge3','Hip hinge / RDL'],
         ['push3','Push / pull'],['zone2_3','Zone 2 cardio (min)']].map(([k,l]) => `
        <div style="display:grid;grid-template-columns:1.6fr 1fr 0.8fr 1.2fr;gap:8px;margin-bottom:8px;align-items:center">
          <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.15);border-radius:7px;
            padding:8px 10px;font-size:11px;color:#5A3020">${l}</div>
          ${['weight','reps','progress'].map(f => `
            <input placeholder="${f}" style="font-size:11px"
              value="${esc(S.trainLog['w3_'+k+'_'+f]||'')}"
              oninput="S.trainLog['w3_${k}_${f}']=this.value;save()">`).join('')}
        </div>`).join('')}
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">FASTING WINDOW UPGRADE</div>
      <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:#7A3A20;margin-bottom:4px">Still on 14:10 → Optional 16:8 trial</div>
        <div style="font-size:11.5px;color:#9A5A40;line-height:1.6">
          If your 14:10 window felt easy last week, try 16:8 for 2–3 days this week
          (first meal after 11am, last before 7pm). Not required — only if 14:10 feels effortless.
        </div>
      </div>
      <div class="g2">
        <div>
          <label>Days I attempted 16:8 this week</label>
          <input type="number" min="0" max="7" placeholder="0 = staying at 14:10"
            value="${esc(S.wRef['w3_1628_days']||'')}" oninput="S.wRef['w3_1628_days']=this.value;save()">
        </div>
        <div>
          <label>How did it feel?</label>
          <input placeholder="Energy, hunger, mood impact..."
            value="${esc(S.wRef['w3_1628_feel']||'')}" oninput="S.wRef['w3_1628_feel']=this.value;save()">
        </div>
      </div>
    </div>

    <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">▶ MUSCLE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#7A3A20;line-height:1.6">
        4 sessions this week (adding one from Week 2). Record your progressions.
        Try at least 2 days of optional 16:8 if 14:10 has felt easy.
      </div>
    </div>
  </div>

  <!-- ══ MIND — W3 DEEP FOCUS ══ -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Week 3 Deep Focus — Full Supplement Stack</div>

    <div style="background:rgba(46,127,217,.06);border:1px solid rgba(46,127,217,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#2E7FD9;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#1A3050;line-height:1.6">
        Week 3 is when we introduce the Month 1 supplement stack — Week 3 completion. You have been running the Doctor TJ Special + Magnesium for two weeks, and added Omega-3 + D3/K2 in Week 2.
        <strong>Week 3 — Add: Methylated B Complex</strong> (B6 as P-5-P, B12 as methylcobalamin, folate as methylfolate — methylated forms only for best absorption).
        This completes your 4-supplement Month 1 stack. Additional supplements introduced in Month 2.
      </div>
    </div>

    <div class="card-title" style="font-size:10px;margin-bottom:8px">MONTH 1 COMPLETE SUPPLEMENT STACK (4 SUPPLEMENTS)</div>
    <div style="display:grid;grid-template-columns:1.8fr 0.9fr 0.9fr 0.7fr;gap:8px;padding:8px 0;margin-bottom:4px">
      ${['Supplement','Dose','Timing','Taking?'].map(h =>
        `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6A8A6E">${h}</div>`
      ).join('')}
    </div>
    ${SUPPLEMENTS.map((s,i) => {
      const weekBadge = s.week1 ? '<span style="font-size:9px;color:#1D9E75;font-weight:600"> ✓ Week 1</span>'
                      : s.week2 ? '<span style="font-size:9px;color:#2E7FD9;font-weight:600"> + Week 2</span>'
                      : s.week3 ? '<span style="font-size:9px;color:#D4920A;font-weight:600"> + Week 3</span>'
                      : '<span style="font-size:9px;color:#9A9A9A;font-weight:600"> Month 2+</span>';
      const rowBg = s.week1 ? 'background:rgba(29,158,117,.04);'
                  : s.week2 ? 'background:rgba(46,127,217,.04);'
                  : s.week3 ? 'background:rgba(212,146,10,.04);'
                  : 'opacity:0.45;';
      return `
      <div class="supp-row" style="${rowBg}">
        <div>
          <div class="supp-name">${s.n} ${weekBadge}</div>
          <div class="supp-why">${s.w}</div>
        </div>
        <div style="font-size:11px;color:#3A6A44">${s.d}</div>
        <div style="font-size:10px;color:#4A7A54">${s.t}</div>
        <div style="display:flex;gap:5px">
          ${['Yes','No'].map(v => `
            <button class="btn xs"
              style="background:${S.supps['s'+i]===v?(v==='Yes'?'#1D9E75':'#E8E8E8'):'#FFFFFF'};
                border:1px solid ${S.supps['s'+i]===v?(v==='Yes'?'#1D9E75':'#CCC'):'#D8E8DC'};
                color:${S.supps['s'+i]===v?(v==='Yes'?'#fff':'#555'):'#6A9A74'}"
              onclick="S.supps['s'+i]='${v}';save();render()">${v}</button>`).join('')}
        </div>
      </div>`;
    }).join('')}

    <div style="margin-top:16px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">COGNITIVE PERFORMANCE — WEEKLY SCORES</div>
      <div style="font-size:12px;color:#3A6A44;margin-bottom:10px">
        Score focus, memory, and mood every Sunday evening (1–10). The trend across 4 weeks is your data.
      </div>
      ${[1,2,3,4].map(w => `
        <div style="margin-bottom:13px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.07em;color:#4A7A54;margin-bottom:7px">WEEK ${w}</div>
          <div class="g3">
            ${[['focus','Focus'],['memory','Memory'],['mood','Mood']].map(([k,l]) => `
              <div>
                <label>${l}</label>
                <input type="number" min="1" max="10" placeholder="1–10"
                  value="${esc(S.cogRatings['w'+w+'_'+k]||'')}"
                  oninput="S.cogRatings['w${w}_${k}']=this.value;save()">
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    <div style="margin-top:12px">
      <label>What cognitive changes have I noticed across the first 3 weeks?</label>
      <textarea style="min-height:58px" placeholder="Sleep quality, energy on waking, afternoon focus, stress tolerance..."
        oninput="S.wRef['w3_cog_changes']=this.value;save()">${esc(S.wRef['w3_cog_changes']||'')}</textarea>
    </div>

    <div style="margin-top:12px;background:rgba(46,127,217,.06);border:1px solid rgba(46,127,217,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#2E7FD9;letter-spacing:.07em;margin-bottom:5px">▶ MIND ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A3050;line-height:1.6">
        Add your final Month 1 supplement: <strong>methylated B Complex</strong>. Your Month 1 stack is now complete — 4 supplements total. Take B Complex with breakfast. Additional supplements (Lion\'s Mane, Bacopa, Phosphatidylserine) begin in Month 2.
        Continue dual n-back 3–4× per week.
      </div>
    </div>
  </div>

  <!-- ══ W3 MORNING TRACKER ══ -->
  ${morningTracker(3)}

  <!-- ══ W3 REFLECTION ══ -->
  <div class="card">
    <div class="card-title">Week 3 Reflection — All 4 Pillars</div>
    ${[['w3_motivate_ref','MOTIVATE: How has your sense of identity shifted in 3 weeks?'],
       ['w3_mitigate_ref','MITIGATE: Which factor showed the most improvement?'],
       ['w3_muscle_ref','MUSCLE: Am I stronger or more capable than Week 1?'],
       ['w3_mind_ref','MIND: What is my body telling me about the new supplements?']
    ].map(([k,l]) => `
      <div style="margin-bottom:12px">
        <label>${l}</label>
        <textarea oninput="S.wRef['${k}']=this.value;save()">${esc(S.wRef[k]||'')}</textarea>
      </div>`).join('')}
  </div>`;
}

function renderW4() {
  const af = auditFilled(), at = auditTotal();
  const wc = WCOLORS[4];
  const metrics = [
    ['Mitigate audit score (/60)', 'audit'],
    ['Body weight (lbs)',          'weight'],
    ['Waist at navel (in)',        'waist'],
    ['Morning energy (1–10)',      'energy'],
    ['Afternoon focus (1–10)',     'focus'],
    ['Sleep quality (1–10)',       'sleep'],
    ['Mood rating (1–10)',         'mood'],
    ['Squat baseline',             'squat'],
    ['Morning protocol (days/wk)','mornDays'],
    ['Cold shower (days/wk)',      'coldDays']
  ];

  return `${weekBanner(4)}

  <!-- ══ W4 INTRO ══ -->
  <div class="card" style="background:rgba(107,94,212,.05);border:1px solid rgba(107,94,212,.2)">
    <div style="font-size:14px;font-weight:700;color:#3C3489;margin-bottom:6px">Month 1 Completion — All 4 Pillars</div>
    <div style="font-size:12.5px;color:#3A3070;line-height:1.7">
      This is the final week of Month 1. Deep focus this week is <strong>Motivate</strong> —
      locking in your identity and committing to Month 2.
      Every other pillar gets a final check-in, re-audit, and Month 2 plan.
    </div>
  </div>

  <!-- ══ MOTIVATE — W4 DEEP FOCUS ══ -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Week 4 Deep Focus — Identity & Month 2 Vision</div>

    <div style="background:rgba(107,94,212,.06);border:1px solid rgba(107,94,212,.2);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#6B5ED4;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#4A3A80;line-height:1.6">
        The man who finishes Month 1 is not the same man who started it.
        This week you name that man, commit to Month 2, and declare who you are becoming.
      </div>
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">IDENTITY STATEMENT — Month 1 Final</div>
      <div style="font-size:11.5px;color:#4A7A54;margin-bottom:10px">Write in present tense. "I am a man who..." — not "I will try to..."</div>
      <textarea style="min-height:80px;border-color:#6B5ED455;font-size:14px"
        placeholder="I am a man who..."
        oninput="S.identity=this.value;save()">${esc(S.identity)}</textarea>
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MY 3 BIGGEST WINS FROM MONTH 1</div>
      ${[0,1,2].map(i => `
        <div style="margin-bottom:10px">
          <label>Win ${i+1}</label>
          <input value="${esc(S.wins[i])}" placeholder="Describe this win..."
            oninput="S.wins[${i}]=this.value;save()">
        </div>`).join('')}
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MONTH 2 COMMITMENT</div>
      ${[['training','Training plan — 3 days/week + Zone 2'],
         ['nutrition','Nutrition focus (moving to 16:8 fasting — first meal after 11am)'],
         ['supplements','Supplements to continue or add in Month 2'],
         ['cognitive','Cognitive practice — dual n-back and reading schedule'],
         ['accountability','Accountability partner and weekly check-in plan']
      ].map(([k,l]) => `
        <div style="margin-bottom:11px">
          <label>${l}</label>
          <input value="${esc(S.m2[k]||'')}" placeholder="${l}..."
            oninput="S.m2['${k}']=this.value;save()">
        </div>`).join('')}
    </div>

    <div style="border:2px solid #6B5ED455;border-radius:10px;padding:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px;color:#6B5ED4">GRADUATION COMMITMENT — Read Aloud on the Final Call</div>
      <textarea style="min-height:85px;border-color:#6B5ED444;font-size:13.5px"
        placeholder="Write your graduation commitment here..."
        oninput="S.grad=this.value;save()">${esc(S.grad)}</textarea>
      <div style="margin-top:13px;padding:12px 14px;background:rgba(107,94,212,.07);
        border-radius:8px;font-size:11.5px;color:#7060A8;font-style:italic;text-align:center;line-height:1.6">
        "In completing Month 1 of the 4M program I commit to continuing my brain optimization practice because the man I am becoming is worth protecting."
      </div>
    </div>
  </div>

  <!-- ══ MITIGATE — W4 RE-AUDIT ══ -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Full Re-Audit — All 12 Factors</div>

    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      Score every factor again using the same 1–5 scale from Week 1.
      Compare your final audit score to your baseline to see how far you moved in 30 days.
      Week 1 scores are <strong>auto-populated from your original audit</strong> — no manual entry needed.
    </div>

    ${(()=>{
      const factors = FACTORS;
      const w1Total = auditTotal();
      const w1Filled = auditFilled();
      // Build week 4 rescore table
      return `
      <div style="background:#F5FAF6;border:1.5px solid #1D9E7533;border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div style="font-size:13px;font-weight:700;color:#1A3A20">Side-by-Side Audit Comparison</div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span style="color:#6A8A6E">Week 1 total: <strong style="color:#1D9E75">${w1Total} / ${w1Filled*5}</strong></span>
            <span style="color:#6A8A6E">Week 4 total: <strong style="color:#6B5ED4" id="w4-total">—</strong></span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;font-size:10.5px">
          <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#3A6A44;border-radius:6px 0 0 0">Factor</div>
          <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#3A6A44;text-align:center">Week 1</div>
          <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#6B5ED4;text-align:center">Week 4</div>
          <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#E05C2A;text-align:center;border-radius:0 6px 0 0">Δ</div>
          ${factors.map(f => {
            const w1score = S.scores[f.n] || 0;
            const w4key = 'w4_audit_'+f.n;
            const w4score = S.w4audit ? (S.w4audit[f.n]||0) : 0;
            const delta = w4score - w1score;
            const dColor = delta < 0 ? '#1D9E75' : delta > 0 ? '#E05C2A' : '#9A9A9A';
            const dSign = delta < 0 ? '▼'+Math.abs(delta) : delta > 0 ? '▲'+delta : '—';
            return `
            <div style="padding:5px 8px;border-bottom:1px solid #E8F0E8;font-size:10px;color:#3A6A44">${f.n} · ${f.name}</div>
            <div style="padding:5px 8px;border-bottom:1px solid #E8F0E8;text-align:center;font-weight:700;color:#1D9E75">${w1score||'—'}</div>
            <div style="padding:5px 6px;border-bottom:1px solid #E8F0E8;text-align:center">
              <input type="number" min="1" max="5" placeholder="1–5"
                value="${w4score||''}"
                style="width:42px;padding:3px 4px;border:1px solid #6B5ED444;border-radius:5px;font-size:10px;text-align:center;background:#fff"
                oninput="if(!S.w4audit)S.w4audit={};S.w4audit['${f.n}']=Number(this.value);save();
                  const tots=Object.values(S.w4audit).reduce((a,b)=>a+(Number(b)||0),0);
                  const el=document.getElementById('w4-total');if(el)el.textContent=tots+' / '+(Object.keys(S.w4audit).filter(k=>S.w4audit[k]).length*5)">
            </div>
            <div style="padding:5px 8px;border-bottom:1px solid #E8F0E8;text-align:center;font-weight:700;color:${dColor};font-size:10px">${dSign}</div>`;
          }).join('')}
        </div>
        <div style="margin-top:10px;font-size:11px;color:#6A8A6E">
          Score 1–5 per factor (1 = major risk still present · 5 = fully addressed). Lower score at Week 4 = improvement.
        </div>
      </div>`;
    })()}

    <div>
      <label>Which factor showed the most improvement over 30 days?</label>
      <input placeholder="Factor name and what changed..."
        value="${esc(S.wRef['w4_most_improved']||'')}" oninput="S.wRef['w4_most_improved']=this.value;save()">
    </div>
    <div style="margin-top:10px">
      <label>Which factor still needs the most work in Month 2?</label>
      <input placeholder="Factor name and why it is still sticky..."
        value="${esc(S.wRef['w4_needs_work']||'')}" oninput="S.wRef['w4_needs_work']=this.value;save()">
    </div>

    <div style="margin-top:12px;background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.07em;margin-bottom:5px">▶ MITIGATE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#3A6A44;line-height:1.6">
        Complete the full re-audit. Your score improvement is the concrete evidence that the work is real.
        Carry your lowest-scoring factors forward as Month 2 priorities.
      </div>
    </div>
  </div>

  <!-- ══ MUSCLE — W4 ══ -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Month 1 Progress Comparison</div>

    <div style="font-size:12.5px;color:#5A3020;margin-bottom:12px;line-height:1.6">
      Enter your Week 4 numbers. Week 1 baselines pull from your earlier entries.
    </div>
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead><tr style="background:rgba(224,92,42,.1)">
          ${['Metric','Week 1','Week 4','Change','Direction'].map(h =>
            `<th style="color:#7A3A20">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${metrics.map(([label, key], i) => {
            const w1 = S.base[key] || (key === 'audit' ? (af === 12 ? String(at) : '') : '');
            const w4 = S.w4[key] || '';
            const diff = w1 && w4 ? (Number(w4) - Number(w1)).toFixed(1) : '';
            const better = ['waist','weight'].includes(key) ? Number(diff) < 0 : Number(diff) > 0;
            return `<tr style="background:${i%2===0?'#FFFFFF':'#FFF8F5'}">
              <td style="color:#1A3A20">${label}</td>
              <td style="color:#5A8A64">${w1 || '—'}</td>
              <td><input value="${esc(w4)}" placeholder="Enter..."
                oninput="S.w4['${key}']=this.value;save();render()"></td>
              <td style="color:${diff?(better?'#1D9E75':'#E05C2A'):'#3A5A42'};font-weight:${diff?'700':'400'}">
                ${diff || '—'}
              </td>
              <td style="color:${diff?(better?'#1D9E75':'#E05C2A'):'#3A5A42'}">
                ${diff ? (better ? '↑ Better' : '↓ Check') : '—'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:14px;background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">▶ MUSCLE ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#7A3A20;line-height:1.6">
        Record all your Week 4 measurements. Compare honestly.
        Strength and waist measurement are more meaningful than scale weight at this stage.
      </div>
    </div>
  </div>

  <!-- ══ MIND — W4 ══ -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Month 1 Cognitive Wrap-Up</div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">FINAL COGNITIVE SCORES — WEEK 4</div>
      <div class="g3">
        ${[['focus','Focus'],['memory','Memory'],['mood','Mood']].map(([k,l]) => `
          <div>
            <label>W4 ${l} (1–10)</label>
            <input type="number" min="1" max="10" placeholder="1–10"
              value="${esc(S.cogRatings['w4_'+k]||'')}"
              oninput="S.cogRatings['w4_${k}']=this.value;save()">
            <div style="font-size:9px;color:#8AB89A;margin-top:3px">
              W1 baseline: ${esc(S.cogRatings['w1_'+k]||'—')}
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-bottom:12px">
      <label>Which supplement or practice made the most noticeable cognitive difference?</label>
      <input placeholder="Be specific — what did you actually notice?"
        value="${esc(S.wRef['w4_best_supp']||'')}" oninput="S.wRef['w4_best_supp']=this.value;save()">
    </div>

    <div style="margin-bottom:12px">
      <label>My supplement routine for Month 2 — what stays, what changes?</label>
      <textarea style="min-height:52px" placeholder="Build on what worked..."
        oninput="S.wRef['w4_supp_plan']=this.value;save()">${esc(S.wRef['w4_supp_plan']||'')}</textarea>
    </div>

    <div style="background:rgba(46,127,217,.06);border:1px solid rgba(46,127,217,.2);border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#2E7FD9;letter-spacing:.07em;margin-bottom:5px">▶ MIND ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A3050;line-height:1.6">
        Score all 4 weeks in the cognitive tracker. The trend line is your Month 1 story.
        Decide which supplements are locked in for Month 2 and write it down.
      </div>
    </div>
  </div>

  <!-- ══ W4 MORNING TRACKER ══ -->
  ${morningTracker(4)}

  <!-- ══ W4 REFLECTION ══ -->
  <div class="card" style="border:2px solid rgba(107,94,212,.2)">
    <div class="card-title">Month 1 Final Reflection — All 4 Pillars</div>
    ${[['w4_motivate_ref','MOTIVATE: In one sentence — who is the man who completed Month 1?'],
       ['w4_mitigate_ref','MITIGATE: How many points did your audit score improve?'],
       ['w4_muscle_ref','MUSCLE: What is the most significant physical change you feel or see?'],
       ['w4_mind_ref','MIND: What cognitive change are you most proud of from Month 1?']
    ].map(([k,l]) => `
      <div style="margin-bottom:12px">
        <label>${l}</label>
        <textarea oninput="S.wRef['${k}']=this.value;save()">${esc(S.wRef[k]||'')}</textarea>
      </div>`).join('')}
  </div>`;
}

function renderRegen() {
  return `
  <div style="background:linear-gradient(135deg,#042C53,#0C2040);border-radius:12px;
    padding:20px;margin-bottom:20px;border:1px solid #2E7FD944">
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#2E7FD9;margin-bottom:6px">WEEK 4 BONUS LESSON</div>
    <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:6px">Regenerative Medicine & Genesis RPA</div>
    <div style="font-size:12.5px;color:#B5D4F4;line-height:1.7">Everything you have done this month has been activating your body's innate regenerative pathways. Now we look at what medicine is becoming — and why it matters for every man in this cohort.</div>
  </div>

  <div class="card">
    <div class="card-title">What Is Regenerative Medicine?</div>
    <p style="font-size:12.5px;color:#3A6A44;line-height:1.8;margin-bottom:14px">
      The science of restoring your body's ability to heal and rebuild itself at the cellular level.
      Rather than managing symptoms with drugs, it addresses underlying biology — reactivating repair
      processes that slow down with age, injury, and chronic stress. The 4M lifestyle protocol and
      regenerative medicine are additive and synergistic, not competing.
    </p>
    <div class="g2">
      ${[['The core problem with aging','As we age, regenerative signaling declines. Cells that once repaired tissue become less responsive to the signals that drive healing.'],
         ['What 4M does','Sleep, cold exposure, fasting, exercise, and ancestral nutrition all activate innate regenerative pathways — BDNF, autophagy, neuroplasticity, mitochondrial biogenesis.'],
         ['What\'s now possible','Advanced therapies can deliver concentrated biological signals directly to damaged or aging tissue — accelerating healing beyond what lifestyle alone achieves.'],
         ['Why this matters at 35+','By 40, repair signals have declined significantly. By 50, joint, cognitive, and hormonal challenges compound each other. Regenerative medicine addresses root causes.']
      ].map(([t,d]) => `
        <div style="background:#FAFBF9;border:1px solid #2E7FD933;border-radius:9px;padding:13px">
          <div style="font-size:12px;font-weight:700;color:#1A3A20;margin-bottom:5px">${t}</div>
          <div style="font-size:11px;color:#4A7A54;line-height:1.6">${d}</div>
        </div>`).join('')}
    </div>
  </div>

  <div style="background:#1E5FA0;border-radius:12px;padding:18px 20px;margin-bottom:16px">
    <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">Genesis RPA — Regenerative Protein Array</div>
    <div style="font-size:12px;color:#B5D4F4;line-height:1.7;margin-bottom:14px">
      A concentrated array of proteins, growth factors, and cytokines derived from placental tissue.
      No live cells. No DNA transfer. Estimated up to 1,000× more potent than conventional PRP.
      Administered by licensed clinicians.
    </div>
    <div class="g2">
      ${[['No live cells — safer','No living cells, no DNA. Significantly reduced risk compared to stem cell therapies.'],
         ['1,000× more potent than PRP','Comprehensive regenerative factors provide a dramatically more potent healing signal than platelets alone.'],
         ['60+ healthcare conditions','10+ clinical specialties. Neurological, musculoskeletal, hormonal, cardiovascular, and anti-aging.'],
         ['Intranasal brain delivery','Bypasses the blood-brain barrier via the olfactory pathway — delivers proteins directly to neurons.']
      ].map(([t,d]) => `
        <div style="background:rgba(255,255,255,.06);border-radius:8px;padding:11px">
          <div style="font-size:11px;font-weight:700;color:#fff;margin-bottom:3px">${t}</div>
          <div style="font-size:10px;color:#B5D4F4;line-height:1.5">${d}</div>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Conditions Addressed</div>
    ${[{sys:'Brain & Neurological', color:'#2E7FD9', conditions:['Cognitive decline and dementia','Traumatic brain injury — TBI protocol: 4 applications IV + intranasal','Parkinson\'s disease','Brain fog and mental clarity at any age']},
       {sys:'Musculoskeletal',      color:'#1D9E75', conditions:['Knee and hip degeneration','Shoulder and rotator cuff injuries','Spine and disc conditions','Sports and chronic overuse injuries']},
       {sys:'Hormonal & Metabolic', color:'#D4920A', conditions:['Testosterone, adrenal function, and thyroid optimization','Metabolic health and insulin sensitivity','Cardiovascular tissue support and endothelial repair','Cellular anti-aging and epigenetic reprogramming']}
    ].map(({sys, color, conditions}) => `
      <div style="margin-bottom:14px">
        <span class="pill" style="background:${color}15;color:${color};margin-bottom:8px;display:inline-block">${sys}</span>
        <div class="g2">
          ${conditions.map(c => `
            <div style="display:flex;gap:7px;font-size:11.5px;color:#3A6A44;padding:3px 0">
              <span style="color:${color};flex-shrink:0">▸</span><span>${c}</span>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">My Next Steps</div>
    ${[['Identify your priority conditions','Which of the conditions above are most relevant to your health right now? Write them in the reflection below.'],
       ['Connect with Dr. TJ','Once you\'ve identified what you want to work on, Dr. TJ will connect you with the right provider based on your specific condition — you don\'t have to figure this out alone.']
    ].map(([step, desc], i) => `
      <div style="display:flex;gap:13px;padding:11px 0;border-bottom:1px solid #E8F0E855;align-items:flex-start">
        <div style="width:26px;height:26px;border-radius:50%;background:rgba(46,127,217,.1);
          border:1px solid #2E7FD9;display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:#2E7FD9;flex-shrink:0">${i+1}</div>
        <div>
          <div style="font-size:12.5px;font-weight:600;color:#1A3A20;margin-bottom:2px">${step}</div>
          <div style="font-size:11px;color:#6A8A6E">${desc}</div>
        </div>
      </div>`).join('')}
    <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">
      ${[['Genesis Regenerative','https://genesisregenerative.com'],
         ['Patient Resources','https://genesisregenerative.com/patient-resources/'],
         ['FAQ','https://genesisregenerative.com/faq/'],
         ['Clinician Resources','https://genesisregenerative.com/clinician-resources/']
      ].map(([n,u]) => `<a class="res-pill" href="${u}" target="_blank">${n} ↗</a>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">My Regenerative Medicine Reflection</div>
    <label>Which conditions above are most relevant to me personally?</label>
    <textarea style="margin-bottom:12px"
      oninput="S.regenPri=this.value;save()">${esc(S.regenPri)}</textarea>
    <label>My commitment to investigate this further</label>
    <textarea oninput="S.regenNext=this.value;save()">${esc(S.regenNext)}</textarea>
  </div>

  <div style="background:#FAFBF9;border:1px solid #D8E8DC;border-radius:9px;padding:12px 15px;
    font-size:10.5px;color:#6A8A6E;line-height:1.6">
    <strong style="color:#5A8A64">Important disclaimer:</strong>
    The statements in this section have not been evaluated by the FDA. This content is provided for
    educational purposes only. Genesis Regenerative does not practice medicine. Only a licensed clinician
    and their patient can decide if RPA is appropriate. Consult a qualified physician before pursuing
    any regenerative therapy.
  </div>`;
}

// ══════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════
function goTo(id) {
  curTab = id;
  buildNav();
  render();
  window.scrollTo(0, 0);
}

function setScore(fNum, n) {
  S.scores[fNum] = n;
  save();
  showToast(`Factor ${fNum} scored ${n} / 5`);
  render();
}

function toggleFactor(fNum) {
  openFactor = openFactor === fNum ? null : fNum;
  factorTab = 'imm';
  render();
}

function setFactorTab(tab) {
  factorTab = tab;
  render();
}

function toggleDay(type, key) {
  S[type][key] = !S[type][key];
  save();
  updateSidebar();
  render();
}

// ══════════════════════════════════════════
// SIDEBAR + RENDER
// ══════════════════════════════════════════
function buildNav() {
  $('nav-items').innerHTML = TABS.map(t =>
    `<div class="nav-item${curTab === t.id ? ' active' : ''}" onclick="goTo('${t.id}')">
      <span class="icon">${t.icon}</span>
      <span>${t.label}</span>
    </div>`
  ).join('');
}

function updateSidebar() {
  const af = auditFilled(), at = auditTotal(), m = mornings(), c = colds();
  $('sb-name').textContent = S.name || '';
  $('sb-audit').textContent = `Audit: ${af} / 12 factors`;
  $('sb-score').textContent = `Score: ${af >= 14 ? at + ' / 70' : af + ' / 14 factors'}`;
  $('sb-morn').textContent  = `Mornings: ${m} days`;
  $('sb-cold').textContent  = `Cold showers: ${c} days`;
}

function render() {
  const pages = {
    dash:  renderDash,
    w1:    renderW1,
    morn:  renderMorn,
    w2:    renderW2,
    nutr:  renderNutr,
    w3:    renderW3,
    w4:    renderW4,
    regen: renderRegen
  };
  $('main-content').innerHTML = (pages[curTab] || renderDash)();
  updateSidebar();
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
// Inline onclick="..." attributes in rendered templates need these on window
// because Vite loads this file as an ES module (no implicit globals).
Object.assign(window, { S, save, render, goTo, setScore, toggleFactor, setFactorTab, toggleDay });

buildNav();
updateSidebar();
render();

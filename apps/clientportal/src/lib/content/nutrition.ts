/** Food tier group. */
export interface FoodTier {
  tier: string;
  color: string;
  items: string[];
}

export const foodTiers: FoodTier[] = [
  {tier:'Tier 1 — Foundation', color:'#1D9E75', items:[
    'Grass-fed, grass-finished beef — ribeye, chuck, short rib, brisket',
    'Wild game — venison, elk, bison, wild boar (the nutritional gold standard)',
    'Wild-caught fish — Alaskan salmon, sardines, mackerel, oysters, anchovies',
    'Organ meats — beef liver, heart, kidney, bone marrow',
    'Cooking fats — tallow, lard, duck fat, ghee, grass-fed butter',
    'Cruciferous vegetables — broccoli, cauliflower, Brussels sprouts, cabbage, kale (anti-inflammatory, detox support)',
    'Fermented foods — sauerkraut, kimchi, kefir, hard aged cheeses (cheddar, gouda, parmesan) that fit keto-paleo guidelines'
  ]},
  {tier:'Tier 2 — Supporting', color:'#2E7FD9', items:[
    'Pasture-raised eggs — 4–6 daily, the yolk is where the medicine lives',
    'Pasture-raised poultry — whole bird, chicken livers',
    'Avocado, leafy greens, berries',
    'Walnuts and macadamia nuts, pumpkin seeds',
    'Dark chocolate — minimum 80% cacao (pairs with pumpkin seeds as last-meal dessert: magnesium trigger + sleep prep)',
    'Sweeteners: allulose or monk fruit only — zero insulin impact, safe alternatives'
  ]},
  {tier:'Eliminate Completely', color:'#E05C2A', items:[
    'ALL sugars in every form — cane sugar, honey, maple syrup, agave, coconut sugar, high-fructose corn syrup, dextrose, maltodextrin — zero exceptions',
    'ALL artificial sweeteners — aspartame, sucralose, saccharin, acesulfame-K, stevia blends with fillers — these maintain insulin response and gut dysbiosis',
    'ALL seed and vegetable oils — canola, soybean, corn, sunflower, safflower',
    'Ultra-processed food of any kind — if it has more than 5 ingredients, question it',
    'Refined grains — bread, pasta, cereal, crackers, anything flour-based',
    'Factory-farmed CAFO meat and farmed Atlantic salmon'
  ]}
];

/** Fasting progression row. */
export interface FastingPhase {
  m: string; w: string; f: string; l: string; n: string; c: string;
}

export const fasting: FastingPhase[] = [
  {m:'Month 1', w:'14:10', f:'After 9am (post-morning routine)', l:'By 7PM → 6PM → 5PM (progress by closing earlier)', n:'Foundation — build the habit. Move LAST meal earlier as you adapt.', c:'#1D9E75'},
  {m:'Month 2', w:'16:8',  f:'After 11am', l:'Before 7pm', n:'Deepen fat adaptation',         c:'#E05C2A'},
  {m:'Month 3', w:'18:6',  f:'After 12pm', l:'Before 6pm', n:'Significant autophagy',          c:'#2E7FD9'},
  {m:'Month 4', w:'OMAD',  f:'1–4 hr window',l:'Variable', n:'Deep cellular renewal',          c:'#6B5ED4'}
];

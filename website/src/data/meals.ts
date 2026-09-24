// ─────────────────────────────────────────────────────────────────────────────
// MONTH 1 MEALS — the single editable source for /meals and /meals/week-[1-4].
// Source of record: docs/plan/meals-month1-2026-09-24.md (locked 2026-09-24).
//
// Plan name is "high-protein, low-carb". The word "keto" appears ONLY as the
// per-recipe "keto-compatible" mark — never as a banner for the plan.
//
// Rules baked into every recipe below:
//   protein first (35-50 g/serving) · no seed oils, sugar or flour ·
//   vegetables are the carbs · 20-30 minutes hands-on · no weak-link
//   packaged ingredients · no alcohol, in the recipe or on the table.
//
// `video` is intentionally optional. A recipe with no video URL renders NO
// video button at all — we never ship "coming soon".
// ─────────────────────────────────────────────────────────────────────────────

export type Recipe = {
  slug: string;
  title: string;
  hook: string;
  handsOn: string;
  protein: string;
  netCarbs: string;
  ingredients: string[];
  method: string[];
  /** YouTube URL. Omit until the video exists — the button only renders when set. */
  video?: string;
};

export type Week = {
  n: 1 | 2 | 3 | 4;
  theme: string;
  intro: string;
  recipes: Recipe[];
};

export const FASTING_DEFAULT =
  'Sixteen-eight is your default: first meal around 11, last bite by 7. If you have never fasted, start light — 12 hours off food, then 14 — and walk it in over a few weeks. Nobody wins a prize for starting hard.';

export const FIRST_MEAL_RULE =
  'Break the fast the same way every day: your gut-restore scoop in 8 to 12 oz of water with the meal, then 30 to 40 grams of lean protein. Water first. Coffee after, not before.';

export type FirstMeal = { letter: string; name: string; body: string; protein: string };

export const FIRST_MEALS: FirstMeal[] = [
  {
    letter: 'A',
    name: 'Eggs and meat',
    body: 'Three eggs and 3 oz of last night’s dinner protein, chopped in. A handful of spinach wilted in the same pan. Salt.',
    protein: 'about 38 g protein',
  },
  {
    letter: 'B',
    name: 'The bowl',
    body: 'Six oz of plain Greek yogurt (full-fat or 2 percent) or cottage cheese, one scoop of unflavored collagen stirred through, half a cup of berries, a small handful of walnuts.',
    protein: 'about 40 g protein',
  },
  {
    letter: 'C',
    name: 'The plate',
    body: 'Five oz of smoked salmon or leftover chicken, half an avocado, sliced cucumber, olive oil and lemon over the top.',
    protein: 'about 35 g protein',
  },
];

export const WEEKS: Week[] = [
  {
    n: 1,
    theme: 'Cook once, eat twice',
    intro:
      'Three dinners. Each one serves four, which means dinner tonight and lunch for the next two days. You are not cooking lunch this month.',
    recipes: [
      {
        slug: 'ribeye-skillet-greens',
        title: 'Cattle Baron Ribeye and Skillet Greens',
        hook: 'The steak does the work. The greens finish in what the steak leaves behind.',
        handsOn: '20 minutes',
        protein: 'about 48 g',
        netCarbs: 'about 6 g',
        ingredients: [
          '2 ribeye steaks, 1.25 to 1.5 in thick, about 16 oz each',
          '2 tbsp beef tallow',
          '1 lb kale or Swiss chard, stems stripped, leaves torn',
          '4 cloves garlic, sliced thin',
          '2 tbsp butter',
          'Coarse salt and cracked black pepper',
        ],
        method: [
          'Pull the steaks out 40 minutes ahead. Pat them bone dry and salt both sides hard.',
          'Heat a cast-iron skillet over high until the tallow shimmers and thins out, about 3 minutes.',
          'Lay the steaks in away from you. Do not move them for 4 minutes.',
          'Flip, add the butter, and baste with a spoon for 3 to 4 more minutes, to 130°F internal for medium-rare.',
          'Move the steaks to a board and let them rest 10 minutes. This is not optional.',
          'Drop the heat to medium, add the garlic to the drippings, and stir for 30 seconds until it smells sweet.',
          'Pile in the greens, salt them, and toss for 3 to 4 minutes until they collapse and turn glossy.',
          'Slice the steak against the grain, pour the resting juices back over, and serve on the greens.',
        ],
      },
      {
        slug: 'sheet-pan-chicken-broccoli',
        title: 'Sheet-Pan Chicken Thighs, Broccoli and Lemon',
        hook: 'Ten minutes of your attention. The oven owns the other thirty.',
        handsOn: '10 minutes',
        protein: 'about 42 g',
        netCarbs: 'about 7 g',
        ingredients: [
          '8 bone-in, skin-on chicken thighs',
          '2 lb broccoli, cut into large florets',
          '3 tbsp olive oil',
          '1 lemon, half sliced into rounds, half held back',
          '1 tbsp coarse salt, 1 tsp black pepper, 1 tsp garlic powder',
        ],
        method: [
          'Heat the oven to 425°F and set a rack in the upper third.',
          'Dry the thighs with paper towels. Wet skin never crisps.',
          'Rub them with 1 tbsp of the oil and all of the salt, pepper and garlic powder, under the skin as well as over it.',
          'Toss the broccoli with the remaining 2 tbsp oil and a pinch of salt on a large sheet pan.',
          'Push the broccoli to the edges, set the thighs skin-up in the middle, and tuck the lemon rounds among the florets.',
          'Roast 30 to 35 minutes, until the skin is brown and crisp and the thighs read 175°F at the bone.',
          'Squeeze the reserved lemon half over everything straight out of the oven and serve.',
        ],
      },
      {
        slug: 'ten-minute-salmon-asparagus',
        title: 'Ten-Minute Salmon and Asparagus',
        hook: 'One pan, one flip, dinner is on the table before the table is set.',
        handsOn: '12 minutes',
        protein: 'about 40 g',
        netCarbs: 'about 5 g',
        ingredients: [
          '4 skin-on wild salmon fillets, about 6 oz each',
          '1.5 lb asparagus, woody ends snapped off',
          '3 tbsp butter',
          '1 tbsp avocado oil',
          '2 tbsp fresh dill, chopped',
          '1 lemon',
          'Salt and pepper',
        ],
        method: [
          'Dry the salmon well and salt the skin side generously.',
          'Heat the avocado oil in a large skillet over medium-high until it just begins to shimmer.',
          'Lay the fillets in skin-down and press each one flat with a spatula for 10 seconds so the skin stays down.',
          'Cook undisturbed 5 to 6 minutes, until the flesh turns opaque two-thirds of the way up the side.',
          'Flip, add the butter and the asparagus alongside, and cook 3 more minutes, spooning butter over the fish.',
          'Pull the salmon at 125°F internal and give the asparagus one more minute if it still snaps hard.',
          'Scatter the dill, squeeze the lemon over the pan, and serve.',
        ],
      },
    ],
  },
  {
    n: 2,
    theme: 'One pan, one pot',
    intro:
      'Nothing this week needs a second burner. Three dinners, three pans, and the same leftovers rule as Week 1.',
    recipes: [
      {
        slug: 'beef-cabbage-skillet',
        title: 'Ground Beef and Cabbage Skillet',
        hook: 'The cheapest dinner of the month, and the one people ask you to make again.',
        handsOn: '20 minutes',
        protein: 'about 44 g',
        netCarbs: 'about 8 g',
        ingredients: [
          '2 lb ground beef, 85/15',
          '1 medium head green cabbage, cored and shredded',
          '1 yellow onion, sliced thin',
          '2 tsp smoked paprika',
          '1 tsp garlic powder',
          '2 tbsp butter',
          'Salt and pepper',
        ],
        method: [
          'Brown the beef in a wide skillet over medium-high, breaking it apart, 6 to 7 minutes. Do not drain the fat.',
          'Push the beef to one side, add the onion to the open fat, and cook 3 minutes until it goes soft and translucent.',
          'Stir in the paprika and garlic powder and let them toast for 30 seconds.',
          'Add the cabbage in two loads, letting the first wilt down before the second goes in.',
          'Salt, cover, and cook 6 minutes, stirring twice, until the cabbage is tender with a little bite left.',
          'Uncover, raise the heat, and cook 2 more minutes to drive off the water and catch some browning.',
          'Cut in the butter off the heat, taste for salt, and serve.',
        ],
      },
      {
        slug: 'pork-chops-brussels-mustard',
        title: 'Pork Chops, Brussels and Mustard Cream',
        hook: 'A restaurant pan sauce built out of the crust the chops leave behind.',
        handsOn: '25 minutes',
        protein: 'about 46 g',
        netCarbs: 'about 9 g',
        ingredients: [
          '4 bone-in pork chops, 1.25 in thick',
          '1.5 lb Brussels sprouts, halved',
          '2 tbsp ghee',
          '3/4 cup heavy cream',
          '2 tbsp Dijon mustard (check the label: no sugar)',
          '1/4 cup bone broth',
          'Salt and pepper',
        ],
        method: [
          'Salt the chops on both sides and let them sit at room temperature 20 minutes.',
          'Heat the ghee in a heavy skillet over medium-high and sear the chops 4 minutes per side, to 140°F internal.',
          'Move the chops to a plate to rest, loosely tented.',
          'Put the Brussels cut-side down in the same pan, salt, and leave them alone 4 minutes to brown deeply.',
          'Pour in the broth, scrape the browned bits off the bottom, cover, and cook 4 minutes until the sprouts give to a knife.',
          'Stir in the cream and Dijon and simmer 2 to 3 minutes until it coats the back of a spoon.',
          'Return the chops and their juices to the pan, spoon the sauce over, and serve.',
        ],
      },
      {
        slug: 'chicken-fajita-bowl',
        title: 'Chicken Fajita Bowl, No Tortilla',
        hook: 'Everything you want off the sizzling platter, without the thing that spikes you.',
        handsOn: '20 minutes',
        protein: 'about 45 g',
        netCarbs: 'about 10 g',
        ingredients: [
          '2.5 lb chicken breast, sliced into 1/2 in strips',
          '3 bell peppers, sliced',
          '1 large onion, sliced',
          '2 tbsp avocado oil',
          '1 tbsp cumin, 2 tsp chili powder, 1 tsp smoked paprika, 1 tsp salt',
          '1 head romaine, shredded',
          '2 avocados, sliced',
          '1 cup full-fat sour cream',
          '1 lime',
        ],
        method: [
          'Toss the chicken strips with the cumin, chili powder, paprika and salt until every piece is coated.',
          'Heat 1 tbsp of the oil in a large skillet over high until it is just about to smoke.',
          'Cook the chicken in two batches, 3 minutes a side, so the pan stays hot and the strips sear instead of steam.',
          'Set the chicken aside, add the last tbsp of oil, and cook the peppers and onion 5 to 6 minutes until charred at the edges but still firm.',
          'Return the chicken and any juices to the pan and toss for 1 minute.',
          'Build the bowls on a bed of shredded romaine.',
          'Top with avocado and sour cream and squeeze the lime over the top.',
        ],
      },
    ],
  },
  {
    n: 3,
    theme: 'Slow and easy',
    intro:
      'One dinner cooks all day without you. The other two are on the table in under twenty minutes.',
    recipes: [
      {
        slug: 'sunday-chuck-roast',
        title: 'Sunday Chuck Roast',
        hook: 'Ten minutes of work on Sunday morning buys you most of the week.',
        handsOn: '10 minutes',
        protein: 'about 50 g',
        netCarbs: 'about 4 g',
        ingredients: [
          '4 lb beef chuck roast',
          '2 yellow onions, quartered',
          '8 cloves garlic, peeled',
          '2 cups bone broth (read the label: no sugar, no yeast extract)',
          '2 tbsp tallow',
          '1 tbsp coarse salt, 2 tsp black pepper',
          '3 sprigs fresh thyme',
        ],
        method: [
          'Dry the roast and salt it on every side.',
          'Heat the tallow in a heavy skillet over high and sear the roast 3 minutes per face, all four sides. The color you build here is the flavor you eat later.',
          'Put the onions and garlic in the bottom of the slow cooker and set the roast on top.',
          'Pour the broth around, not over, the meat and lay the thyme on top.',
          'Cook on low 8 hours, until a fork twists in the meat with no resistance.',
          'Lift the roast out, pull it apart with two forks, and discard the thyme stems.',
          'Skim the fat off the liquid if you like, then spoon the liquid back over the shredded beef so it does not dry out in the fridge.',
        ],
      },
      {
        slug: 'shrimp-zucchini-scampi',
        title: 'Shrimp and Zucchini Scampi',
        hook: 'Fifteen minutes, and the zucchini carries the garlic butter the noodles used to.',
        handsOn: '15 minutes',
        protein: 'about 38 g',
        netCarbs: 'about 6 g',
        ingredients: [
          '2 lb large shrimp, peeled and deveined',
          '4 medium zucchini, run into ribbons with a peeler',
          '6 tbsp butter',
          '6 cloves garlic, minced',
          '1/2 cup fresh parsley, chopped',
          '1 lemon',
          '1/2 tsp red pepper flakes',
          'Salt',
        ],
        method: [
          'Lay the zucchini ribbons on a towel, salt them lightly, and leave them 10 minutes so they shed water.',
          'Dry the shrimp thoroughly and salt them.',
          'Melt 3 tbsp of the butter in a wide skillet over medium-high and cook the garlic and pepper flakes 30 seconds, no longer.',
          'Add the shrimp in one layer and cook 90 seconds a side, until they just turn opaque and curl into a C.',
          'Take the shrimp out and add the last 3 tbsp of butter.',
          'Pat the zucchini dry, add it, and toss 2 minutes only, so it stays ribbon-like instead of collapsing.',
          'Return the shrimp, squeeze in the lemon, throw in the parsley, and serve straight from the pan.',
        ],
      },
      {
        slug: 'turkey-sage-meatballs',
        title: 'Turkey-Sage Meatballs and Marinara',
        hook: 'No breadcrumbs, no sugar in the jar, and they still hold together.',
        handsOn: '25 minutes',
        protein: 'about 44 g',
        netCarbs: 'about 9 g',
        ingredients: [
          '2.5 lb ground turkey, 93/7',
          '2 eggs',
          '1 cup grated parmesan',
          '2 tbsp fresh sage, chopped fine',
          '3 cloves garlic, minced',
          '1.5 tsp salt, 1 tsp black pepper',
          '24 oz no-sugar-added marinara',
          '2 tbsp olive oil',
          '1.5 lb baby spinach',
        ],
        method: [
          'Heat the oven to 400°F and line a sheet pan.',
          'Mix the turkey, eggs, parmesan, sage, garlic, salt and pepper with your hands until just combined. Overworking it makes them tough.',
          'Roll 20 meatballs, about 2 in across, and set them on the pan with space between.',
          'Bake 18 to 20 minutes, to 165°F internal.',
          'While they bake, warm the marinara in a wide pot over low.',
          'Heat the olive oil in a skillet and wilt the spinach in batches, 2 minutes, with a pinch of salt.',
          'Slide the meatballs into the sauce and turn them to coat.',
          'Serve over the spinach with the sauce spooned across.',
        ],
      },
    ],
  },
  {
    n: 4,
    theme: 'The repeat month starts here',
    intro:
      'The last three dinners of the rotation. When you finish this week, you start again at Week 1 — the same twelve, on purpose, until they are automatic.',
    recipes: [
      {
        slug: 'steak-salad-baron',
        title: 'Steak Salad, Baron Style',
        hook: 'A salad that eats like a steakhouse dinner, because it is one.',
        handsOn: '20 minutes',
        protein: 'about 45 g',
        netCarbs: 'about 7 g',
        ingredients: [
          '2 lb sirloin steak',
          '8 strips bacon (no sugar in the cure)',
          '2 heads romaine, chopped',
          '4 oz blue cheese, crumbled',
          '2 cups cherry tomatoes, halved',
          '1/3 cup olive oil, 2 tbsp red wine vinegar, 1 tsp Dijon',
          'Salt and cracked pepper',
        ],
        method: [
          'Salt the sirloin on both sides and let it sit out 20 minutes.',
          'Lay the bacon in a cold cast-iron skillet, bring it up to medium, and cook 8 minutes until crisp. Move it to a towel and keep the fat.',
          'Raise the heat to high and sear the steak 4 minutes a side in the bacon fat, to 130°F internal.',
          'Rest the steak 10 minutes on a board while you build the rest.',
          'Shake the olive oil, vinegar, Dijon, salt and pepper together in a jar until it thickens.',
          'Toss the romaine with about half the vinaigrette, then spread it across a platter.',
          'Slice the steak thin against the grain and lay it over the greens.',
          'Scatter the blue cheese, tomatoes and crumbled bacon, pour the resting juices and the rest of the vinaigrette over, and serve.',
        ],
      },
      {
        slug: 'coconut-chicken-curry',
        title: 'Coconut Chicken Curry, No Rice',
        hook: 'The cauliflower soaks up everything the rice used to, and gives nothing back.',
        handsOn: '25 minutes',
        protein: 'about 42 g',
        netCarbs: 'about 11 g',
        ingredients: [
          '2.5 lb boneless chicken thighs, cut in 1.5 in pieces',
          '2 cans full-fat coconut milk, 13.5 oz each',
          '1 head cauliflower, cut into small florets',
          '2 tbsp curry powder',
          '1 tbsp fresh ginger, grated',
          '4 cloves garlic, minced',
          '1 onion, diced',
          '2 tbsp coconut oil',
          'Salt, and cilantro and lime to finish',
        ],
        method: [
          'Salt the chicken pieces and dry them on a towel.',
          'Melt the coconut oil in a wide pot over medium-high and brown the chicken in two batches, 4 minutes each, then set it aside.',
          'Drop to medium, add the onion, and cook 4 minutes until soft.',
          'Add the garlic, ginger and curry powder and stir 1 minute, until the pot smells like the spice and not like raw powder.',
          'Pour in the coconut milk, scrape the bottom clean, and bring it to a low simmer.',
          'Return the chicken with its juices and add the cauliflower. Simmer uncovered 12 to 15 minutes, until the cauliflower is tender and the sauce has tightened.',
          'Salt to taste, finish with cilantro and a squeeze of lime, and serve.',
        ],
      },
      {
        slug: 'baked-cod-brown-butter',
        title: 'Baked Cod with Brown Butter and Green Beans',
        hook: 'Brown butter takes 90 seconds and makes plain white fish taste expensive.',
        handsOn: '15 minutes',
        protein: 'about 40 g',
        netCarbs: 'about 6 g',
        ingredients: [
          '4 cod fillets, about 8 oz each',
          '1.5 lb green beans, trimmed',
          '6 tbsp butter',
          '2 tbsp capers, drained',
          '1 tbsp avocado oil',
          '1 lemon',
          'Salt and pepper',
        ],
        method: [
          'Heat the oven to 400°F. Dry the cod, salt it, and set it on an oiled sheet pan.',
          'Bake 12 to 14 minutes, until the fish flakes with light pressure and reads 130°F.',
          'While it bakes, heat the avocado oil in a skillet over high and add the green beans in one layer.',
          'Leave them still 3 minutes to blister, then toss and cook 3 more minutes until they are charred in spots and still snap.',
          'Salt the beans and move them to a platter.',
          'Wipe the pan, melt the butter over medium, and swirl 2 to 3 minutes until the milk solids turn brown and it smells like toasted nuts. Pull it off the heat right then.',
          'Stir the capers into the brown butter and squeeze in half the lemon.',
          'Set the cod on the beans, pour the brown butter over, and serve with the rest of the lemon.',
        ],
      },
    ],
  },
];

export const getWeek = (n: number) => WEEKS.find((w) => w.n === n);

// Affiliate destinations. ButcherBox and Thrive are PLACEHOLDER front-door links
// until the Impact.com tracking links exist — the data-affiliate="pending" flag
// marks every one of them so they are easy to find and swap.
export const BUY_LINKS = {
  butcherbox: { label: 'Meat: ButcherBox', href: 'https://www.butcherbox.com/', vendor: 'butcherbox', pending: true },
  thrive: { label: 'Pantry: Thrive Market', href: 'https://thrivemarket.com/', vendor: 'thrive', pending: true },
  amazon: { label: 'Everything else: Amazon', href: '/weekly-picks', vendor: 'amazon', pending: false },
} as const;

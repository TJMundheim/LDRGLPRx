// apply_theme.js (external skill script) resolves pptxgenjs/jszip by bare name; expose our node_modules to it.
process.env.NODE_PATH = require("path").join(__dirname, "node_modules"); require("module")._initPaths();
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const SK = process.env.PPTX_SKILL_SCRIPTS || "/Users/thomasmundheim/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/05f0a689-b3bd-417f-9fb8-dc2d26526007/528874af-4eef-44bb-93b2-cdc75c7de2f7/skills/pptx/scripts/apply_theme.js";
const { applyTheme } = require(SK);
const OUT = process.argv[2] || "My4MLife_Talk_v4_4.pptx";
// Speaker notes carried over from v1, keyed by v1 slide number. v2 additions are appended below.
const N1 = require("./notes_v1.json");
const note = (k, extra) => N1[String(k)] + (extra ? "\n\n" + extra : "");

const K = {
  navy: "0A1430", card: "14224A", line: "34508C", gold: "D4A94E", goldL: "E9C97E",
  white: "FFFFFF", soft: "D7DFEE", muted: "9FB0CC",
  red: "E8432F", yellow: "FFD43B", blue: "3D6BE0", burg: "B8334A", cream: "F1EBDD", green: "4FC18A",
};
const THEME = {
  name: "My4MLife Talk", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: K.navy, lt1: "FFFFFF", dk2: K.card, lt2: K.soft, accent1: K.gold, accent2: K.red,
    accent3: K.blue, accent4: K.burg, accent5: K.green, accent6: K.muted, hlink: K.goldL, folHlink: K.gold },
};
async function icon(name, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: "256" }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Begin with the End in Mind — Body, Brain, Bank";
  pres.author = "Dr. TJ Mundheim · My4MLife";
  pres.theme = { headFontFace: "Cambria", bodyFontFace: "Calibri" };
  const W = 13.333, H = 7.5, M = 0.6, CW = W - 2 * M;

  const footer = [
    { image: { path: "emblem.png", x: W - 2.25, y: H - 0.62, w: 0.36, h: 0.36 } },
    { text: { text: "MY4MLIFE", options: { x: W - 1.82, y: H - 0.6, w: 1.3, h: 0.32, fontSize: 11, bold: true, color: K.gold, charSpacing: 3, fontFace: "Calibri", margin: 0, valign: "middle" } } },
  ];
  const mkMaster = (title, bg) => pres.defineSlideMaster({
    title, background: { path: bg }, objects: [...footer,
      { placeholder: { options: { name: "title", type: "title", x: M, y: 0.35, w: CW, h: 0.95, fontSize: 34, bold: true,
        color: "FFFFFF", fontFace: "Cambria", valign: "middle", margin: 0 }, text: "" } }],
    slideNumber: { x: M, y: H - 0.55, w: 0.6, h: 0.3, fontSize: 10, color: K.muted, fontFace: "Calibri" },
  });
  mkMaster("MAIN", "m_main.jpg"); mkMaster("BODY", "m_body.jpg"); mkMaster("BRAIN", "m_brain.jpg"); mkMaster("BANK", "m_bank.jpg");
  pres.defineSlideMaster({ title: "FREE_TITLE", background: { path: "m_title.jpg" }, objects: footer });
  pres.defineSlideMaster({ title: "FREE_BODY", background: { path: "m_body.jpg" }, objects: footer });
  pres.defineSlideMaster({ title: "FREE_BRAIN", background: { path: "m_brain.jpg" }, objects: footer });
  pres.defineSlideMaster({ title: "FREE_BANK", background: { path: "m_bank.jpg" }, objects: footer });

  const shadow = () => ({ type: "outer", color: "000000", opacity: 0.35, blur: 8, offset: 2, angle: 90 });
  const txt = (s, t, o) => s.addText(t, Object.assign({ isTextBox: true, margin: 0, fontFace: "Calibri", color: K.soft }, o));
  const card = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12,
    fill: { color: o.fill || K.card, transparency: o.tr === undefined ? 18 : o.tr }, line: { color: o.line || K.line, width: o.lw || 1 },
    shadow: shadow(), objectName: o.name || "Card" });
  const ring = async (s, ic, x, y, d, col = K.gold, name = "Icon") => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: "1B2C5C" }, line: { color: col, width: 1.5 }, objectName: name + " circle" });
    s.addImage({ data: await icon(ic, col), x: x + d * 0.26, y: y + d * 0.26, w: d * 0.48, h: d * 0.48, objectName: name });
  };
  const slide = (master, sec, title) => { const s = pres.addSlide({ masterName: master, sectionTitle: sec }); if (title) s.addText(title, { placeholder: "title" }); return s; };
  const qr = (s, path, x, y, d, cap, sub) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.15, y: y - 0.15, w: d + 0.3, h: d + 0.3 + (cap ? 1.0 : 0), rectRadius: 0.12, fill: { color: "FFFFFF" }, line: { color: K.gold, width: 2 }, shadow: shadow(), objectName: "QR card" });
    s.addImage({ path, x, y, w: d, h: d, objectName: "QR code " + (cap || "") });
    if (cap) txt(s, [{ text: cap, options: { bold: true, breakLine: !!sub } }].concat(sub ? [{ text: sub, options: { fontSize: 13, color: "5B6475" } }] : []),
      { x: x - 0.1, y: y + d + 0.1, w: d + 0.2, h: 0.8, fontSize: 17, color: K.navy, align: "center", valign: "top" });
  };
  const book = (s, path, x, y, h, name) => s.addImage({ path, x, y, w: h / 1.6, h, shadow: shadow(), objectName: name + " cover" });
  const big = (s, t, o) => txt(s, t, Object.assign({ fontFace: "Cambria", bold: true, color: "FFFFFF" }, o));
  const kicker = (s, t, col, y = 1.0, x = M + 0.2) => txt(s, t, { x, y, w: 9, h: 0.4, fontSize: 16, bold: true, charSpacing: 4, color: col });
  const covers = { bw: ["bwtem.png", "Begin with the End in Mind"], ud: ["ud.jpg", "The Uninsured Decade"], cys: ["cys_front.png", "Count Yourself Skinny"] };
  const divider = (master, sec, kick, kcol, lines, sub, subcol, cover, coverName) => {
    const s = slide(master, sec);
    kicker(s, kick, kcol, 1.75);
    lines.forEach((l, i) => big(s, l[0], { x: M + 0.2, y: 2.35 + i * 1.0, w: 8.3, h: 0.95, fontSize: 43, color: l[1] || "FFFFFF", valign: "middle" }));
    txt(s, sub, { x: M + 0.2, y: 2.55 + lines.length * 1.0, w: 8.0, h: 1.3, fontSize: 26, italic: true, color: subcol, valign: "top" });
    book(s, cover, 9.15, 0.95, 5.5, coverName);
    return s;
  };

  // ========== PRE-SHOW ==========
  pres.addSection({ title: "Pre-show" });
  {
    const s = slide("FREE_TITLE", "Pre-show");
    kicker(s, "WELCOME  ·  WHILE YOU WAIT", K.gold, 0.7);
    big(s, "How sharp will you be at 80?", { x: M + 0.2, y: 1.15, w: 8.4, h: 1.0, fontSize: 44 });
    txt(s, "Take Dr. TJ's free MindSpan assessment on your phone. About 7 minutes.", { x: M + 0.2, y: 2.2, w: 8.0, h: 0.85, fontSize: 22, color: "FFFFFF", valign: "top" });
    const gifts = [["FaBookOpen", "The book: Begin with the End in Mind"], ["FaClipboardList", "The 4M Logbook"], ["FaMobileAlt", "The Protégé app"], ["FaTrophy", "Automatic entry in tonight's signed-book drawing"]];
    txt(s, "SENT TO YOU FREE, RIGHT AWAY", { x: M + 0.2, y: 3.2, w: 7, h: 0.35, fontSize: 14, bold: true, charSpacing: 3, color: K.muted });
    for (let i = 0; i < gifts.length; i++) {
      const y = 3.65 + i * 0.64;
      await ring(s, gifts[i][0], M + 0.2, y, 0.52, i === 3 ? K.green : K.gold, "Gift " + (i + 1));
      txt(s, gifts[i][1], { x: M + 0.95, y: y + 0.02, w: 7.3, h: 0.48, fontSize: 20, color: "FFFFFF", valign: "middle" });
    }
    txt(s, "Wi-Fi: [network]  ·  Password: [password]        And please: don't open your snack yet.", { x: M + 0.2, y: 6.3, w: 8.6, h: 0.4, fontSize: 16, italic: true, color: K.goldL });
    qr(s, "qr_assess.png", 9.35, 1.4, 3.1, "Scan to start", "my4mlife.com/assessment");
    s.addNotes(note(1));
  }

  // ========== OPENING ==========
  pres.addSection({ title: "Opening" });
  {
    const s = slide("FREE_TITLE", "Opening");
    await ring(s, "FaBellSlash", (W - 1.6) / 2, 1.3, 1.6, K.gold, "Silence");
    big(s, "Ringers off. Phones away.", { x: 1, y: 3.3, w: W - 2, h: 1.0, fontSize: 54, align: "center" });
    txt(s, "Now… pick up your snack.", { x: 1, y: 4.5, w: W - 2, h: 0.8, fontSize: 34, italic: true, color: K.gold, align: "center" });
    s.addNotes(note(2));
  }
  {
    const s = slide("FREE_BODY", "Opening");
    big(s, "Take one bite.", { x: M + 0.2, y: 1.7, w: 7.2, h: 1.05, fontSize: 58 });
    big(s, "Count every chew.", { x: M + 0.2, y: 2.8, w: 7.2, h: 1.05, fontSize: 58, color: K.yellow });
    txt(s, "Don't change anything. Just chew the way you always do, and count silently until you swallow.", { x: M + 0.2, y: 4.3, w: 6.9, h: 1.3, fontSize: 24, color: "FFFFFF", valign: "top" });
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) s.addShape(pres.shapes.LINE, { x: 8.5 + i * 1.1 + j * 0.19, y: 2.3, w: 0, h: 1.5, line: { color: "FFFFFF", width: 6 }, objectName: "Tally mark" });
      s.addShape(pres.shapes.LINE, { x: 8.34 + i * 1.1, y: 3.45, w: 0.9, h: -0.9, line: { color: K.yellow, width: 6 }, objectName: "Tally cross" });
    }
    txt(s, "How many did you get?", { x: 8.3, y: 4.3, w: 4.4, h: 0.6, fontSize: 24, italic: true, color: K.goldL, align: "center" });
    s.addNotes(note(3));
  }
  {
    const s = slide("FREE_BODY", "Opening");
    txt(s, "MOST PEOPLE CHEW", { x: M + 0.2, y: 1.4, w: 5, h: 0.4, fontSize: 18, bold: true, charSpacing: 4, color: K.muted });
    big(s, "10–15", { x: M + 0.2, y: 1.95, w: 5.4, h: 1.7, fontSize: 104, color: K.muted });
    txt(s, "TONIGHT, WE COUNT TO", { x: 6.4, y: 1.4, w: 6, h: 0.4, fontSize: 18, bold: true, charSpacing: 4, color: K.yellow });
    big(s, "32", { x: 6.4, y: 1.15, w: 6, h: 3.6, fontSize: 230, color: K.yellow });
    txt(s, "Hold on to that snack. We're coming back to it.", { x: M + 0.2, y: 5.45, w: 11, h: 0.7, fontSize: 28, italic: true, color: "FFFFFF" });
    s.addNotes(note(4));
  }
  {
    const s = slide("FREE_TITLE", "Opening");
    const px = M + 0.2, py = 1.0, pw = 4.7, ph = 5.4;
    s.addImage({ path: "headshot.jpg", x: px, y: py, w: pw, h: ph, sizing: { type: "cover", w: pw, h: ph }, objectName: "Dr. TJ headshot" });
    s.addShape(pres.shapes.RECTANGLE, { x: px, y: py, w: pw, h: ph, fill: { type: "none" }, line: { color: K.gold, width: 2 }, objectName: "Headshot frame" });
    kicker(s, "YOUR HOST TONIGHT", K.gold, 1.25, 6.0);
    big(s, "Dr. TJ Mundheim", { x: 6.0, y: 1.75, w: 6.7, h: 1.0, fontSize: 48 });
    const pts = ["30+ years in clinical practice", "Founder of My4MLife", "Author of three books", "Masters track & field decathlete"];
    txt(s, pts.map((p, i) => ({ text: p, options: { bullet: true, breakLine: i < pts.length - 1 } })), { x: 6.0, y: 3.0, w: 6.7, h: 2.3, fontSize: 24, color: "FFFFFF", paraSpaceAfter: 8, valign: "top" });
    txt(s, "Doctor of Chiropractic (D.C.), NBCE-certified since 1994. Health-span educator; tonight is education, not medical advice.", { x: 6.0, y: 5.55, w: 6.5, h: 0.8, fontSize: 15, italic: true, color: K.muted, valign: "top" });
    s.addNotes(note(5));
  }
  {
    // v4.4 (TJ 2026-11-20): mission up front + the three books as a staircase, smallest step first.
    const s = slide("MAIN", "Opening", "Keep your mind. Keep who you are.");
    txt(s, "Your identity and your dignity, while you still have a choice.", { x: M + 0.2, y: 1.28, w: CW - 0.4, h: 0.5, fontSize: 22, italic: true, color: K.goldL, valign: "top" });
    const steps = [
      ["BODY", K.red, "cys", "Count Yourself Skinny", "The first step", "Count your chews. Walk at least 2,500 steps a day."],
      ["BANK", K.burg, "ud", "The Uninsured Decade", "The reason", "What ten years of care costs a family, plus the 4M basics."],
      ["BRAIN", K.blue, "bw", "Begin with the End in Mind", "The whole plan", "Everything that protects your mind, for life."]];
    const cw = 3.85, gap = (CW - 3 * cw) / 2, bottom = 6.55, tops = [3.35, 2.7, 2.05];
    for (let i = 0; i < 3; i++) {
      const x = M + i * (cw + gap), y = tops[i], st = steps[i];
      card(s, x, y, cw, bottom - y, { name: "Step " + (i + 1) + " card", line: i === 0 ? K.gold : undefined, lw: i === 0 ? 2 : undefined });
      txt(s, st[0], { x: x + 0.25, y: y + 0.15, w: cw - 0.5, h: 0.4, fontSize: 15, bold: true, charSpacing: 4, color: st[1] });
      book(s, covers[st[2]][0], x + 0.25, y + 0.65, 1.95, st[3]);
      big(s, st[4], { x: x + 1.55, y: y + 0.62, w: cw - 1.75, h: 0.5, fontSize: 22, color: "FFFFFF" });
      txt(s, st[5], { x: x + 1.55, y: y + 1.15, w: cw - 1.75, h: 1.45, fontSize: 16, color: K.soft, valign: "top" });
    }
    txt(s, [{ text: "START HERE", options: { bold: true, breakLine: true, charSpacing: 4 } }, { text: "Tonight: smallest step first", options: { italic: true } }],
      { x: M + 0.1, y: 2.3, w: cw, h: 0.9, fontSize: 17, color: K.goldL, valign: "bottom" });
    s.addNotes(note(6));
  }

  // ========== BODY ==========
  pres.addSection({ title: "Body" });
  {
    const s = divider("FREE_BODY", "Body", "PART 1  ·  BODY", K.yellow, [["You'll never count a calorie."], ["You'll count to 32 instead.", K.yellow]],
      "From Count Yourself Skinny", K.soft, "cys_front.png", "Count Yourself Skinny");
    s.addNotes(note(7));
  }
  {
    const s = slide("BODY", "Body", "Chew more, eat less, with no willpower required");
    s.addChart(pres.charts.BAR, [{ name: "Less food eaten", labels: ["Normal chewing", "50% more chews", "Twice the chews"], values: [0, 10, 15] }], {
      x: M, y: 1.5, w: 7.2, h: 4.55, barDir: "col", chartColors: ["7A869E", "F28A3C", K.yellow], invertedColors: ["7A869E", "F28A3C", K.yellow],
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"', dataLabelFontSize: 24, dataLabelFontBold: true, dataLabelColor: "FFFFFF", dataLabelFontFace: "+mn-lt",
      catAxisLabelColor: "FFFFFF", catAxisLabelFontSize: 17, catAxisLabelFontFace: "+mn-lt", valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 18,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false, barGapWidthPct: 45,
      showTitle: true, title: "% less food eaten at one lab lunch", titleColor: K.soft, titleFontSize: 17, titleFontFace: "+mn-lt" });
    const pts = [["FaUtensils", "Fork down", "Between every bite"], ["FaHourglassHalf", "Fullness catches up", "The signal takes about 20 minutes to land"], ["FaSmile", "No hungrier", "Same food, same table, they just stopped sooner"]];
    for (let i = 0; i < 3; i++) {
      const y = 1.65 + i * 1.5;
      await ring(s, pts[i][0], 8.1, y, 0.9, K.yellow, pts[i][1]);
      txt(s, pts[i][1], { x: 9.25, y: y - 0.05, w: 3.45, h: 0.5, fontSize: 23, bold: true, color: "FFFFFF", valign: "middle" });
      txt(s, pts[i][2], { x: 9.25, y: y + 0.48, w: 3.45, h: 0.85, fontSize: 18, color: K.soft, valign: "top" });
    }
    txt(s, "Iowa State University study of 45 adults. One meal, not a diet: one lever in a stack.", { x: M, y: 6.2, w: 11, h: 0.4, fontSize: 14, italic: true, color: K.muted, valign: "middle" });
    s.addNotes(note(8, "New in v2, from Begin with the End in Mind: your gut talks to your brain through fullness hormones, PYY and GLP-1 among them, and that conversation takes about twenty minutes. Protein triggers those hormones; chewing gives them the twenty minutes they need to be heard. That is the honest version of the GLP-1 line: protein makes the signal, chewing gives it time."));
  }
  {
    const s = slide("BODY", "Body", "Six easy numbers replace the diet");
    const c = [["FaTeeth", "32", "chews per bite, fork down"], ["FaWalking", "2,500", "steps a day: the floor, not the goal"], ["FaClock", "12 → 16", "hours between dinner and breakfast"],
      ["FaSun", "10", "minutes of morning light, outside"], ["FaTint", "2", "glasses of water before noon"], ["FaBed", "7 of 7", "nights of 7+ hours of sleep"]];
    const cw = 3.85, gap = (CW - 3 * cw) / 2;
    for (let i = 0; i < 6; i++) {
      const x = M + (i % 3) * (cw + gap), y = 1.5 + Math.floor(i / 3) * 2.6;
      card(s, x, y, cw, 2.4, { name: "Count " + (i + 1) });
      await ring(s, c[i][0], x + 0.3, y + 0.28, 0.85, K.yellow, "Count icon " + (i + 1));
      big(s, c[i][1], { x: x + 1.35, y: y + 0.22, w: 2.4, h: 0.95, fontSize: 42, color: K.yellow, valign: "middle" });
      txt(s, c[i][2], { x: x + 0.3, y: y + 1.35, w: cw - 0.5, h: 0.95, fontSize: 20, color: "FFFFFF", valign: "top" });
    }
    s.addNotes(note(9));
  }
  {
    const s = slide("BODY", "Body", "The biggest payoff is at the bottom of the curve");
    big(s, "2,500", { x: M + 0.2, y: 1.75, w: 6.0, h: 1.8, fontSize: 118, color: K.yellow, valign: "middle" });
    txt(s, "steps a day: about 20 minutes of walking, total", { x: M + 0.2, y: 3.7, w: 5.6, h: 1.1, fontSize: 26, color: "FFFFFF", valign: "top" });
    const st = [["~2,300", "steps: where the heart benefit starts to show"], ["~3,900", "steps: where the all-cause benefit shows"], ["7%", "fewer heart-related deaths for every extra 500 steps"]];
    for (let i = 0; i < 3; i++) {
      const y = 1.55 + i * 1.5;
      card(s, 6.75, y, W - M - 6.75, 1.32, { name: "Step stat " + (i + 1) });
      big(s, st[i][0], { x: 7.0, y: y + 0.1, w: 2.0, h: 1.1, fontSize: 36, color: K.yellow, valign: "middle" });
      txt(s, st[i][1], { x: 9.05, y: y + 0.1, w: 3.5, h: 1.1, fontSize: 19, color: "FFFFFF", valign: "middle" });
    }
    txt(s, "10,000 steps started as a 1960s Japanese marketing slogan. Pooled analysis of 17 studies, ~227,000 adults (Eur J Prev Cardiol). A link, not proof.", { x: M, y: 6.15, w: 11.6, h: 0.5, fontSize: 13, italic: true, color: K.muted, valign: "middle" });
    s.addNotes(note(10));
  }
  {
    const s = slide("BODY", "Body", "One walk, five boxes");
    big(s, "25", { x: M + 0.2, y: 1.55, w: 3.6, h: 1.9, fontSize: 130, color: K.yellow, valign: "middle" });
    txt(s, "minutes, before breakfast, checks five boxes at once", { x: M + 0.2, y: 3.6, w: 3.5, h: 1.6, fontSize: 24, color: "FFFFFF", valign: "top" });
    const b = [["Steps", "2,500 banked before the day can interfere"], ["Morning light", "10+ minutes outside sets tonight's clock"], ["Hours", "Your overnight fast keeps going"], ["Tonight's sleep", "Morning light helps you fall asleep sooner"], ["Water", "One glass before you go, one after"]];
    for (let i = 0; i < 5; i++) {
      const y = 1.5 + i * 0.82;
      card(s, 4.5, y, W - M - 4.5, 0.7, { name: "Box " + (i + 1) });
      s.addImage({ data: await icon("FaCheckSquare", K.yellow), x: 4.7, y: y + 0.12, w: 0.46, h: 0.46, objectName: "Checkbox " + (i + 1) });
      txt(s, b[i][0], { x: 5.4, y, w: 2.5, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF", valign: "middle" });
      txt(s, b[i][1], { x: 7.95, y, w: 4.65, h: 0.7, fontSize: 17, color: K.soft, valign: "middle" });
    }
    card(s, 4.5, 5.7, W - M - 4.5, 0.92, { name: "Protein first callout", fill: "3A2A12", line: K.yellow, lw: 1.5, tr: 8 });
    s.addImage({ data: await icon("FaEgg", K.yellow), x: 4.72, y: 5.93, w: 0.42, h: 0.46, objectName: "Protein icon" });
    txt(s, [{ text: "Then eat. Protein first, ", options: { bold: true, color: K.yellow } }, { text: "one bite at a time, fork down, 32 chews." }], { x: 5.4, y: 5.7, w: 7.2, h: 0.92, fontSize: 20, color: "FFFFFF", valign: "middle" });
    s.addNotes(note(11, "New in v2: finish the walk the way the book does. Walk back in and eat your first meal protein first: eggs, fish, meat or Greek yogurt before anything else on the plate. My rule of thumb is thirty to forty grams, and you won't weigh it: four or five eggs, or a palm and a half of chicken or fish. Protein triggers your own fullness hormones, the same GLP-1 family people are paying for, and the 32 chews give them time to be heard."));
  }
  {
    const s = slide("BODY", "Body", "The only rule that matters: never miss twice");
    card(s, M, 1.55, 5.9, 5.0, { name: "Streak card" });
    txt(s, "EVERY EVENING, ONE QUESTION", { x: M + 0.35, y: 1.8, w: 5.2, h: 0.4, fontSize: 15, bold: true, charSpacing: 3, color: K.muted });
    big(s, "Did I hit my counts today?", { x: M + 0.35, y: 2.3, w: 5.2, h: 1.45, fontSize: 36, valign: "top" });
    txt(s, "Yes, and the streak grows by one. That's the entire tracking system: one number.", { x: M + 0.35, y: 3.95, w: 5.2, h: 1.3, fontSize: 21, color: "FFFFFF", valign: "top" });
    txt(s, "Sick, traveling, slammed? Shrink the day, not the streak.", { x: M + 0.35, y: 5.4, w: 5.2, h: 0.95, fontSize: 19, italic: true, color: K.yellow, valign: "top" });
    const rx = 6.85, rw = W - M - rx;
    card(s, rx, 1.55, rw, 5.0, { name: "Never miss twice card" });
    const days = ["M", "T", "W", "T", "F", "S", "S"], ok = [1, 1, 0, 1, 1, 1, 1];
    days.forEach((d, i) => {
      const x = rx + 0.32 + i * 0.76;
      s.addShape(pres.shapes.OVAL, { x, y: 1.9, w: 0.66, h: 0.66, fill: { color: ok[i] ? K.yellow : "2A3A66" }, line: { color: ok[i] ? K.yellow : K.muted, width: 1 }, objectName: "Day " + (i + 1) });
      txt(s, d, { x, y: 1.9, w: 0.66, h: 0.66, fontSize: 18, bold: true, color: ok[i] ? K.navy : K.muted, align: "center", valign: "middle" });
    });
    txt(s, "One missed day is a rest.", { x: rx + 0.32, y: 2.95, w: rw - 0.6, h: 0.6, fontSize: 25, bold: true, color: "FFFFFF", valign: "middle" });
    txt(s, "Two in a row is a new habit forming in the wrong direction.", { x: rx + 0.32, y: 3.65, w: rw - 0.6, h: 1.3, fontSize: 25, bold: true, color: K.yellow, valign: "top" });
    txt(s, [{ text: "Free Count Log:", options: { bold: true, breakLine: true } }, { text: "my4mlife.com/go/count-yourself-skinny", options: { breakLine: true } }, { text: "or log your counts in the free Protégé app" }], { x: rx + 0.32, y: 5.3, w: rw - 0.6, h: 1.05, fontSize: 15, color: K.goldL, valign: "top" });
    s.addNotes(note(12, "New in v2, from the book: on a bad day, shrink the day, not the streak. A five-minute walk and slow-chewed meals still count. The streak measures showing up, not performance."));
  }

  // ========== TURN ==========
  {
    const s = slide("FREE_TITLE", "Body");
    big(s, "Why does any of this matter?", { x: 1, y: 2.65, w: W - 2, h: 1.1, fontSize: 52, align: "center" });
    big(s, "Because of how it ends.", { x: 1, y: 3.9, w: W - 2, h: 1.1, fontSize: 52, align: "center", color: K.gold });
    s.addNotes(note(13));
  }

  // ========== BRAIN ==========
  pres.addSection({ title: "Brain" });
  {
    const s = divider("FREE_BRAIN", "Brain", "PART 2  ·  BRAIN", K.goldL, [["Begin with the End in Mind"]],
      "Don't lose your identity and your dignity while you still have a choice.", K.goldL, "bwtem.png", "Begin with the End in Mind");
    s.addNotes(note(14));
  }
  {
    const s = slide("BRAIN", "Brain", "Alzheimer's shows up late. It starts in midlife.");
    const y = 2.6, x0 = M + 1.45, x1 = W - M - 1.45;
    s.addShape(pres.shapes.LINE, { x: x0, y, w: x1 - x0, h: 0, line: { color: K.goldL, width: 3 }, objectName: "Life timeline" });
    const pts = [["40s", "Changes in the brain can begin", 0.0, K.blue], ["50s", "Still silent: no symptoms yet", 0.33, K.blue], ["60s", "Brain fog, word-finding, \"senior moments\"", 0.66, K.gold], ["70s+", "Diagnosis", 1.0, K.burg]];
    pts.forEach((p) => {
      const cx = x0 + p[2] * (x1 - x0);
      s.addShape(pres.shapes.OVAL, { x: cx - 0.27, y: y - 0.27, w: 0.54, h: 0.54, fill: { color: p[3] }, line: { color: "FFFFFF", width: 2 }, objectName: "Timeline " + p[0] });
      big(s, p[0], { x: cx - 1.3, y: 1.55, w: 2.6, h: 0.7, fontSize: 34, align: "center", color: "FFFFFF", valign: "middle" });
      txt(s, p[1], { x: cx - 1.4, y: 3.02, w: 2.8, h: 0.95, fontSize: 19, align: "center", color: "FFFFFF", valign: "top" });
    });
    big(s, "The disease is written in middle age and read out loud in old age.", { x: M, y: 4.1, w: CW, h: 0.8, fontSize: 27, italic: true, bold: false, color: K.goldL, align: "center", valign: "middle" });
    card(s, M, 5.05, CW, 1.1, { name: "Window callout", fill: "1C2F6A", tr: 8 });
    txt(s, "The changes can begin 20 years or more before symptoms. That's the window, and it's open right now.", { x: M + 0.35, y: 5.1, w: CW - 0.7, h: 1.0, fontSize: 22, bold: true, color: "FFFFFF", valign: "middle", align: "center" });
    txt(s, "Source: Alzheimer's Association.", { x: M, y: 6.3, w: 6, h: 0.3, fontSize: 13, italic: true, color: K.muted });
    s.addNotes(note(15, "New in v2, a line from the book you can say out loud: the disease is written in middle age and read out loud in old age. The only place you can change the sentence is while you are still writing it."));
  }
  {
    const s = slide("BRAIN", "Brain");
    txt(s, "ACROSS THE POPULATION, UP TO", { x: M + 0.2, y: 1.2, w: 7.5, h: 0.5, fontSize: 22, bold: true, charSpacing: 5, color: K.goldL, valign: "middle" });
    big(s, "45%", { x: M + 0.2, y: 1.6, w: 7.0, h: 2.7, fontSize: 180, color: K.gold, valign: "middle" });
    big(s, "of dementia cases may be preventable or delayed", { x: M + 0.2, y: 4.4, w: 7.4, h: 1.25, fontSize: 32, valign: "top" });
    txt(s, "A number about all of us, not a promise to any one of us. For one person, the honest line is: it may lower the odds.", { x: M + 0.2, y: 5.7, w: 7.4, h: 0.75, fontSize: 17, italic: true, color: K.goldL, valign: "top" });
    txt(s, "Source: The Lancet Commission on dementia prevention, intervention, and care, 2024.", { x: M + 0.2, y: 6.5, w: 8, h: 0.3, fontSize: 12, italic: true, color: K.muted });
    card(s, 8.5, 1.5, W - M - 8.5, 4.9, { name: "Myth card" });
    txt(s, "THE MYTH", { x: 8.8, y: 1.75, w: 3.6, h: 0.4, fontSize: 15, bold: true, charSpacing: 3, color: K.muted });
    txt(s, "\"It's just genetics and bad luck.\"", { x: 8.8, y: 2.25, w: 3.65, h: 1.6, fontSize: 28, italic: true, color: "FFFFFF", valign: "top", fontFace: "Cambria" });
    txt(s, "That belief is the single biggest reason people do nothing for decades.", { x: 8.8, y: 4.05, w: 3.65, h: 2.1, fontSize: 21, color: K.goldL, valign: "top" });
    s.addNotes(note(16, "New in v2, and both books are careful about this: 45 percent is a population number. It answers: if everyone removed all fourteen risk factors across a whole lifetime, what share of cases would disappear? It is not a promise that you, personally, cut your own risk by 45 percent. In The Uninsured Decade I use a more conservative working assumption for one motivated person, about 30 percent, built on trials like US POINTER (JAMA, 2025), which showed protection from decline over two years, not prevention of dementia. The only honest sentence is: it may lower the odds."));
  }
  {
    const s = slide("BRAIN", "Brain", "14 risk factors you can actually influence");
    const f = [["FaGraduationCap", "Less education"], ["FaDeaf", "Hearing loss"], ["FaVial", "High LDL cholesterol"], ["FaSadTear", "Depression"], ["FaUserInjured", "Head injury"], ["FaCouch", "Physical inactivity"], ["FaSyringe", "Diabetes"],
      ["FaSmoking", "Smoking"], ["FaHeartbeat", "High blood pressure"], ["FaWeight", "Obesity"], ["FaWineGlassAlt", "Excess alcohol"], ["FaUsers", "Social isolation"], ["FaSmog", "Air pollution"], ["FaEye", "Untreated vision loss"]];
    const cw = 2.9, gap = (CW - 4 * cw) / 3, pitch = 1.06;
    for (let i = 0; i < 14; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = M + col * (cw + gap), y = 1.45 + row * pitch;
      card(s, x, y, cw, 0.92, { name: "Risk " + (i + 1) });
      await ring(s, f[i][0], x + 0.14, y + 0.13, 0.66, K.gold, "Risk icon " + (i + 1));
      txt(s, f[i][1], { x: x + 0.93, y, w: cw - 1.0, h: 0.92, fontSize: 17, color: "FFFFFF", valign: "middle" });
    }
    const cx = M + 2 * (cw + gap), cy = 1.45 + 3 * pitch;
    card(s, cx, cy, 2 * cw + gap, 0.92, { name: "Callout", fill: "1C2F6A", line: K.gold, tr: 8 });
    txt(s, "Many of them start with tonight's counts.", { x: cx + 0.25, y: cy, w: 2 * cw + gap - 0.5, h: 0.92, fontSize: 19, bold: true, color: K.goldL, valign: "middle" });
    s.addImage({ data: await icon("FaCalendarCheck", K.gold), x: M + 0.05, y: 5.82, w: 0.36, h: 0.4, objectName: "Calendar icon" });
    txt(s, [{ text: "Three you can book this month:  ", options: { bold: true, color: K.goldL } }, { text: "a hearing test, an eye exam, and a gum check at the dentist." }], { x: M + 0.6, y: 5.72, w: CW - 0.6, h: 0.6, fontSize: 20, color: "FFFFFF", valign: "middle" });
    txt(s, "Source: The Lancet Commission, 2024. Gum disease is not on the Commission's list; see Sources.", { x: M, y: 6.4, w: 9, h: 0.3, fontSize: 12, italic: true, color: K.muted });
    s.addNotes(note(17, "New in v2, from The Uninsured Decade: three front doors standing open. Two are on this list and nobody expects them: untreated hearing loss and untreated vision loss. The third, your teeth, is not on the Commission's list but belongs beside them: the bacteria of chronic gum disease have been found in the brain tissue of Alzheimer's patients. That is an association, not proof. All three are things you can book this month: a hearing test, an eye exam, and a periodontal probing at the dentist. Not a cleaning, a probing."));
  }
  {
    const s = slide("BRAIN", "Brain", "The 4M System: one framework for all of it");
    s.addImage({ path: "emblem.png", x: M, y: 2.25, w: 3.5, h: 3.5, objectName: "4M emblem" });
    const m = [["FaBrain", "Mind", "The destination", "Learning, sleep, hearing and vision, mood, connection"], ["FaDumbbell", "Muscle", "The engine", "Movement, strength, a healthy weight"],
      ["FaShieldAlt", "Mitigate", "Remove the harm", "Gut, blood pressure, blood sugar, cholesterol, alcohol"], ["FaBullseye", "Motivate", "Make it stick", "Purpose, identity, daily structure, follow-through"]];
    const x0 = 4.5, cw = (W - M - x0 - 0.25) / 2;
    for (let i = 0; i < 4; i++) {
      const x = x0 + (i % 2) * (cw + 0.25), y = 1.5 + Math.floor(i / 2) * 2.6;
      card(s, x, y, cw, 2.4, { name: m[i][1] });
      await ring(s, m[i][0], x + 0.28, y + 0.28, 0.9, K.gold, m[i][1]);
      big(s, m[i][1], { x: x + 1.4, y: y + 0.22, w: cw - 1.5, h: 0.6, fontSize: 30, color: "FFFFFF", valign: "middle" });
      txt(s, m[i][2], { x: x + 1.4, y: y + 0.82, w: cw - 1.5, h: 0.4, fontSize: 18, italic: true, color: K.goldL, valign: "middle" });
      txt(s, m[i][3], { x: x + 0.28, y: y + 1.4, w: cw - 0.5, h: 0.9, fontSize: 18, color: "FFFFFF", valign: "top" });
    }
    s.addNotes(note(18));
  }
  {
    const s = slide("FREE_BRAIN", "Brain");
    await ring(s, "FaMobileAlt", M + 0.2, 1.3, 1.3, K.gold, "Phone");
    kicker(s, "QUICK CHECK-IN", K.goldL, 1.75, M + 1.8);
    big(s, "Took the MindSpan assessment before we started?", { x: M + 0.2, y: 2.9, w: 8.3, h: 1.5, fontSize: 42, valign: "top" });
    txt(s, "Look at your results: what are your top three?", { x: M + 0.2, y: 4.5, w: 8.2, h: 0.65, fontSize: 28, color: K.goldL, valign: "middle" });
    txt(s, "Not yet? It's on the back of your card. It takes about 7 minutes, and it enters you in tonight's drawing.", { x: M + 0.2, y: 5.3, w: 8.0, h: 1.1, fontSize: 21, color: "FFFFFF", valign: "top" });
    qr(s, "qr_assess.png", 9.45, 1.55, 3.0, "Free MindSpan assessment", "my4mlife.com/assessment");
    s.addNotes(note(19));
  }
  {
    const s = slide("FREE_BRAIN", "Brain");
    card(s, M, 1.0, CW, 5.4, { name: "Quote card", fill: "0E1A3D", tr: 12 });
    s.addImage({ data: await icon("FaQuoteLeft", K.gold), x: M + 0.5, y: 1.4, w: 0.95, h: 0.8, objectName: "Quote mark" });
    big(s, "They want to be present and sharp at their granddaughter's wedding: to recognize her face, remember her husband's name, and finish the toast they planned.", { x: M + 0.5, y: 2.4, w: CW - 1.0, h: 2.75, fontSize: 36, bold: false, italic: true, valign: "top" });
    txt(s, "— Dr. TJ", { x: M + 0.5, y: 5.35, w: 6, h: 0.6, fontSize: 24, color: K.goldL, bold: true, valign: "middle" });
    s.addNotes(note(20));
  }
  // NEW in v2: the accountability target
  {
    const s = slide("FREE_BRAIN", "Brain");
    kicker(s, "ONE QUESTION BEFORE WE TALK ABOUT MONEY", K.goldL, 1.15);
    big(s, "Who are you doing this for?", { x: M + 0.2, y: 1.7, w: CW - 0.4, h: 1.3, fontSize: 64, valign: "middle" });
    txt(s, "One person. One face. Someone you can picture in a room.", { x: M + 0.2, y: 3.15, w: CW - 0.4, h: 0.7, fontSize: 30, italic: true, color: K.goldL, valign: "middle" });
    card(s, M, 4.3, 7.3, 2.1, { name: "Purpose card" });
    txt(s, "ABOUT", { x: M + 0.4, y: 4.5, w: 3.0, h: 0.4, fontSize: 15, bold: true, charSpacing: 4, color: K.goldL, valign: "middle" });
    big(s, "2½×", { x: M + 0.35, y: 4.85, w: 3.1, h: 1.4, fontSize: 72, color: K.gold, valign: "middle" });
    txt(s, "less likely to develop Alzheimer's: people with a strong sense of purpose, in one long-running study. A link, not proof.", { x: M + 3.6, y: 4.45, w: 3.5, h: 1.8, fontSize: 17, color: "FFFFFF", valign: "middle" });
    card(s, 8.15, 4.3, W - M - 8.15, 2.1, { name: "Partner card", fill: "1C2F6A", line: K.gold, tr: 8 });
    txt(s, "\"…and the one I married spends that decade as my partner, not as my nurse.\"", { x: 8.4, y: 4.4, w: W - M - 8.65, h: 1.9, fontSize: 21, italic: true, color: "FFFFFF", valign: "middle", fontFace: "Cambria" });
    txt(s, "Source: Boyle et al., Rush Memory and Aging Project, 2010.", { x: M, y: 6.5, w: 8, h: 0.3, fontSize: 12, italic: true, color: K.muted });
    s.addNotes("New in v2. This is the question both books ask before any 'why'. Not why are you doing this. Who are you doing this for?\n\nAsk the room to pick one person. Not 'my family', which is four people and therefore nobody. One face you can picture in a room: a husband or wife, a daughter, a son, a parent you are already watching, or yourself at seventy-eight, still the one people call when something has to be decided. [Pause. Give them ten seconds of silence.] Now say the name, quietly, to yourself.\n\nThen the evidence: in a long-running Rush University study of older adults, people who scored high on purpose in life were roughly two and a half times less likely to develop Alzheimer's over the follow-up than people who scored low. That's a link, not proof, but I file it under physiology, not inspiration.\n\nBridge to the Bank section: hold on to that face, because the next part is about what this costs, and the person who pays is very often not the one with the diagnosis. In my own draft of the end: the last ten years sharp, on my feet, in my own house, and the one I married spends that decade as my partner, not as my nurse.");
  }
  // ========== BANK ==========
  pres.addSection({ title: "Bank" });
  {
    const s = divider("FREE_BANK", "Bank", "PART 3  ·  BANK", K.cream, [["The Uninsured Decade"]],
      "The one catastrophic risk no policy can lower, and the premium you can still pay.", K.cream, "ud.jpg", "The Uninsured Decade");
    s.addNotes(note(22));
  }
  {
    const s = slide("FREE_BANK", "Bank");
    await ring(s, "FaHandPaper", (W - 1.5) / 2, 1.2, 1.5, K.cream, "Raised hand");
    big(s, "Raise your hand if you have a retirement plan.", { x: 0.8, y: 3.1, w: W - 1.6, h: 1.0, fontSize: 38, align: "center", valign: "middle" });
    big(s, "Keep it up if it covers ten years of memory care.", { x: 0.8, y: 4.25, w: W - 1.6, h: 1.0, fontSize: 38, align: "center", color: K.gold, valign: "middle" });
    s.addNotes(note(23));
  }
  // NEW in v2: the odds
  {
    const s = slide("BANK", "Bank", "The risk you didn't insure");
    txt(s, "LIFETIME RISK OF DEMENTIA AFTER AGE 55", { x: M + 0.2, y: 1.5, w: 6.4, h: 0.4, fontSize: 16, bold: true, charSpacing: 3, color: K.cream, valign: "middle" });
    big(s, "42%", { x: M + 0.2, y: 1.85, w: 6.2, h: 2.5, fontSize: 170, color: K.gold, valign: "middle" });
    txt(s, "close to a coin flip", { x: M + 0.2, y: 4.35, w: 6, h: 0.55, fontSize: 26, italic: true, color: "FFFFFF", valign: "middle" });
    const rx = 7.0, rw = W - M - rx;
    card(s, rx, 1.5, rw, 1.6, { name: "By sex card" });
    big(s, "35%", { x: rx + 0.3, y: 1.6, w: 1.5, h: 1.4, fontSize: 40, color: K.gold, valign: "middle" });
    txt(s, "men", { x: rx + 1.8, y: 1.6, w: 0.9, h: 1.4, fontSize: 21, color: "FFFFFF", valign: "middle" });
    big(s, "48%", { x: rx + 2.9, y: 1.6, w: 1.5, h: 1.4, fontSize: 40, color: K.gold, valign: "middle" });
    txt(s, "women", { x: rx + 4.4, y: 1.6, w: 1.2, h: 1.4, fontSize: 21, color: "FFFFFF", valign: "middle" });
    card(s, rx, 3.3, rw, 1.6, { name: "Couple card" });
    big(s, "2 in 3", { x: rx + 0.3, y: 3.4, w: 2.4, h: 1.4, fontSize: 40, color: K.gold, valign: "middle" });
    txt(s, "for a couple: the odds it reaches at least one of you", { x: rx + 2.75, y: 3.4, w: rw - 3.0, h: 1.4, fontSize: 19, color: "FFFFFF", valign: "middle" });
    card(s, M, 5.15, CW, 1.05, { name: "Fire callout", fill: "3A1420", line: K.gold, tr: 5 });
    big(s, "You insured the fire. You did not insure the likelier thing.", { x: M + 0.3, y: 5.2, w: CW - 0.6, h: 0.95, fontSize: 28, color: K.cream, align: "center", valign: "middle" });
    txt(s, "Source: Fang et al., Nature Medicine, 2025. All dementia, including mild late-life cases.", { x: M, y: 6.35, w: 9.5, h: 0.3, fontSize: 12, italic: true, color: K.muted });
    s.addNotes("New in v2, from The Uninsured Decade. Start with how likely this is, because most people carry a number in their head that is far too low.\n\nA 2025 study in Nature Medicine followed more than 15,000 people from age 55 and put the lifetime risk of dementia after 55 at 42 percent: 35 percent for men, 48 percent for women. That is close to a coin flip, and for a woman closer still.\n\nAnd in a marriage you are not underwriting one life. For a couple, the odds that it reaches at least one of you are roughly two in three.\n\nOne honest caveat, and say it every time: that 42 percent counts all dementia, including mild late-life cases that never need a facility. It is the number for 'does this touch me', not 'does this bankrupt me'.\n\nYour house probably will not burn, and you insured it anyway, because that loss would be unrecoverable. You insured the fire. You did not insure the likelier thing. So who writes that check?");
  }
  {
    const s = slide("BANK", "Bank", "Who writes the check?");
    const rows = [["The house burns", "Your insurance carrier"], ["A wreck, at fault", "Your insurance carrier"], ["You die early", "Your insurance carrier"], ["You can't work", "Your insurance carrier"], ["A stay in the hospital", "Your insurance carrier"], ["Ten years of dementia care", "You"]];
    const tx = M + 0.9, tw = CW - 1.8;
    card(s, tx, 1.5, tw, 5.1, { name: "Who pays table", fill: K.cream, tr: 4, line: K.cream });
    txt(s, "THE RISK", { x: tx + 0.4, y: 1.68, w: 5, h: 0.4, fontSize: 14, bold: true, charSpacing: 3, color: "5B5340", valign: "middle" });
    txt(s, "WHO WRITES THE CHECK", { x: tx + tw - 4.6, y: 1.68, w: 4.2, h: 0.4, fontSize: 14, bold: true, charSpacing: 3, color: "5B5340", align: "right", valign: "middle" });
    rows.forEach((r, i) => {
      const y = 2.16 + i * 0.72, last = i === rows.length - 1;
      s.addShape(pres.shapes.LINE, { x: tx + 0.4, y, w: tw - 0.8, h: 0, line: { color: "B9AE96", width: 0.75 }, objectName: "Row line" });
      txt(s, r[0], { x: tx + 0.4, y: y + 0.04, w: 6.4, h: 0.64, fontSize: last ? 26 : 23, fontFace: "Cambria", bold: last, color: last ? "8B1E2D" : "1F2430", valign: "middle" });
      txt(s, r[1], { x: tx + tw - 4.6, y: y + 0.04, w: 4.2, h: 0.64, fontSize: last ? 28 : 19, italic: !last, bold: last, color: last ? "8B1E2D" : "5B5340", align: "right", valign: "middle" });
    });
    s.addNotes(note(24));
  }
  {
    const s = slide("FREE_BANK", "Bank");
    txt(s, "WHAT MEDICARE PAYS TOWARD CUSTODIAL CARE", { x: 1, y: 1.2, w: W - 2, h: 0.5, fontSize: 20, bold: true, charSpacing: 4, color: K.cream, align: "center", valign: "middle" });
    big(s, "$0", { x: 1, y: 1.7, w: W - 2, h: 3.2, fontSize: 220, align: "center", color: K.gold, valign: "middle" });
    txt(s, "Memory care, in-home aides, assisted living: private pay until you've spent down to Medicaid.", { x: 1.5, y: 5.1, w: W - 3, h: 1.1, fontSize: 26, align: "center", color: "FFFFFF", valign: "top" });
    s.addNotes(note(25));
  }
  {
    const s = slide("BANK", "Bank", "The bill, one stage at a time");
    const st = [["Years 1–3  ·  Early", "Doctor visits, medications, home safety, legal planning", 0.375, "~$35–40K"], ["Years 4–6  ·  Middle", "Paid in-home caregiver plus adult day care", 1.75, "~$170–180K"], ["Years 7–10  ·  Late", "24/7 supervision: memory care or a nursing home", 3.15, "~$290–340K"]];
    const bx = 5.35, maxW = 4.75, cols = ["7A5560", "9A4353", K.burg];
    st.forEach((r, i) => {
      const y = 1.5 + i * 1.3;
      txt(s, [{ text: r[0], options: { bold: true, color: "FFFFFF", fontSize: 22, breakLine: true } }, { text: r[1], options: { color: K.soft } }], { x: M, y, w: 4.55, h: 1.15, fontSize: 16, valign: "middle", paraSpaceAfter: 3 });
      const bw = maxW * r[2] / 3.15;
      s.addShape(pres.shapes.RECTANGLE, { x: bx, y: y + 0.15, w: bw, h: 0.85, fill: { color: cols[i] }, line: { color: K.cream, width: 0.75 }, objectName: r[0] + " bar" });
      big(s, r[3], { x: bx + bw + 0.2, y: y + 0.15, w: 2.5, h: 0.85, fontSize: 28, color: i === 2 ? K.gold : "FFFFFF", valign: "middle" });
    });
    card(s, M, 5.45, CW, 1.15, { name: "Total", fill: "3A1420", line: K.gold, lw: 1.5, tr: 5 });
    txt(s, "Ten years, one diagnosis at 70", { x: M + 0.35, y: 5.5, w: 4.8, h: 1.05, fontSize: 22, color: K.cream, valign: "middle" });
    big(s, "about $495,000–$560,000", { x: M + 5.0, y: 5.5, w: CW - 5.35, h: 1.05, fontSize: 38, color: K.gold, valign: "middle", align: "right" });
    s.addNotes(note(26));
  }
  {
    const s = slide("BANK", "Bank", "This diagnosis doesn't take one life. It taxes two.");
    const st = [["$405,262", "average lifetime cost of care for one person with dementia", "Alzheimer's Association, 2024 dollars"], ["70%", "of that cost carried by the family, in money and unpaid care", "Alzheimer's Association"], ["63%", "higher 4-year death rate for strained spousal caregivers", "Schulz & Beach, JAMA"]];
    const cw = 3.85, gap = (CW - 3 * cw) / 2;
    for (let i = 0; i < 3; i++) {
      const x = M + i * (cw + gap);
      card(s, x, 1.55, cw, 4.9, { name: "Stat " + (i + 1) });
      big(s, st[i][0], { x: x + 0.3, y: 1.75, w: cw - 0.5, h: 1.4, fontSize: i === 0 ? 48 : 72, color: K.gold, valign: "middle" });
      txt(s, st[i][1], { x: x + 0.3, y: 3.35, w: cw - 0.6, h: 2.0, fontSize: 22, color: "FFFFFF", valign: "top" });
      txt(s, st[i][2], { x: x + 0.3, y: 5.75, w: cw - 0.6, h: 0.5, fontSize: 13, italic: true, color: K.muted, valign: "middle" });
    }
    s.addNotes(note(27));
  }
  {
    const s = slide("BANK", "Bank", "The premium you can still pay");
    const cwid = 7.75;
    card(s, M, 1.5, cwid, 5.1, { name: "Premium card" });
    big(s, "~10 hours a month", { x: M + 0.35, y: 1.6, w: cwid - 0.7, h: 0.95, fontSize: 46, color: K.gold, valign: "middle" });
    txt(s, "About 2½ hours a week on the counts and the 4M habits you heard about tonight.", { x: M + 0.35, y: 2.55, w: cwid - 0.7, h: 0.8, fontSize: 20, color: "FFFFFF", valign: "top" });
    const bw = (cwid - 0.7 - 0.25) / 2;
    const pay = [["WHAT IT MAY BUY LATER", "Better odds on the decade you just saw. No guarantee."], ["WHAT IT PAYS NOW", "Sleep, strength, energy, presence. Often inside about six weeks."]];
    pay.forEach((p, i) => {
      const x = M + 0.35 + i * (bw + 0.25);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.5, w: bw, h: 1.85, rectRadius: 0.08, fill: { color: "0A1430", transparency: 15 }, line: { color: i === 1 ? K.gold : K.line, width: i === 1 ? 1.5 : 1 }, objectName: p[0] });
      txt(s, p[0], { x: x + 0.2, y: 3.6, w: bw - 0.4, h: 0.4, fontSize: 13, bold: true, charSpacing: 2, color: i === 1 ? K.gold : K.muted, valign: "middle" });
      txt(s, p[1], { x: x + 0.2, y: 4.02, w: bw - 0.4, h: 1.25, fontSize: 19, color: "FFFFFF", valign: "top" });
    });
    txt(s, "The only policy in the folder that pays before the claim.", { x: M + 0.35, y: 5.5, w: cwid - 0.7, h: 0.95, fontSize: 22, italic: true, bold: true, color: K.goldL, valign: "middle", fontFace: "Cambria" });
    qr(s, "qr_ud.png", 9.35, 1.7, 3.0, "Run your numbers", "Free calculator by state");
    s.addNotes(note(28, "New in v2, from the book: every policy you own has one thing in common. You hope it never pays. This premium has two payouts. The first is the one we've been talking about: better odds on that decade, stated as odds and never as a promise. The second does not wait. It starts inside about six weeks, and it is paid in sleep that goes unbroken, in strength, in energy at four in the afternoon, in being present. You don't have to develop dementia to collect it and you don't have to avoid it. It is the only policy in the folder that pays before the claim."));
  }

  // ========== CLOSE ==========
  pres.addSection({ title: "Close" });
  {
    const s = slide("FREE_BODY", "Close");
    kicker(s, "BACK TO YOUR SNACK", K.yellow, 1.5);
    big(s, "Last bite. Fork down.", { x: M + 0.2, y: 2.05, w: 7.6, h: 1.05, fontSize: 52, valign: "middle" });
    big(s, "Count to 32 with me.", { x: M + 0.2, y: 3.1, w: 7.6, h: 1.05, fontSize: 52, color: K.yellow, valign: "middle" });
    txt(s, "Every bite, from tonight on, is a small vote for your body, your brain, and your bank account.", { x: M + 0.2, y: 4.55, w: 7.0, h: 1.4, fontSize: 24, color: "FFFFFF", valign: "top" });
    big(s, "32", { x: 8.0, y: 1.3, w: 4.7, h: 4.2, fontSize: 250, color: K.yellow, align: "center", valign: "middle" });
    s.addNotes(note(29));
  }
  // NEW in v3: the cohort invitation
  {
    const s = slide("MAIN", "Close", "Do it with us: the free MindSpan cohort");
    const st = [["FaClipboardCheck", "Take the MindSpan assessment", "It's free, and it's the door: it sets up your account."],
      ["FaEnvelopeOpenText", "Check your email", "The book, the 4M Logbook and the Protégé app arrive right away."],
      ["FaVideo", "Join Monday's Zoom with Dr. TJ", "A small group, moving through the four M's together."]];
    const lw = 7.2;
    for (let i = 0; i < 3; i++) {
      const y = 1.5 + i * 1.42;
      card(s, M, y, lw, 1.26, { name: "Cohort step " + (i + 1) });
      big(s, String(i + 1), { x: M + 0.25, y: y + 0.08, w: 0.6, h: 1.1, fontSize: 44, color: K.gold, valign: "middle" });
      await ring(s, st[i][0], M + 0.95, y + 0.2, 0.86, K.gold, st[i][1]);
      txt(s, st[i][1], { x: M + 2.05, y: y + 0.1, w: lw - 2.25, h: 0.5, fontSize: 22, bold: true, color: "FFFFFF", valign: "middle" });
      txt(s, st[i][2], { x: M + 2.05, y: y + 0.6, w: lw - 2.25, h: 0.6, fontSize: 17, color: K.soft, valign: "top" });
    }
    const rx = M + lw + 0.3, rw = W - M - rx;
    card(s, rx, 1.5, rw, 4.1, { name: "Monday card", fill: "1C2F6A", line: K.gold, lw: 1.5, tr: 8 });
    txt(s, "EVERY", { x: rx + 0.35, y: 1.7, w: rw - 0.7, h: 0.4, fontSize: 16, bold: true, charSpacing: 5, color: K.goldL, valign: "middle" });
    big(s, "Monday", { x: rx + 0.35, y: 1.98, w: rw - 0.7, h: 0.95, fontSize: 60, color: K.gold, valign: "middle" });
    txt(s, "7 p.m. Central", { x: rx + 0.35, y: 2.88, w: rw - 0.7, h: 0.45, fontSize: 24, bold: true, color: K.goldL, valign: "middle" });
    const pts = [["FaVideo", "Live on Zoom with Dr. TJ"], ["FaRegPlayCircle", "Recorded every week"], ["FaEnvelope", "The recording is emailed to you: watch anytime"]];
    for (let i = 0; i < 3; i++) {
      const y = 3.4 + i * 0.72;
      s.addImage({ data: await icon(pts[i][0], K.gold), x: rx + 0.38, y: y + 0.12, w: 0.36, h: 0.36, objectName: "Monday point " + (i + 1) });
      txt(s, pts[i][1], { x: rx + 0.95, y, w: rw - 1.2, h: 0.62, fontSize: 18, color: "FFFFFF", valign: "middle" });
    }
    card(s, M, 5.82, CW, 0.8, { name: "Together callout" });
    txt(s, [{ text: "Bring the person you named tonight.  ", options: { bold: true, color: K.goldL } }, { text: "In one study, people who joined a program with friends or family finished more often: 95% versus 76%." }],
      { x: M + 0.3, y: 5.82, w: CW - 0.6, h: 0.8, fontSize: 17, color: "FFFFFF", valign: "middle" });
    s.addNotes("New in v3. This is the invitation. Everything tonight works better with other people, so do it with us.\n\nThe MindSpan assessment is free, and it is also the door: taking it sets up your account, so the book, the Logbook, the Protégé app and the weekly Zooms come with it. None of that costs anything.\n\nThe cohort meets on Zoom with me every Monday. A small group of people moving through the four M's together, each accountable to the others. If you can't make it live, every session is recorded and the recording is emailed to you, so you can watch it anytime that week.\n\nAnd bring the person you named tonight. From Count Yourself Skinny: in one study of a structured program, people who joined with friends or family and got extra support finished far more often than those who joined alone, 95 percent versus 76.\n\nWe meet Mondays at 7 p.m. Central.");
  }
  {
    const s = slide("MAIN", "Close", "One thing to do before you go");
    const lw = 4.6, qd = 3.3, qx = M + (lw - qd) / 2;
    card(s, M, 1.5, lw, 5.1, { name: "Scan card", line: K.gold, lw: 1.5 });
    s.addShape(pres.shapes.RECTANGLE, { x: qx - 0.12, y: 1.72, w: qd + 0.24, h: qd + 0.24, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 1 }, objectName: "QR backing" });
    s.addImage({ path: "qr_assess.png", x: qx, y: 1.84, w: qd, h: qd, objectName: "MindSpan assessment QR" });
    txt(s, "Take the free MindSpan assessment", { x: M + 0.2, y: 5.4, w: lw - 0.4, h: 0.5, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    txt(s, "my4mlife.com/assessment", { x: M + 0.25, y: 5.95, w: lw - 0.5, h: 0.4, fontSize: 16, bold: true, color: K.goldL, align: "center", valign: "middle" });
    const rx = M + lw + 0.3, rw = W - M - rx;
    txt(s, "WHAT HAPPENS AFTER YOU SCAN", { x: rx, y: 1.5, w: rw, h: 0.4, fontSize: 15, bold: true, charSpacing: 3, color: K.muted, valign: "middle" });
    const st = [["FaClipboardCheck", "20 questions, about 7 minutes", "Your score and your top three, on screen right away"],
      ["FaEnvelopeOpenText", "Check your email", "The book, the Logbook and the Protégé app, free"],
      ["FaVideo", "You're in", "The Monday cohort Zooms and tonight's drawing"],
      ["FaPhoneAlt", "Want to talk it through?", "Ask for a free care-coordinator call. No card"]];
    for (let i = 0; i < 4; i++) {
      const y = 2.0 + i * 0.86;
      card(s, rx, y, rw, 0.76, { name: "After scan " + (i + 1) });
      await ring(s, st[i][0], rx + 0.14, y + 0.09, 0.58, K.gold, st[i][1]);
      txt(s, st[i][1], { x: rx + 0.9, y, w: 2.95, h: 0.76, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle" });
      txt(s, st[i][2], { x: rx + 3.9, y, w: rw - 4.05, h: 0.76, fontSize: 16, color: K.soft, valign: "middle" });
    }
    card(s, rx, 5.55, rw, 1.05, { name: "How this stays free", fill: "1C2F6A", line: K.gold, tr: 8 });
    txt(s, [{ text: "How this stays free.  ", options: { bold: true, color: K.goldL } }, { text: "The education is free for everyone. Prescription care, chosen by licensed physicians, is paid. We also offer a few products and a handful of private clients." }],
      { x: rx + 0.25, y: 5.55, w: rw - 0.5, h: 1.05, fontSize: 17, color: "FFFFFF", valign: "middle" });
    s.addNotes("New in v4: one ask, not several. One thing before you go: if you haven't already, take the free MindSpan assessment.\n\nHere is exactly what happens when you scan. Twenty questions, about seven minutes. Your score and your top three priorities come up on your screen right away. Then check your email: Begin with the End in Mind, the Logbook and the Protégé app are sent to you free. You're in the Monday cohort Zooms, and you're entered in tonight's drawing.\n\nTwo personal questions have a 'prefer not to say' option.\n\nHere's exactly how this works. The education is free: the assessment, the book, the Logbook, the app, the Monday Zoom. If a physician decides you need a prescription, that's paid, like any doctor visit. We also sell a few products, like the Push Patch, and I take a handful of private clients each year. That's it. Nothing tonight requires you to buy anything.\n\nFor some people the plan also includes medical tools, and those should be chosen by a licensed physician, not a website ad. That prescription care is paid. If you want to know whether any of it applies to you, ask for the free care-coordinator call: you find out exactly what you need, and nothing is charged unless it fits. [If someone asks about peptides, GLP-1s or the Push Patch, invite them to talk after the session or on the call.]\n\nIf you ask for the free call, a care coordinator calls you. We never call unless you ask.");
  }
  {
    const s = slide("FREE_TITLE", "Close");
    kicker(s, "TONIGHT'S DRAWING", K.gold, 1.0);
    big(s, "Win a signed book", { x: M + 0.2, y: 1.45, w: 6.6, h: 1.0, fontSize: 50, valign: "middle" });
    txt(s, "Everyone who completed tonight's MindSpan assessment is already entered.", { x: M + 0.2, y: 2.5, w: 6.4, h: 0.95, fontSize: 22, color: "FFFFFF", valign: "top" });
    const p = [["1st name drawn", "picks any of the three"], ["2nd name drawn", "picks from the two left"], ["3rd name drawn", "gets the last book"]];
    p.forEach((r, i) => {
      const y = 3.6 + i * 0.92;
      card(s, M + 0.2, y, 6.4, 0.78, { name: "Prize " + (i + 1) });
      txt(s, r[0], { x: M + 0.5, y, w: 2.7, h: 0.78, fontSize: 21, bold: true, color: K.gold, valign: "middle" });
      txt(s, r[1], { x: M + 3.2, y, w: 3.3, h: 0.78, fontSize: 20, color: "FFFFFF", valign: "middle" });
    });
    const bh = 2.75, bw = bh / 1.6;
    ["cys_front.png", "bwtem.png", "ud.jpg"].forEach((f, i) => book(s, f, 7.35 + i * (bw + 0.1), 2.0, bh, ["Count Yourself Skinny", "Begin with the End in Mind", "The Uninsured Decade"][i]));
    txt(s, "All three books are at the table tonight, signed. Also on Amazon.", { x: 7.4, y: 4.95, w: 5.3, h: 0.9, fontSize: 19, color: "FFFFFF", valign: "top" });
    txt(s, "Not entered yet? Scan the back of your card now.", { x: M + 0.2, y: 6.45, w: 7, h: 0.4, fontSize: 18, italic: true, color: K.goldL, valign: "middle" });
    s.addNotes(note(31, "New in v4: the books moved here from the old two-things slide. Signed copies of all three are at the table tonight, and every book is on Amazon in Kindle and paperback, and Begin with the End in Mind also in hardcover."));
  }
  {
    const s = slide("FREE_TITLE", "Close");
    s.addImage({ path: "emblem.png", x: M + 0.2, y: 1.0, w: 1.2, h: 1.2, objectName: "4M emblem" });
    big(s, "Begin with the end in mind.", { x: M + 0.2, y: 2.45, w: 8.3, h: 1.0, fontSize: 40, valign: "middle" });
    txt(s, "Don't lose your identity and your dignity while you still have a choice.", { x: M + 0.2, y: 3.5, w: 7.8, h: 1.1, fontSize: 25, italic: true, color: K.goldL, valign: "top" });
    big(s, "Questions?", { x: M + 0.2, y: 4.8, w: 6, h: 0.9, fontSize: 42, color: K.gold, valign: "middle" });
    txt(s, "Education, not medical, financial, or legal advice. Medical care through My4MLife is provided by licensed physicians.", { x: M + 0.2, y: 5.95, w: 7.8, h: 0.6, fontSize: 13, italic: true, color: K.muted, valign: "top" });
    qr(s, "qr_assess.png", 9.35, 1.4, 3.1, "Free MindSpan assessment", "my4mlife.com");
    s.addNotes(note(32));
  }
  // Sources
  {
    const s = slide("MAIN", "Close", "Sources");
    const r = ["Chewing: Iowa State University randomized lab study, 45 adults (Zhu & Hollis). Companion study in older adults showed slower eating, no change in intake.",
      "Steps: pooled analysis of 17 studies, ~227,000 adults, European Journal of Preventive Cardiology (2023).",
      "Alzheimer's begins 20+ years before symptoms: Alzheimer's Association.",
      "Up to 45% of dementia potentially preventable; 14 modifiable risk factors: The Lancet Commission on dementia prevention, intervention, and care (2024). A population figure, not an individual's expected risk reduction.",
      "Gum disease bacteria in Alzheimer's brain tissue: Dominy et al., Science Advances (2019). An association; causation is not established.",
      "Purpose in life and Alzheimer's risk: Boyle et al., Archives of General Psychiatry (2010), Rush Memory and Aging Project. Observational.",
      "Lifetime dementia risk after 55 of 42% (35% men, 48% women): Fang et al., Nature Medicine (2025). All-cause dementia, including mild late-life cases.",
      "$405,262 average lifetime cost of dementia care, 70% borne by family: Alzheimer's Association, 2026 Facts & Figures.",
      "Memory care ~$8,019/month national median: SeniorLiving.org (2026); in-home care $35/hr, nursing home $129,575/yr: CareScout/Genworth 2025.",
      "Medicare does not cover custodial long-term care: Medicare.gov.",
      "63% higher mortality among strained spousal caregivers: Schulz R & Beach S, JAMA (1999).",
      "Full references: Count Yourself Skinny, Begin with the End in Mind, and The Uninsured Decade by Dr. TJ Mundheim."];
    card(s, M, 1.45, CW, 5.25, { name: "Sources card" });
    txt(s, r.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < r.length - 1 } })), { x: M + 0.3, y: 1.55, w: CW - 0.6, h: 5.05, fontSize: 14, color: "FFFFFF", paraSpaceAfter: 4, valign: "middle" });
    s.addNotes(note(33));
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("done", OUT);
})();

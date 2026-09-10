// Patient-facing "plan of action" drafting prompt — voice, safety rules, and the
// strict JSON schema Bedrock must return. No AWS I/O here (pure string building).

// Always appended to the stored/sent plan regardless of what the model produced.
// Wording matches the legal-approved credential disclosure in the site footer
// (website/src/components/Footer.astro) verbatim — keep the two in sync.
export const DISCLAIMER =
  'My4MLife provides health education, protocol design, and AI-driven coaching. Medical care, diagnosis, and prescriptions are provided by a contracted licensed telemedicine practice. Dr. Mundheim is a Doctor of Chiropractic, NBCE-certified since 1994, and does not provide medical care through this platform.';

export const ALLOWED_ORIGINS = ['https://my4mlife.com', 'https://www.my4mlife.com'];

export const ALLOWED_PATHS = [
  '/',
  '/assessment',
  '/rx/weight-loss',
  '/rx/leaky-gut',
  '/rx/gh-peptide',
  '/rx/testosterone-ed',
  '/rx/menopause-hrt',
  '/regenerative-medicine',
  '/consult',
];

function allowlistText(): string {
  return ALLOWED_ORIGINS
    .flatMap((origin) => ALLOWED_PATHS.map((path) => (path === '/' ? origin : `${origin}${path}`)))
    .join(', ');
}

export interface DraftPromptInput {
  firstName?: string;
  coordinatorNotes?: string;
  briefJson?: unknown;
}

/** Builds the Bedrock system + user prompt for drafting a patient-facing plan of action. */
export function buildPrompt(input: DraftPromptInput): { system: string; user: string } {
  const system = `You are drafting a short, warm plan-of-action email to a patient, in the voice of Dr. TJ Mundheim.

Voice and safety rules — follow every one of these exactly:
- Write in plain, second-person language a layperson understands. No jargon.
- Dr. TJ is a Doctor of Chiropractic (NBCE-certified). NEVER refer to him as a "physician" or "doctor prescribing." Prescriptions and medical care are always performed by "our network's licensed physicians," not Dr. TJ.
- Never claim a product or protocol will "treat" or "cure" anything. Only say it "may help" or "may support."
- Never name or describe the ingredients of any compounded/Rx formula (e.g. do not mention BPC-157, L-Glutamine, Aloe, or similar). Refer to Rx items only by their product/program name. The Gut-Brain Rx is described only as a "proprietary, physician-written gut-lining formulation".
- Never invent a price or a visit type. If you mention a care lane, use these exactly and nothing else:
  - GLP-1 weight loss — async (store-and-forward) review, free visit.
  - Gut-Brain Rx — async review, free visit.
  - Tesamorelin GH peptide — async review, free visit.
  - Testosterone (men) — live audio-visual visit, $249 (includes a hormone panel).
  - Menopause & HRT (women) — live audio-visual visit, $249 (includes a panel).
  - Regenerative (RPA + Muse cells) — for an already-diagnosed cognitive or joint condition only; arranged through the care coordinator, never self-serve.
- Every link you use MUST be one of these exact URLs, nothing else: ${allowlistText()}
- Respond with STRICT JSON ONLY — no markdown fences, no commentary before or after — matching exactly this shape:
{"subject": string, "greeting": string, "summary_of_call": string, "plan_steps": [{"step": string, "why": string, "link": string}], "next_step_cta": {"label": string, "url": string}, "disclaimer": string}`;

  const user = `Patient first name: ${input.firstName ?? 'there'}

Coordinator notes from the call:
${input.coordinatorNotes ?? '(none provided)'}

Call brief (structured):
${JSON.stringify(input.briefJson ?? {}, null, 2)}

Draft the plan-of-action JSON now.`;

  return { system, user };
}

// Reusable per-lane pre-payment safety screening (plan addendum 2026-10-02).
// One entry per product lane. The landing page renders its "Quick safety check" modal
// from this config and sends { version, answers } to /api/create-checkout-session.
// A lambda-side mirror of the ids lives with the checkout/intake code; keep both in sync
// and bump SCREENING_VERSION whenever a question id or its meaning changes.
//
// Answer convention: answers[id] === true means the patient answered "Yes" to the question
// exactly as worded here.
//   - knockouts:  Yes = not eligible (no checkout).
//   - placement:  Yes = allowed; the patient is shown `ifYes` and told where to avoid.
//   - noSuitableAreaId: the question is worded positively ("Is there at least one area..."),
//     so No (false) is the knockout.

export const SCREENING_VERSION = 'pp-screen-v1';

export interface ScreeningQuestion {
  id: string;
  question: string;
}

export interface PlacementQuestion extends ScreeningQuestion {
  /** Inline note shown when the patient answers Yes. Yes is allowed, never a knockout. */
  ifYes: string;
}

export interface LaneScreening {
  /** Plain-language line shown at the top of the modal (where the product goes, etc.). */
  siteNote?: string;
  /** Any Yes means the product is not the right fit: no checkout. */
  knockouts: ScreeningQuestion[];
  /** Any Yes shows `ifYes` and is allowed. */
  placement: PlacementQuestion[];
  /** Id of the positively worded "is there a suitable area" question. No = knockout. */
  noSuitableAreaId?: string;
  /** Wording of that question. */
  suitableAreaQuestion?: string;
}

export const SCREENING: Record<string, LaneScreening> = {
  'push-patch': {
    siteNote:
      'The patch goes on clean, easy-to-reach skin with little or no hair, such as the upper arm, shoulder, upper chest, forearm, thigh or side of the abdomen.',
    knockouts: [
      { id: 'seizures', question: 'Do you have epilepsy or a history of seizures?' },
      { id: 'pacemaker', question: 'Do you have a pacemaker or any other implanted electronic device?' },
      { id: 'pregnant', question: "Are you pregnant, or could you be pregnant? (Choose No if this doesn't apply to you.)" },
    ],
    placement: [
      {
        id: 'metalImplant',
        question: 'Do you have a metal implant (plate, screws, rods or a joint replacement) anywhere you might wear the patch?',
        ifYes: 'No problem. Choose an area away from the implant.',
      },
      {
        id: 'woundOrScar',
        question: 'Do you have an open wound, recent skin graft or scar anywhere you might wear the patch?',
        ifYes: 'No problem. Choose an area away from the wound or scar.',
      },
    ],
    noSuitableAreaId: 'suitableArea',
    suitableAreaQuestion:
      'Is there at least one area of clean, easy-to-reach skin with little or no hair, away from any implant, wound or scar, where you could wear the patch?',
  },

  // Example for a future lane. NOT ACTIVE: uncomment, adapt, and mirror the ids on the lambda side.
  // 'glp1': {
  //   knockouts: [
  //     { id: 'pancreatitis', question: 'Have you ever had pancreatitis (inflammation of the pancreas)?' },
  //     // ...add further knockouts (MTC/MEN2 history, pregnancy, etc.) as the physician group specifies
  //   ],
  //   placement: [],
  // },
};

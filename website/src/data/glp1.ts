// GLP-1 direct-buy lane: single source of truth for /go/glp-1.
// Contracts: docs/plan/glp1-direct-buy-2026-11-23.md. Customer copy never names a physician.
import { SCREENING } from './screening';

export const GLP1_LANE = 'glp1';
export const GLP1_SCREENING_VERSION = 'glp1-screen-v1';
export const GLP1_PRICE_USD = 375;

export type Glp1Product = { skuId: string; name: string; short: string; generic: string };

export const GLP1_PRODUCTS: Glp1Product[] = [
  { skuId: 'glp1-sema', name: 'GLP-1 · Sema (semaglutide)', short: 'GLP-1', generic: 'Semaglutide' },
  { skuId: 'glp1-tirzep', name: 'GLP-2 · Tirzep (tirzepatide)', short: 'GLP-2', generic: 'Tirzepatide' },
  { skuId: 'glp1-reta', name: 'GLP-3 · Reta (retatrutide)', short: 'GLP-3', generic: 'Retatrutide' },
];

export type Option = { id: string; label: string };

export const GLP1_CONDITIONS: Option[] = [
  { id: 'high-blood-pressure', label: 'High blood pressure' },
  { id: 'type2-or-prediabetes', label: 'Type 2 diabetes or prediabetes' },
  { id: 'high-cholesterol', label: 'High cholesterol' },
  { id: 'sleep-apnea', label: 'Sleep apnea' },
  { id: 'heart-disease', label: 'Heart disease' },
  { id: 'fatty-liver', label: 'Fatty liver' },
  { id: 'pcos', label: 'PCOS' },
  { id: 'none', label: 'None of these' },
];

export const GLP1_SAFETY_HISTORY: Option[] = [
  { id: 'gallbladder-disease', label: 'Gallbladder disease' },
  { id: 'kidney-disease', label: 'Kidney disease' },
  { id: 'ibd', label: 'Inflammatory bowel disease (IBD)' },
  { id: 'diabetic-retinopathy', label: 'Diabetic retinopathy' },
  { id: 'depression-suicidal', label: 'Depression or suicidal thoughts' },
  { id: 'none', label: 'None of these' },
];

export const GLP1_INTERACTING_MEDS: Option[] = [
  { id: 'insulin', label: 'Insulin' },
  { id: 'sulfonylurea', label: 'A sulfonylurea (for example glipizide or glimepiride)' },
  { id: 'oral-birth-control', label: 'Oral birth control' },
  { id: 'none', label: 'None of these' },
];

export interface Glp1Health {
  dob: string;
  sex: 'female' | 'male';
  heightFt: number;
  heightIn: number;
  weightLb: number;
  goalWeightLb?: number;
  conditions: string[];
  safetyHistory: string[];
  priorGlp1: 'never' | 'current' | 'past';
  priorGlp1Drug?: string;
  priorGlp1Dose?: string;
  interactingMeds: string[];
  otherMeds: string;
  allergies: string;
}

/** Ids of knockout questions answered Yes (Yes = not eligible). */
export function failedKnockouts(answers: Record<string, boolean>): string[] {
  return SCREENING[GLP1_LANE].knockouts.map((k) => k.id).filter((id) => answers[id] === true);
}

export interface Glp1BodyInput {
  skuId: string;
  autoShip: boolean;
  answers: Record<string, boolean>;
  health: Glp1Health;
  typedName: string;
  contact: { firstName: string; lastName: string; email: string; phone: string };
  testToken?: string;
}

/** The exact POST body for /api/push-patch-pre-intake (lane glp1). */
export function buildGlp1Body(i: Glp1BodyInput) {
  return {
    lane: GLP1_LANE,
    skuId: i.skuId,
    autoShip: i.autoShip,
    screening: { version: GLP1_SCREENING_VERSION, answers: i.answers },
    health: i.health,
    signature: { typedName: i.typedName },
    contact: i.contact,
    ...(i.testToken ? { t: i.testToken } : {}),
  } as {
    lane: string; skuId: string; autoShip: boolean;
    screening: { version: string; answers: Record<string, boolean> };
    health: Glp1Health; signature: { typedName: string };
    contact: Glp1BodyInput['contact']; t?: string;
  };
}

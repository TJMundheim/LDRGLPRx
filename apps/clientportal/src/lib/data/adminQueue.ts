/**
 * Admin / clinician queue data layer — stub backed by localStorage.
 *
 * Key: '4m:admin:queue'
 * On first call (no stored data) a set of seed items is written so the view
 * is populated in dev. patientLabel is always de-identified (no PII).
 */

export type QueueItemKind =
  | 'intake-review'
  | 'clinician-escalation'
  | 'rx-approval'
  | 'protocol-check'
  | 'lab-result-review'
  | 'outcome-flag';

export type QueueUrgency = 'routine' | 'soon' | 'urgent';
export type QueueStatus = 'pending' | 'in_progress' | 'resolved' | 'deferred';

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  patientId: string;
  patientLabel: string;
  summary: string;
  draftedAction?: string;
  createdAt: number;
  urgency: QueueUrgency;
  status: QueueStatus;
}

/** Exported seed items — used as fallback when the API is unavailable. */
export const SEED_QUEUE: QueueItem[] = [
  {
    id: 'q-001',
    kind: 'intake-review',
    patientId: 'pt-a7k2',
    patientLabel: 'Patient #A7K2 · M1W3',
    summary: 'New intake completed. Sleep and recovery scores below threshold. Requires protocol assignment review before Month 2 transition.',
    draftedAction: 'Assign modified recovery protocol R-2B; defer HRV threshold increase by 1 week.',
    createdAt: Date.now() - 3_600_000,
    urgency: 'soon',
    status: 'pending',
  },
  {
    id: 'q-002',
    kind: 'rx-approval',
    patientId: 'pt-b3m9',
    patientLabel: 'Patient #B3M9 · M2W1',
    summary: 'Magnesium glycinate dose escalation request from 200 mg to 400 mg/night. No contraindications flagged in intake. Awaiting clinician sign-off.',
    draftedAction: 'Approve escalation; document in supplement log.',
    createdAt: Date.now() - 7_200_000,
    urgency: 'routine',
    status: 'pending',
  },
  {
    id: 'q-003',
    kind: 'clinician-escalation',
    patientId: 'pt-c1p5',
    patientLabel: 'Patient #C1P5 · M1W2',
    summary: 'Patient reported chest discomfort during cold exposure session (Day 11). Symptom resolved within 2 minutes. Flagged by automated outcome monitor.',
    createdAt: Date.now() - 1_800_000,
    urgency: 'urgent',
    status: 'in_progress',
  },
  {
    id: 'q-004',
    kind: 'lab-result-review',
    patientId: 'pt-d8q4',
    patientLabel: 'Patient #D8Q4 · M1W4',
    summary: 'Week 4 panel returned. Testosterone slightly below baseline (−12%). IGF-1 within range. CRP elevated — may indicate training load mismatch.',
    draftedAction: 'Flag CRP elevation; recommend 5-day deload before Month 2 intensification.',
    createdAt: Date.now() - 86_400_000,
    urgency: 'soon',
    status: 'pending',
  },
  {
    id: 'q-005',
    kind: 'outcome-flag',
    patientId: 'pt-e6r1',
    patientLabel: 'Patient #E6R1 · M2W3',
    summary: 'Subjective outcome score dropped 2 points (7→5) over past 7 days with no logged protocol deviations. Possible adherence gap or unreported stressor.',
    draftedAction: 'Schedule check-in call; review week log for unreported deviations.',
    createdAt: Date.now() - 43_200_000,
    urgency: 'routine',
    status: 'pending',
  },
];

/**
 * Returns all non-resolved seed items.
 * Used as an offline/dev fallback when the admin API is unavailable.
 */
export function getPendingQueue(): QueueItem[] {
  return SEED_QUEUE.filter((i) => i.status !== 'resolved');
}

/**
 * Mark a queue item with the given status (no-op stub — real impl will call API).
 */
export function resolveQueueItem(_id: string, _status: QueueStatus): void {
  // Stub: backend mutation will be wired here.
}

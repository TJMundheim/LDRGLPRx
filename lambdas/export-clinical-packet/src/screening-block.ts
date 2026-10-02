// Human-readable "Pre-payment safety screen" for screeningAnswers.pushPatch
// (written by push-patch-intake). Labels mirror that lambda's screening.ts.

const DENIED_LABELS: Record<string, string> = {
  seizures: 'epilepsy/seizures',
  pacemaker: 'pacemaker or implanted electronic device',
  pregnant: 'pregnancy',
  noSuitableArea: 'no suitable area',
};

interface PushPatchScreen {
  version?: string; at?: string; denied?: string[];
  placement?: { metalImplant?: boolean; woundOrScar?: boolean };
}

/** Plain-text lines (caller escapes). Empty array when there is no pushPatch screening. */
export function screeningLines(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const s = raw as PushPatchScreen;
  if (!s.version || s.version === 'none') return ['No pre-payment screening (order placed before the safety check existed).'];
  const denied = (s.denied ?? []).map((d) => DENIED_LABELS[d] ?? d).join('; ') || 'none';
  const lines = [`Patient denied: ${denied} (version ${s.version}, ${(s.at ?? '').slice(0, 10)})`];
  if (s.placement?.metalImplant) lines.push('Metal implant: yes, told to choose another area');
  if (s.placement?.woundOrScar) lines.push('Wound or scar: yes, told to choose another area');
  return lines;
}

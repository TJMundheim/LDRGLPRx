/**
 * Thin wrapper over the Web Speech API (SpeechRecognition).
 *
 * Used by VoiceLog.svelte so the component never touches vendor globals and
 * so the whole thing is unit-testable with a mocked global.
 *
 * Contract:
 *   isSupported()                       -> boolean
 *   start(onInterim, onFinal, onError)  -> begins a single utterance
 *   stop()                              -> stops the active recogniser
 *
 * lang 'en-US', interimResults true, continuous false (one utterance per tap).
 */

type SpeechErrorCode = 'unsupported' | 'not-allowed' | 'no-speech' | 'aborted' | 'network' | 'error';

export interface SpeechError {
  code: SpeechErrorCode;
  message: string;
}

type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

function ctor(): (new () => Recognizer) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognizer) | null;
}

export function isSupported(): boolean {
  return ctor() !== null;
}

let active: Recognizer | null = null;

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the mic, or type it instead.',
  'service-not-allowed': 'Microphone access is blocked. Allow the mic, or type it instead.',
  'no-speech': "Didn't catch that. Tap the mic and try again.",
  'aborted': 'Listening stopped.',
  'network': 'Network hiccup during voice capture. Try again.',
};

function normalise(code: string | undefined): SpeechError {
  const c = code ?? 'error';
  const known: SpeechErrorCode[] = ['not-allowed', 'no-speech', 'aborted', 'network'];
  return {
    code: (known as string[]).includes(c) ? (c as SpeechErrorCode) : 'error',
    message: MESSAGES[c] ?? 'Voice capture failed. Type it instead.',
  };
}

/**
 * Start listening. `onFinal` fires once with the full final transcript;
 * `onInterim` may fire many times before it.
 */
export function start(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: SpeechError) => void,
): void {
  const C = ctor();
  if (!C) {
    onError({ code: 'unsupported', message: 'Voice input is not available in this browser.' });
    return;
  }
  stop();

  let rec: Recognizer;
  try {
    rec = new C();
  } catch {
    onError({ code: 'error', message: 'Voice input could not start.' });
    return;
  }

  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  try { rec.maxAlternatives = 1; } catch { /* some impls are read-only */ }

  let finalText = '';
  let ended = false;

  rec.onresult = (ev: any) => {
    let interim = '';
    const results = ev?.results ?? [];
    const from = typeof ev?.resultIndex === 'number' ? ev.resultIndex : 0;
    for (let i = from; i < results.length; i++) {
      const r = results[i];
      const txt = r?.[0]?.transcript ?? '';
      if (r?.isFinal) finalText += txt;
      else interim += txt;
    }
    if (interim) onInterim(interim.trim());
  };

  rec.onerror = (ev: any) => {
    ended = true;
    active = null;
    onError(normalise(ev?.error));
  };

  rec.onend = () => {
    if (ended) return;
    ended = true;
    active = null;
    onFinal(finalText.trim());
  };

  active = rec;
  try {
    rec.start();
  } catch {
    active = null;
    onError({ code: 'error', message: 'Voice input could not start.' });
  }
}

export function stop(): void {
  const rec = active;
  if (!rec) return;
  active = null;
  try { rec.stop(); } catch { /* already stopped */ }
}

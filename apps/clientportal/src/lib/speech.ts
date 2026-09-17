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
 *   markUnavailable()/isMarkedUnavailable() -> per-session "voice is dead here"
 *
 * lang 'en-US', interimResults true, continuous false (one utterance per tap).
 *
 * iOS NOTE (the 2026-09-17 freeze): in a standalone home-screen PWA
 * `webkitSpeechRecognition` exists and `start()` resolves without throwing, but
 * the recogniser never fires onstart / onaudiostart / onresult / onend. The UI
 * used to sit in `listening = true` forever with no way out. Every start() is
 * now guarded by a hard 6 s watchdog that aborts the recogniser and reports
 * `code: 'unavailable'` so the caller can fall back to typing.
 */

type SpeechErrorCode =
  | 'unsupported'
  | 'unavailable'
  | 'not-allowed'
  | 'no-speech'
  | 'aborted'
  | 'network'
  | 'error';

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
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

/** How long we wait for ANY sign of life from the recogniser before giving up. */
export const WATCHDOG_MS = 6000;

const UNAVAILABLE_KEY = 'my4m:voiceUnavailable';

function ctor(): (new () => Recognizer) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognizer) | null;
}

/**
 * Voice is "supported" when a recogniser constructor exists AND the browser
 * exposes getUserMedia (no mic plumbing at all → no point showing the button).
 *
 * On iOS standalone (`navigator.standalone === true`) both are present but the
 * recogniser is frequently inert — we deliberately keep the mic visible and let
 * the watchdog decide, rather than guessing from the user agent.
 */
export function isSupported(): boolean {
  if (ctor() === null) return false;
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return false;
  return !isMarkedUnavailable();
}

/** True once this session has proven voice doesn't work on this device. */
export function isMarkedUnavailable(): boolean {
  try {
    return sessionStorage.getItem(UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnavailable(): void {
  try {
    sessionStorage.setItem(UNAVAILABLE_KEY, '1');
  } catch {
    /* private mode — the in-page state still hides the mic for this view */
  }
}

let active: Recognizer | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone blocked — allow it in Settings, or type below.',
  'service-not-allowed': 'Microphone blocked — allow it in Settings, or type below.',
  'audio-capture': 'Microphone blocked — allow it in Settings, or type below.',
  'unavailable': "Voice isn't available here — type your log instead.",
  'no-speech': "Didn't catch that. Tap the mic and try again.",
  'aborted': 'Listening stopped.',
  'network': 'Network hiccup during voice capture. Try again.',
};

/** Error codes that mean "voice is dead on this device" — hide the mic. */
const FATAL = new Set(['unavailable', 'not-allowed', 'service-not-allowed', 'audio-capture']);

function normalise(code: string | undefined): SpeechError {
  const c = code ?? 'error';
  const known: SpeechErrorCode[] = ['not-allowed', 'no-speech', 'aborted', 'network', 'unavailable'];
  const mapped = c === 'service-not-allowed' || c === 'audio-capture' ? 'not-allowed' : c;
  return {
    code: (known as string[]).includes(mapped) ? (mapped as SpeechErrorCode) : 'error',
    message: MESSAGES[c] ?? 'Voice capture failed. Type it instead.',
  };
}

function clearWatchdog(): void {
  if (watchdog !== null) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

function kill(rec: Recognizer | null): void {
  if (!rec) return;
  try {
    if (typeof rec.abort === 'function') rec.abort();
    else rec.stop();
  } catch {
    /* already dead */
  }
}

/**
 * Start listening. `onFinal` fires once with the full final transcript;
 * `onInterim` may fire many times before it. `onError` is terminal — after it
 * fires the caller can assume listening has stopped.
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
  let done = false;

  const finish = (fn: () => void): void => {
    if (done) return;
    done = true;
    clearWatchdog();
    if (active === rec) active = null;
    fn();
  };

  /** Any sign of life cancels the watchdog. */
  const alive = (): void => { clearWatchdog(); };

  rec.onstart = alive;
  rec.onaudiostart = alive;

  rec.onresult = (ev: any) => {
    alive();
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
    const raw = ev?.error;
    if (FATAL.has(String(raw))) markUnavailable();
    finish(() => onError(normalise(raw)));
  };

  // onend ALWAYS resets the caller, even when it fires with no result at all.
  rec.onend = () => {
    finish(() => onFinal(finalText.trim()));
  };

  active = rec;
  clearWatchdog();
  watchdog = setTimeout(() => {
    watchdog = null;
    kill(rec);
    markUnavailable();
    finish(() => onError({ code: 'unavailable', message: MESSAGES['unavailable'] }));
  }, WATCHDOG_MS);

  // Deliberately NO getUserMedia probe here: asking for the stream first
  // changes iOS's recogniser behaviour. Just start and let the watchdog guard.
  try {
    rec.start();
  } catch {
    kill(rec);
    finish(() => onError({ code: 'error', message: 'Voice input could not start.' }));
  }
}

export function stop(): void {
  clearWatchdog();
  const rec = active;
  if (!rec) return;
  active = null;
  try { rec.stop(); } catch { /* already stopped */ }
}

/** Hard cancel — used by the Cancel button so the UI never waits on onend. */
export function abort(): void {
  clearWatchdog();
  const rec = active;
  if (!rec) return;
  active = null;
  kill(rec);
}

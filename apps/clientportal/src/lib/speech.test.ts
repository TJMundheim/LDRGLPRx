import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as speech from './speech.js';

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  started = false;
  stopped = false;
  aborted = false;
  onstart: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { FakeRecognition.last = this; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}

function result(items: Array<{ transcript: string; isFinal: boolean }>) {
  const results: any = items.map(i => Object.assign([{ transcript: i.transcript }], { isFinal: i.isFinal }));
  results.length = items.length;
  return { resultIndex: 0, results };
}

beforeEach(() => {
  FakeRecognition.last = null;
  (window as any).SpeechRecognition = FakeRecognition;
  delete (window as any).webkitSpeechRecognition;
  // isSupported() also requires getUserMedia to exist.
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() },
    configurable: true,
  });
  try { sessionStorage.clear(); } catch { /* private mode */ }
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
  try { sessionStorage.clear(); } catch { /* private mode */ }
});

describe('isSupported', () => {
  it('is true when SpeechRecognition exists', () => {
    expect(speech.isSupported()).toBe(true);
  });

  it('is true via the webkit prefix', () => {
    delete (window as any).SpeechRecognition;
    (window as any).webkitSpeechRecognition = FakeRecognition;
    expect(speech.isSupported()).toBe(true);
  });

  it('is false when neither global exists', () => {
    delete (window as any).SpeechRecognition;
    expect(speech.isSupported()).toBe(false);
  });

  it('is false when getUserMedia is missing', () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(speech.isSupported()).toBe(false);
  });

  it('is false once this session has been marked unavailable', () => {
    speech.markUnavailable();
    expect(speech.isMarkedUnavailable()).toBe(true);
    expect(speech.isSupported()).toBe(false);
  });
});

describe('start', () => {
  it('configures the recogniser (en-US, interim, single utterance)', () => {
    speech.start(vi.fn(), vi.fn(), vi.fn());
    const r = FakeRecognition.last!;
    expect(r.lang).toBe('en-US');
    expect(r.interimResults).toBe(true);
    expect(r.continuous).toBe(false);
    expect(r.started).toBe(true);
  });

  it('streams interim text then reports the final transcript on end', () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    speech.start(onInterim, onFinal, vi.fn());
    const r = FakeRecognition.last!;

    r.onresult!(result([{ transcript: 'fasted walk', isFinal: false }]));
    expect(onInterim).toHaveBeenCalledWith('fasted walk');
    expect(onFinal).not.toHaveBeenCalled();

    r.onresult!(result([{ transcript: 'fasted walk 30 minutes', isFinal: true }]));
    r.onend!();
    expect(onFinal).toHaveBeenCalledWith('fasted walk 30 minutes');
  });

  it('reports a typed error and does not then fire onFinal', () => {
    const onFinal = vi.fn();
    const onError = vi.fn();
    speech.start(vi.fn(), onFinal, onError);
    const r = FakeRecognition.last!;
    r.onerror!({ error: 'not-allowed' });
    r.onend!();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'not-allowed', message: expect.stringContaining('Microphone') }),
    );
    expect(onFinal).not.toHaveBeenCalled();
  });

  it('aborts and reports "unavailable" when nothing fires within 6 s', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const onFinal = vi.fn();
    speech.start(vi.fn(), onFinal, onError);
    const r = FakeRecognition.last!;

    vi.advanceTimersByTime(speech.WATCHDOG_MS - 1);
    expect(onError).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(r.aborted).toBe(true);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'unavailable' }));
    expect(onFinal).not.toHaveBeenCalled();
    expect(speech.isMarkedUnavailable()).toBe(true);
  });

  it('does not fire the watchdog once the recogniser shows any sign of life', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    speech.start(vi.fn(), vi.fn(), onError);
    const r = FakeRecognition.last!;
    r.onstart!();
    vi.advanceTimersByTime(speech.WATCHDOG_MS * 2);
    expect(onError).not.toHaveBeenCalled();
    expect(r.aborted).toBe(false);
  });

  it('resets via onFinal when onend fires with no result at all', () => {
    const onFinal = vi.fn();
    speech.start(vi.fn(), onFinal, vi.fn());
    FakeRecognition.last!.onend!();
    expect(onFinal).toHaveBeenCalledWith('');
  });

  it('marks voice unavailable for the session on a blocked microphone', () => {
    const onError = vi.fn();
    speech.start(vi.fn(), vi.fn(), onError);
    FakeRecognition.last!.onerror!({ error: 'audio-capture' });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'not-allowed', message: expect.stringContaining('Microphone blocked') }),
    );
    expect(speech.isMarkedUnavailable()).toBe(true);
  });

  it('errors with code "unsupported" when no API is present', () => {
    delete (window as any).SpeechRecognition;
    const onError = vi.fn();
    speech.start(vi.fn(), vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'unsupported' }));
  });
});

describe('stop', () => {
  it('stops the active recogniser and is a no-op afterwards', () => {
    speech.start(vi.fn(), vi.fn(), vi.fn());
    const r = FakeRecognition.last!;
    speech.stop();
    expect(r.stopped).toBe(true);
    expect(() => speech.stop()).not.toThrow();
  });

  it('abort() hard-cancels the active recogniser', () => {
    speech.start(vi.fn(), vi.fn(), vi.fn());
    const r = FakeRecognition.last!;
    speech.abort();
    expect(r.aborted).toBe(true);
    expect(() => speech.abort()).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { isTalkSource, buildEventBlock } from './eventBlock';

describe('isTalkSource', () => {
  it('matches talk- tags case-insensitively and nothing else', () => {
    expect(isTalkSource('talk-rotary-dec')).toBe(true);
    expect(isTalkSource('Talk-Rotary-Dec')).toBe(true);
    expect(isTalkSource('uninsured-decade')).toBe(false);
    expect(isTalkSource('assessment')).toBe(false);
    expect(isTalkSource(undefined)).toBe(false);
    expect(isTalkSource('talk')).toBe(true);
    expect(isTalkSource('TALK')).toBe(true);
    expect(isTalkSource('talking')).toBe(false);
    expect(isTalkSource('talks-x')).toBe(false);
  });
});

describe('buildEventBlock', () => {
  it('returns empty string for non-event sources', () => {
    expect(buildEventBlock('assessment', '7:00 PM CT')).toBe('');
    expect(buildEventBlock(undefined, '7:00 PM CT')).toBe('');
  });
  it('includes drawing, Zoom time, recording and consult link with the tag', () => {
    const h = buildEventBlock('Talk-Rotary-Dec', '7:00 PM CT');
    expect(h).toContain("You're entered in tonight's signed-book drawing. Winners are drawn at the end of the talk.");
    expect(h).toContain('Join us Mondays at 7:00 PM CT on Zoom with Dr. TJ. Every session is recorded and the recording is emailed to you.');
    expect(h.replace(/<[^>]+>/g, '')).toContain('Want to talk it through? Reply to this email or book a free 15-minute call with a care coordinator. We never call unless you ask.');
    expect(h).toContain('https://www.my4mlife.com/consult?src=talk-rotary-dec');
  });
  it.each([undefined, '', 'TBD', ' tbd '])('omits the time phrase when ZOOM_TIME is %j', (z) => {
    const h = buildEventBlock('talk-rotary-dec', z as any);
    expect(h).toContain('Join us Monday evenings on Zoom with Dr. TJ.');
    expect(h).not.toContain('TBD');
    expect(h).not.toContain('Mondays at');
  });
  it('escapes the time value', () => {
    expect(buildEventBlock('talk-x', '<b>7</b>')).not.toContain('<b>7</b>');
  });
});

describe('infra/deploy.sh ZOOM_TIME guard', () => {
  const script = resolve(__dirname, '../infra/deploy.sh');
  it('is valid bash', () => {
    execFileSync('bash', ['-n', script]);
  });
  it.each(['TBD', 'tbd'])('refuses to deploy when ZOOM_TIME is %j (before any aws/pnpm call)', (z) => {
    const env: Record<string, string> = { PATH: '/usr/bin:/bin' };
    if (z !== undefined) env.ZOOM_TIME = z;
    const r = spawnSync('bash', [script], { env, encoding: 'utf8' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('ZOOM_TIME');
    expect(r.stdout).not.toContain('Installing dependencies');
  });
  it('defaults ZOOM_TIME to 7 p.m. Central when unset or empty', () => {
    expect(readFileSync(script, 'utf8')).toContain('ZOOM_TIME="${ZOOM_TIME:-7 p.m. Central}"');
  });
  it('refuses values that would break the Lambda env shorthand', () => {
    const r = spawnSync('bash', [script], { env: { PATH: '/usr/bin:/bin', ZOOM_TIME: '7pm,FOO=bar' }, encoding: 'utf8' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('ZOOM_TIME');
  });
});

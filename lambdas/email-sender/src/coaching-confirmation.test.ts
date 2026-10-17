import { describe, it, expect } from 'vitest';
import { composeCoachingConfirmation as compose } from './coaching-confirmation';

const full = { firstName: 'Sam', whoFor: 'my wife Ann', goals: ['Energy', 'Sleep', 'Focus and memory'], homeSpaces: ['Sauna', 'Cold plunge'], start: 'Next month' };

describe('composeCoachingConfirmation', () => {
  it('has the fixed subject, greeting, intro, sign-off and footer', () => {
    const r = compose(full);
    expect(r.subject).toBe("Your application for The Captain's Table");
    for (const s of ['Hi Sam,', "Thank you for applying for a seat at The Captain's Table. I read every application myself.", 'Dr. TJ', "Don't lose your identity and your dignity while you still have a choice."]) {
      expect(r.text).toContain(s);
      expect(r.html).toContain(s);
    }
    expect(r.html).toMatch(/<em[^>]*>Don't lose your identity/);
  });

  it('includes every sentence when all fields are present', () => {
    const t = compose(full).text;
    expect(t).toContain("You told me you're doing this for my wife Ann. Keep that face in mind. That's where we'll start.");
    expect(t).toContain('You said energy, sleep and focus and memory matter most to you right now. Those are exactly what the first four days in your home are built to change.');
    expect(t).toContain("And you have sauna and cold plunge at home. We'll put them to work.");
    expect(t).toContain("I'll reach out personally within two business days to set up a private call. You mentioned starting next month, so we'll talk dates on that call.");
  });

  it('omits whoFor, goals and home sentences when blank or missing', () => {
    const t = compose({ firstName: 'Sam', whoFor: '  ', goals: [], start: 'Next month' }).text;
    expect(t).not.toContain('You told me');
    expect(t).not.toContain('You said');
    expect(t).not.toContain('at home');
  });

  it('joins 1, 2 and 3 goals correctly and caps at 3', () => {
    expect(compose({ ...full, goals: ['Weight'] }).text).toContain('You said weight matter');
    expect(compose({ ...full, goals: ['Weight', 'Gut'] }).text).toContain('You said weight and gut matter');
    expect(compose({ ...full, goals: ['Energy', 'Sleep', 'Gut', 'Strength', 'Hormones'] }).text).toContain('You said energy, sleep and gut matter');
    expect(compose({ ...full, goals: ['Energy', 'Sleep', 'Gut', 'Strength'] }).text).not.toContain('strength');
  });

  it('accepts comma-separated strings for goals and homeSpaces', () => {
    const t = compose({ ...full, goals: 'Energy, Sleep', homeSpaces: 'Home gym, Sauna, Garden' }).text;
    expect(t).toContain('You said energy and sleep matter');
    expect(t).toContain("And you have home gym, sauna and garden at home. We'll put them to work.");
  });

  it('uses "it" for exactly one space and "them" for more', () => {
    expect(compose({ ...full, homeSpaces: ['Sauna'] }).text).toContain("And you have sauna at home. We'll put it to work.");
    expect(compose({ ...full, homeSpaces: ['Sauna', 'Garden'] }).text).toContain("We'll put them to work.");
  });

  it('excludes "None of these yet" from home spaces', () => {
    expect(compose({ ...full, homeSpaces: ['None of these yet'] }).text).not.toContain('at home');
    const t = compose({ ...full, homeSpaces: ['None of these yet', 'Sauna'] }).text;
    expect(t).toContain("And you have sauna at home. We'll put it to work.");
    expect(t.toLowerCase()).not.toContain('none of these');
  });

  it.each([
    ['Within 3 months', "You mentioned starting within the next three months, so we'll talk dates on that call."],
    ['Just exploring', "I'll reach out personally within two business days. No pressure on timing. We'll start with a conversation."],
    ['Something else', "I'll reach out personally within two business days. No pressure on timing. We'll start with a conversation."],
    [undefined, "No pressure on timing."],
  ])('start %s', (start, line) => {
    const t = compose({ ...full, start: start as string | undefined }).text;
    expect(t).toContain(line);
    expect(t).not.toContain('You mentioned starting next month');
  });

  it('HTML-escapes every field value in html but not in text', () => {
    const x = '<script>alert(1)</script>';
    const r = compose({ firstName: x, whoFor: x, goals: [x], homeSpaces: [x], start: x });
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(r.text).toContain('<script>alert(1)</script>');
  });
});

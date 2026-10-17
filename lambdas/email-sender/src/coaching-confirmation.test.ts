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
    expect(t).toContain("You told me you're doing this for your wife Ann. Keep that face in mind. That's where we'll start.");
    expect(t).toContain('You said energy, sleep and mental sharpness matter most to you right now. Those are exactly what the first four days in your home are built to change.');
    expect(t).toContain("And you already have a sauna and a cold plunge. We'll put them to work.");
    expect(t).toContain("I'll reach out personally within two business days to set up a private call. You mentioned starting next month, so we'll talk dates on that call.");
  });

  it('omits whoFor, goals and home sentences when blank or missing', () => {
    const t = compose({ firstName: 'Sam', whoFor: '  ', goals: [], start: 'Next month' }).text;
    expect(t).not.toContain('You told me');
    expect(t).not.toContain('You said');
    expect(t).not.toContain('already have');
  });

  it('joins 1, 2 and 3 goals correctly and caps at 3', () => {
    expect(compose({ ...full, goals: ['Weight'] }).text).toContain('You said weight matters most to you right now. That is exactly what');
    expect(compose({ ...full, goals: ['Weight', 'Gut'] }).text).toContain('You said weight and gut health matter');
    expect(compose({ ...full, goals: ['Energy', 'Sleep', 'Gut', 'Strength', 'Hormones'] }).text).toContain('You said energy, sleep and gut health matter');
    expect(compose({ ...full, goals: ['Energy', 'Sleep', 'Gut', 'Strength'] }).text).not.toContain('strength');
  });

  it('accepts comma-separated strings for goals and homeSpaces', () => {
    const t = compose({ ...full, goals: 'Energy, Sleep', homeSpaces: 'Home gym, Sauna, Garden' }).text;
    expect(t).toContain('You said energy and sleep matter');
    expect(t).toContain("And you already have a home gym, a sauna and a garden. We'll put them to work.");
  });

  it('uses "it" for exactly one space and "them" for more', () => {
    expect(compose({ ...full, homeSpaces: ['Sauna'] }).text).toContain("And you already have a sauna. We'll put it to work.");
    expect(compose({ ...full, homeSpaces: ['Sauna', 'Garden'] }).text).toContain("We'll put them to work.");
  });

  it('excludes "None of these yet" from home spaces', () => {
    expect(compose({ ...full, homeSpaces: ['None of these yet'] }).text).not.toContain('already have');
    const t = compose({ ...full, homeSpaces: ['None of these yet', 'Sauna'] }).text;
    expect(t).toContain("And you already have a sauna. We'll put it to work.");
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

  it.each([
    ['my daughter, Emily', 'your daughter, Emily'],
    ['My wife', 'your wife'],
    ['Emily', 'Emily'],
    ['myself', 'yourself'],
    ['mine and me', 'yours and you'],
    ['my mymom', 'your mymom'],
  ])('swaps whoFor pronouns: %s', (inp, out) => {
    expect(compose({ ...full, whoFor: inp }).text).toContain(`You told me you're doing this for ${out}.`);
  });

  it.each([
    [['Energy'], 'energy'], [['Weight'], 'weight'], [['Sleep'], 'sleep'], [['Focus and memory'], 'mental sharpness'],
    [['Strength'], 'strength'], [['Hormones'], 'hormone balance'], [['Gut'], 'gut health'], [['Daily habits'], 'daily habits'],
    [['Mystery Goal'], 'mystery goal'],
  ])('maps goal %j to %s', (goals, phrase) => {
    expect(compose({ ...full, goals }).text).toContain(`You said ${phrase} ${goals.length === 1 ? 'matters' : 'matter'} most`);
  });

  it.each([
    ['Home gym', 'a home gym'], ['Sauna', 'a sauna'], ['Cold plunge', 'a cold plunge'], ['Swimming pool', 'a pool'],
    ['Walking trails or outdoor space', 'outdoor space to walk'], ['Garden', 'a garden'], ['Red-light therapy', 'red-light therapy'],
    ['Standing desk or home office', 'a home office'], ['Mystery Space', 'mystery space'],
  ])('maps home space %s to %s', (space, phrase) => {
    expect(compose({ ...full, homeSpaces: [space] }).text).toContain(`And you already have ${phrase}. We'll put it to work.`);
  });

  it('transforms before escaping', () => {
    const r = compose({ ...full, whoFor: 'my <b>', homeSpaces: ['<i>'] });
    expect(r.html).toContain('your &lt;b&gt;');
    expect(r.html).toContain('&lt;i&gt;. We');
  });
});

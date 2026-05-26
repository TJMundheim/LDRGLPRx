export type ReminderKind = 't24h' | 't1h' | 'starting';

export interface ReminderContext {
  kind: ReminderKind;
  firstName: string;
  title: string;
  startsAt: string; // ISO
  joinUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function composeReminder(ctx: ReminderContext): RenderedEmail {
  const { kind, firstName, title, joinUrl } = ctx;

  const joinButton = `<p style="margin:24px 0"><a href="${joinUrl}" style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Join Zoom</a></p>`;

  if (kind === 't24h') {
    return {
      subject: `Tomorrow at 7 PM ET — ${title}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><p>Hi ${firstName},</p><p>Just a reminder — your <strong>My4MLife Protégé Weekly Zoom</strong> is <strong>tomorrow at 7:00 PM Eastern</strong>.</p>${joinButton}<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife Team</p></div>`,
      text: `Hi ${firstName},\n\nReminder: ${title} is tomorrow at 7:00 PM Eastern.\n\nJoin here: ${joinUrl}\n\n— The My4MLife Team`,
    };
  }
  if (kind === 't1h') {
    return {
      subject: `Starting in 1 hour — ${title}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><p>Hi ${firstName},</p><p>Your <strong>My4MLife Protégé Weekly Zoom</strong> starts in <strong>1 hour</strong>. Get ready!</p>${joinButton}<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife Team</p></div>`,
      text: `Hi ${firstName},\n\n${title} starts in 1 hour.\n\nJoin here: ${joinUrl}\n\n— The My4MLife Team`,
    };
  }
  // kind === 'starting'
  return {
    subject: `Now — Join ${title}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><p>Hi ${firstName},</p><p>Your <strong>My4MLife Protégé Weekly Zoom is starting now.</strong> Click below to join.</p>${joinButton}<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife Team</p></div>`,
    text: `Hi ${firstName},\n\n${title} is starting now.\n\nJoin here: ${joinUrl}\n\n— The My4MLife Team`,
  };
}

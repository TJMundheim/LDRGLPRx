import { createMeeting, getMeetingAttendance, listMeetings } from './zoom-client.js';

type Action = 'createMeeting' | 'getMeetingAttendance' | 'listMeetings';
interface Event { action: Action; input: Record<string, unknown>; }
interface Result { ok: boolean; data?: unknown; error?: string; }

export const handler = async (event: Event): Promise<Result> => {
  const { action, input } = event;
  try {
    let data: unknown;
    if (action === 'createMeeting') {
      data = await createMeeting(input as Parameters<typeof createMeeting>[0]);
    } else if (action === 'getMeetingAttendance') {
      data = await getMeetingAttendance(input as { meetingId: string });
    } else if (action === 'listMeetings') {
      data = await listMeetings(input as Parameters<typeof listMeetings>[0]);
    } else {
      return { ok: false, error: `Unknown action: ${String(action)}` };
    }
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

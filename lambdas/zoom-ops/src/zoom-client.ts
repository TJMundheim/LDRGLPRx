import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = 'us-east-2';
const ZOOM_API = 'https://api.zoom.us/v2';

interface ZoomCreds { client_id: string; account_id: string; client_secret: string; }
interface TokenCache { token: string; expiresAt: number; }

let cachedCreds: ZoomCreds | null = null;
let tokenCache: TokenCache | null = null;

async function getCreds(): Promise<ZoomCreds> {
  if (cachedCreds) return cachedCreds;
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: 'zoom-ops-creds' }));
  cachedCreds = JSON.parse(res.SecretString!) as ZoomCreds;
  return cachedCreds;
}

export async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const { client_id, account_id, client_secret } = await getCreds();
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account_id}`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}` } },
  );
  if (!res.ok) throw new Error(`Zoom token error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return tokenCache.token;
}

async function zoomFetch(method: string, path: string, body?: unknown): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${ZOOM_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Zoom API error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export interface CreateMeetingInput {
  topic: string; startTimeIso: string; durationMin: number;
  recurrence?: Record<string, unknown>; settings?: Record<string, unknown>;
}

export async function createMeeting(input: CreateMeetingInput): Promise<unknown> {
  const { topic, startTimeIso, durationMin, recurrence, settings } = input;
  return zoomFetch('POST', '/users/me/meetings', {
    topic, type: recurrence ? 8 : 2,
    start_time: startTimeIso, duration: durationMin,
    timezone: 'America/New_York',
    ...(recurrence ? { recurrence } : {}),
    settings: {
      auto_recording: 'cloud', join_before_host: false,
      mute_upon_entry: true, waiting_room: false,
      ...settings,
    },
  });
}

export async function getMeetingAttendance(input: { meetingId: string }): Promise<unknown> {
  return zoomFetch('GET', `/report/meetings/${input.meetingId}/participants`);
}

export async function listMeetings(input: { userId?: string; from?: string; to?: string }): Promise<unknown> {
  const { userId = 'me', from, to } = input;
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const q = qs.toString() ? `?${qs}` : '';
  return zoomFetch('GET', `/users/${userId}/meetings${q}`);
}

export function __resetCacheForTests(): void {
  cachedCreds = null;
  tokenCache = null;
}

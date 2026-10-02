// Mailgun send. Plain mail stays urlencoded (unchanged); with attachments it switches to multipart.
export interface Attachment { filename: string; contentBase64: string; contentType: string }

export interface MailgunArgs {
  key: string; domain: string; from: string; to: string; subject: string; html: string;
  text?: string; cc?: string; attachments?: Attachment[];
}

const valid = (a: Attachment): boolean =>
  !!a && typeof a.filename === 'string' && a.filename !== '' &&
  typeof a.contentBase64 === 'string' && typeof a.contentType === 'string' && a.contentType !== '';

export async function mailgunSend(o: MailgunArgs): Promise<string> {
  const fields: Record<string, string> = {
    from: o.from, to: o.to, subject: o.subject, html: o.html,
    ...(o.text ? { text: o.text } : {}), ...(o.cc ? { cc: o.cc } : {}),
  };
  const headers: Record<string, string> = { Authorization: `Basic ${Buffer.from(`api:${o.key}`).toString('base64')}` };
  let body: string | FormData;
  if (o.attachments?.length) {
    if (!o.attachments.every(valid)) throw new Error('invalid attachment');
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    for (const a of o.attachments) {
      fd.append('attachment', new Blob([Buffer.from(a.contentBase64, 'base64')], { type: a.contentType }), a.filename);
    }
    body = fd; // fetch sets the multipart content-type + boundary itself
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(fields).toString();
  }
  const res = await fetch(`https://api.mailgun.net/v3/${o.domain}/messages`, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`mailgun ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mailgunSend } from './mailgun';

const base = { key: 'k', domain: 'my4mlife.com', from: 'My4MLife <info@my4mlife.com>', to: 'a@x.com', subject: 'Hi', html: '<p>Hi</p>' };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: '<id-1>' }), text: async () => '' });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('mailgunSend without attachments (backward compatible)', () => {
  it('posts urlencoded form with auth header and returns the message id', async () => {
    const id = await mailgunSend({ ...base, text: 'Hi', cc: 'c@x.com' });
    expect(id).toBe('<id-1>');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mailgun.net/v3/my4mlife.com/messages');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('api:k').toString('base64')}`);
    const p = new URLSearchParams(init.body);
    expect(p.get('to')).toBe('a@x.com');
    expect(p.get('cc')).toBe('c@x.com');
    expect(p.get('text')).toBe('Hi');
  });

  it('empty attachments array also uses the urlencoded path', async () => {
    await mailgunSend({ ...base, attachments: [] });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('throws on a non-2xx Mailgun response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Forbidden' });
    await expect(mailgunSend(base)).rejects.toThrow(/mailgun 401/);
  });
});

describe('mailgunSend with attachments', () => {
  const bytes = Buffer.from('%PDF-1.7 fake');
  const att = { filename: 'order.pdf', contentBase64: bytes.toString('base64'), contentType: 'application/pdf' };

  it('posts multipart FormData (no explicit content-type) with the file bytes, name and type', async () => {
    await mailgunSend({ ...base, cc: 'c@x.com', attachments: [att] });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined(); // fetch sets the multipart boundary
    expect(init.headers.Authorization).toMatch(/^Basic /);
    const fd = init.body as FormData;
    expect(fd.get('to')).toBe('a@x.com');
    expect(fd.get('cc')).toBe('c@x.com');
    expect(fd.get('subject')).toBe('Hi');
    const file = fd.get('attachment') as File;
    expect(file.name).toBe('order.pdf');
    expect(file.type).toBe('application/pdf');
    expect(Buffer.from(await file.arrayBuffer()).equals(bytes)).toBe(true);
  });

  it('sends several attachments', async () => {
    await mailgunSend({ ...base, attachments: [att, { ...att, filename: 'b.pdf' }] });
    expect((fetchMock.mock.calls[0][1].body as FormData).getAll('attachment')).toHaveLength(2);
  });

  it('rejects a malformed attachment', async () => {
    await expect(mailgunSend({ ...base, attachments: [{ filename: '', contentBase64: 'x', contentType: 'a/b' }] })).rejects.toThrow(/attachment/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

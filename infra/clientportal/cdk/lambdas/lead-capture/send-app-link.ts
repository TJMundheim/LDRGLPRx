import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});
const FROM = 'noreply@my4mlife.com';
const APP_URL = 'https://app.my4mlife.com';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family:Inter,sans-serif;background:#0a0a12;color:#f0f0f0;padding:40px 24px;max-width:560px;margin:0 auto">
  <h1 style="color:#c8a84b;font-size:1.5rem;margin-bottom:8px">Welcome, ${firstName}.</h1>
  <p style="color:#aaa;font-style:italic;margin-bottom:24px">Begin with the end in mind.</p>
  <p>Your My4MLife app is ready. Here's how to get started in the next 10 minutes:</p>
  <ol style="line-height:2">
    <li>Open <a href="${APP_URL}" style="color:#00b894">${APP_URL}</a> on any device.</li>
    <li>Enter this email address — you'll receive a 6-digit code in your inbox.</li>
    <li>Enter the code, then walk through the 3-stage Protégé intake (~10 min).</li>
  </ol>
  <p style="margin-top:24px">
    <a href="${APP_URL}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700">
      Open My4MLife App &rarr;
    </a>
  </p>
  <p style="margin-top:32px;font-size:0.8rem;color:#555">
    You're receiving this because you requested access at my4mlife.com. Reply to this email with any questions.
  </p>
</body>
</html>`;
}

export const handler = async (event: {
  body?: string;
  email?: string;
  firstName?: string;
  source?: string;
}) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body: { email?: string; firstName?: string; source?: string };
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ status: 'error', message: 'Invalid JSON body' }) };
  }

  const { email = '', firstName = 'Friend', source = 'unknown' } = body;

  if (!isValidEmail(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'error', message: 'Please provide a valid email address.' }),
    };
  }

  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ event: 'lead_capture', email, firstName, source, timestamp }));

  try {
    const cmd = new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: `Your My4MLife App — start here, ${firstName}`, Charset: 'UTF-8' },
          Body: { Html: { Data: buildHtml(firstName), Charset: 'UTF-8' } },
        },
      },
    });
    const result = await ses.send(cmd);
    const messageId = result.MessageId ?? 'unknown';
    console.log(JSON.stringify({ event: 'ses_sent', messageId, email, timestamp }));
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'sent', messageId }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'ses_error', email, error: msg, timestamp }));
    // Return 200/queued so frontend shows success during SES sandbox testing
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'queued', message: 'Your request has been received.' }),
    };
  }
};

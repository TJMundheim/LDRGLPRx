import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { simpleParser } from 'mailparser';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const CONV_TABLE = process.env.CONVERSATIONS_TABLE ?? 'Conversations';
const FROM_ADDR = process.env.CONCIERGE_FROM ?? 'concierge@my4mlife.com';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ses = new SESClient({ region: REGION });
const bedrock = new BedrockRuntimeClient({ region: REGION });

interface SESReceiptEvent {
  Records: Array<{ ses: { mail: { messageId: string; source: string; commonHeaders: { from: string[]; subject?: string; messageId?: string } }; receipt: { action: { bucketName: string; objectKey: string } } } }>;
}

export const handler = async (event: SESReceiptEvent): Promise<void> => {
  for (const record of event.Records) {
    const { mail, receipt } = record.ses;
    const obj = await s3.send(new GetObjectCommand({ Bucket: receipt.action.bucketName, Key: receipt.action.objectKey }));
    const raw = await obj.Body!.transformToString();
    const parsed = await simpleParser(raw);

    const fromEmail = (mail.commonHeaders.from?.[0] ?? mail.source).toLowerCase().trim();
    const contactId = await resolveContactByEmail(fromEmail);
    if (!contactId) {
      console.log('unknown sender, dropping:', fromEmail);
      continue;
    }

    const ts = new Date().toISOString();
    const inboundBody = parsed.text ?? '';
    const inSk = `${ts}#in#${mail.messageId}`;

    await ddb.send(new PutCommand({
      TableName: CONV_TABLE,
      Item: {
        contactId, sk: inSk, direction: 'in', channel: 'email',
        subject: parsed.subject, body: inboundBody, messageId: mail.messageId,
        inReplyTo: parsed.inReplyTo, ts,
      },
      ConditionExpression: 'attribute_not_exists(sk)',
    })).catch((e) => { if (e.name !== 'ConditionalCheckFailedException') throw e; });

    const history = await loadHistory(contactId);
    const reply = await draftReply(history, inboundBody);

    const sent = await ses.send(new SendEmailCommand({
      Source: FROM_ADDR,
      Destination: { ToAddresses: [fromEmail] },
      Message: {
        Subject: { Data: parsed.subject?.startsWith('Re:') ? parsed.subject : `Re: ${parsed.subject ?? 'your message'}` },
        Body: { Text: { Data: reply } },
      },
    }));

    const outSk = `${new Date().toISOString()}#out#${sent.MessageId ?? 'unknown'}`;
    await ddb.send(new PutCommand({
      TableName: CONV_TABLE,
      Item: {
        contactId, sk: outSk, direction: 'out', channel: 'email',
        subject: parsed.subject, body: reply, messageId: sent.MessageId,
        inReplyTo: mail.messageId, claudeModel: BEDROCK_MODEL, ts: new Date().toISOString(),
      },
    }));
  }
};

async function resolveContactByEmail(email: string): Promise<string | null> {
  const res = await ddb.send(new QueryCommand({
    TableName: CONTACT_TABLE, IndexName: 'byEmail',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
    Limit: 1,
  }));
  return res.Items?.[0]?.contactId ?? null;
}

async function loadHistory(contactId: string) {
  const res = await ddb.send(new QueryCommand({
    TableName: CONV_TABLE,
    KeyConditionExpression: 'contactId = :c',
    ExpressionAttributeValues: { ':c': contactId },
    ScanIndexForward: false, Limit: 20,
  }));
  return (res.Items ?? []).reverse();
}

async function draftReply(history: any[], inboundBody: string): Promise<string> {
  const messages = history.map((m) => ({ role: m.direction === 'in' ? 'user' : 'assistant', content: m.body ?? '' }));
  messages.push({ role: 'user', content: inboundBody });

  const res = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 800,
      system: 'You are the My4MLife concierge. Warm, concise, direct. Help the member book their telemed consult or answer protocol questions. Never give medical advice. Never name a specific clinician.',
      messages,
    }),
  }));
  const parsed = JSON.parse(new TextDecoder().decode(res.body));
  return parsed.content?.[0]?.text ?? 'Thanks — a human teammate will follow up shortly.';
}

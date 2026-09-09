// SES inbound event loop: parse → loop-guard → resolve contact → draft (Bedrock)
// → store draft → auto-send (if enabled + safe) or notify TJ for approval.
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseInbound, shouldSkip } from './parse';
import { resolveContact, writeInbound, loadHistory, writeItem } from './store';
import { draftReply } from './draft';
import { notifyTJ, sendMail } from './notify';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONCIERGE_MODE = process.env.CONCIERGE_MODE ?? 'draft';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const AUTO_CATEGORIES = new Set(['faq', 'fulfillment', 'sales']);

const s3 = new S3Client({ region: REGION });

interface SESReceiptEvent {
  Records: Array<{
    ses: {
      mail: { messageId: string; commonHeaders: { subject?: string } };
      receipt: { action: { bucketName: string; objectKey: string } };
    };
  }>;
}

export const handler = async (event: SESReceiptEvent): Promise<void> => {
  for (const record of event.Records) {
    const { mail, receipt } = record.ses;
    const obj = await s3.send(new GetObjectCommand({ Bucket: receipt.action.bucketName, Key: receipt.action.objectKey }));
    const raw = await obj.Body!.transformToString();
    const inbound = await parseInbound(raw, mail.messageId);

    const skipReason = shouldSkip(inbound);
    if (skipReason) {
      console.log('skipping inbound message:', skipReason, inbound.fromEmail);
      continue;
    }

    const { contactId, isProspect } = await resolveContact(inbound.fromEmail);
    const ts = new Date().toISOString();

    await writeInbound({
      contactId, sk: `${ts}#in#${mail.messageId}`, direction: 'in', channel: 'email',
      subject: inbound.subject, body: inbound.body, messageId: inbound.messageId, ts,
    });

    const history = await loadHistory(contactId);
    const draft = await draftReply(history, inbound.body, isProspect);

    const draftTs = new Date().toISOString();
    const draftSk = `${draftTs}#draft#${inbound.messageId}`;
    const subject = inbound.subject.startsWith('Re:') ? inbound.subject : `Re: ${inbound.subject}`;
    const shouldAutoSend = CONCIERGE_MODE === 'auto' && !draft.escalate && draft.confidence >= 0.85 && AUTO_CATEGORIES.has(draft.category);

    await writeItem({
      contactId, sk: draftSk, direction: 'draft', status: shouldAutoSend ? 'sent' : 'pending', channel: 'email',
      toEmail: inbound.fromEmail, fromEmail: inbound.originalTo, subject, body: draft.reply,
      category: draft.category, confidence: draft.confidence, escalate: draft.escalate,
      internalNote: draft.internalNote, inReplyTo: inbound.messageId, claudeModel: BEDROCK_MODEL, ts: draftTs,
    });

    if (shouldAutoSend) {
      await sendMail(inbound.fromEmail, subject, draft.reply.replace(/\n/g, '<br>'), draft.reply);
      await writeItem({
        contactId, sk: `${new Date().toISOString()}#out#${inbound.messageId}`, direction: 'out', channel: 'email',
        subject, body: draft.reply, inReplyTo: inbound.messageId, ts: new Date().toISOString(),
      });
    } else {
      await notifyTJ({
        contactId, sk: draftSk, category: draft.category, confidence: draft.confidence, escalate: draft.escalate,
        isProspect, internalNote: draft.internalNote, memberEmail: inbound.fromEmail,
        originalSubject: inbound.subject, originalBody: inbound.body, draftReply: draft.reply,
      });
    }
  }
};

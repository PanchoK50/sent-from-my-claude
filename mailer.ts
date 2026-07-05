import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Campaign selection ------------------------------------------------------
// Every command targets one campaign folder under campaigns/, chosen via the
// CAMPAIGN env var:
//   CAMPAIGN=2026-07-my-wave npm run ui
// The campaign's campaign.json names the sender, whose creds live in
// senders/<sender>.env. This keeps one shared tool across senders + waves.
const CAMPAIGN = process.env.CAMPAIGN;
if (!CAMPAIGN) {
  throw new Error('Set CAMPAIGN=<campaign-folder>, e.g. CAMPAIGN=example npm run ui');
}
export const CAMPAIGN_DIR = resolve(__dirname, 'campaigns', CAMPAIGN);
if (!existsSync(CAMPAIGN_DIR)) {
  throw new Error(`Campaign folder not found: ${CAMPAIGN_DIR}`);
}
const campaignCfg = JSON.parse(readFileSync(resolve(CAMPAIGN_DIR, 'campaign.json'), 'utf-8'));
const SENDER: string = campaignCfg.sender;
export const CAMPAIGN_LABEL: string = campaignCfg.label ?? CAMPAIGN;
export const EMAILS_DIR = resolve(CAMPAIGN_DIR, 'emails');

// Load the sender's mailbox creds.
const SENDER_ENV = resolve(__dirname, 'senders', `${SENDER}.env`);
if (!existsSync(SENDER_ENV)) {
  throw new Error(
    `Sender config not found: ${SENDER_ENV}\n` +
      `Copy senders/example.env to senders/${SENDER}.env and fill it in (see senders/README.md).`
  );
}
config({ path: SENDER_ENV });

// --- Provider config (all from the sender .env) -----------------------------
const SMTP_HOST = process.env.SMTP_HOST!;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER!;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD!;

const IMAP_HOST = process.env.IMAP_HOST ?? '';
const IMAP_PORT = parseInt(process.env.IMAP_PORT ?? '993', 10);
const IMAP_USER = process.env.IMAP_USER ?? SMTP_USER;
const IMAP_PASSWORD = process.env.IMAP_PASSWORD ?? SMTP_PASSWORD;

export const SENDER_EMAIL = process.env.SENDER_EMAIL!;
export const SENDER_NAME = process.env.SENDER_NAME ?? SENDER;

export interface EmailEntry {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  html_body: string;
  attachment_path?: string;
  sent_at?: string;
  message_id?: string;
  contact?: Record<string, unknown>;
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  requireTLS: !SMTP_SECURE,
  pool: true,
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
});

export async function verifyConnection(): Promise<void> {
  await transporter.verify();
}

export function closeTransporter(): void {
  transporter.close();
}

// --- Sent log ----------------------------------------------------------------
// Every successful send is appended to sent-log.csv at the repo root. This is
// the kit's native memory: dedup for future waves reads this file, no external
// CRM required. CRM adapters (crm/) are an optional layer on top.
const SENT_LOG = resolve(__dirname, 'sent-log.csv');
const SENT_LOG_HEADER =
  'sent_at,sender,sender_email,to,first_name,last_name,company,campaign,subject,message_id\n';

function csvField(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function appendToSentLog(entry: EmailEntry, messageId: string, sentAt: string): void {
  const c = (entry.contact ?? {}) as Record<string, unknown>;
  const row =
    [
      sentAt,
      SENDER,
      SENDER_EMAIL,
      entry.to,
      c.first_name,
      c.last_name,
      c.company,
      CAMPAIGN_LABEL,
      entry.subject,
      messageId,
    ]
      .map(csvField)
      .join(',') + '\n';
  if (!existsSync(SENT_LOG)) {
    appendFileSync(SENT_LOG, SENT_LOG_HEADER, 'utf-8');
  }
  appendFileSync(SENT_LOG, row, 'utf-8');
}

async function findSentMailbox(client: ImapFlow): Promise<string> {
  const boxes = await client.list();
  const special = boxes.find((b) => b.specialUse === '\\Sent');
  if (special) return special.path;
  const byName = boxes.find((b) =>
    /^(sent|sent items|sent messages|gesendete elemente|gesendete objekte)$/i.test(b.path)
  );
  return byName ? byName.path : 'Sent';
}

export async function appendToSent(rawMime: Buffer): Promise<void> {
  if (!IMAP_HOST) return;
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASSWORD },
    logger: false,
  });
  try {
    await client.connect();
    const sentBox = await findSentMailbox(client);
    await client.append(sentBox, rawMime, ['\\Seen']);
  } finally {
    await client.logout();
  }
}

function resolveAttachment(entry: EmailEntry): string | null {
  if (!entry.attachment_path) return null;
  const p = isAbsolute(entry.attachment_path)
    ? entry.attachment_path
    : resolve(CAMPAIGN_DIR, entry.attachment_path);
  if (!existsSync(p)) {
    throw new Error(`attachment not found: ${p}`);
  }
  return p;
}

export async function sendOne(entry: EmailEntry): Promise<string> {
  const from = `${SENDER_NAME} <${SENDER_EMAIL}>`;
  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: entry.to,
    subject: entry.subject,
    text: entry.body,
    html: entry.html_body,
  };
  if (entry.cc) {
    mailOptions.cc = entry.cc;
  }
  const attachment = resolveAttachment(entry);
  if (attachment) {
    mailOptions.attachments = [{ path: attachment }];
  }

  const rawMime: Buffer = await new Promise((res, rej) => {
    new MailComposer(mailOptions).compile().build((err: Error | null, message: Buffer) => {
      if (err) rej(err);
      else res(message);
    });
  });

  const info = await transporter.sendMail({ ...mailOptions, raw: rawMime });

  try {
    await appendToSent(rawMime);
  } catch (e) {
    console.warn(`  [warn] IMAP append failed (email still sent): ${e}`);
  }

  try {
    appendToSentLog(entry, info.messageId, new Date().toISOString());
  } catch (e) {
    console.warn(`  [warn] sent-log.csv append failed (email still sent): ${e}`);
  }

  return info.messageId;
}

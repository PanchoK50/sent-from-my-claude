/**
 * Generate emails/*.json for ONE campaign from its campaign.json + contacts.json.
 *
 * Usage:  npm run generate -- <campaign-folder>
 *         npx tsx generate.ts example
 *
 * Reads
 *   campaigns/<campaign>/campaign.json   sender, subject, body, ask (+ optional greeting/signoff)
 *   campaigns/<campaign>/contacts.json   deduped contacts (+ optional variant / custom_line)
 *   senders/<sender>.signature.{txt,html}            default signature
 *   senders/<sender>.<variant>.signature.{txt,html}  per-variant signature (A/B tests)
 * Writes
 *   campaigns/<campaign>/emails/NN-[variant-]localpart.json   (clears that folder first)
 *
 * Signatures control only the in-body sign-off block. The From: header comes
 * from senders/<sender>.env and is applied by mailer.ts at send time.
 *
 * This NEVER sends anything. Review + send happens in the UI (serve.ts).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Contact {
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  variant?: string;
  custom_line?: string;
  cc?: string;
}

interface CampaignConfig {
  sender: string;
  label?: string;
  subject: string;
  body: string;
  ask: string;
  greeting?: string; // default "Hi {first}!"
  greeting_fallback?: string; // default "Hi!"
  signoff?: string; // default "Best,"
  attachment_path?: string;
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => a !== '--campaign');
const campaign = args[0];
if (!campaign) {
  fail('Usage: npm run generate -- <campaign-folder>   (e.g. npm run generate -- example)');
}

const cdir = resolve(__dirname, 'campaigns', campaign);
if (!existsSync(cdir)) fail(`Campaign folder not found: ${cdir}`);

const cfg: CampaignConfig = JSON.parse(readFileSync(resolve(cdir, 'campaign.json'), 'utf-8'));
const contacts: Contact[] = JSON.parse(readFileSync(resolve(cdir, 'contacts.json'), 'utf-8'));

const greetingTpl = cfg.greeting ?? 'Hi {first}!';
const greetingFallback = cfg.greeting_fallback ?? 'Hi!';
const signoff = cfg.signoff ?? 'Best,';

function slug(s: string): string {
  const out = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || 'contact';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// --- Signatures, loaded from senders/ files ---------------------------------
const sigCache = new Map<string, { text: string; html: string }>();

function loadSignature(sender: string, variant: string): { text: string; html: string } {
  const key = `${sender}|${variant}`;
  const cached = sigCache.get(key);
  if (cached) return cached;

  const base = variant ? `${sender}.${variant}.signature` : `${sender}.signature`;
  const txtPath = resolve(__dirname, 'senders', `${base}.txt`);
  const htmlPath = resolve(__dirname, 'senders', `${base}.html`);
  if (!existsSync(txtPath) || !existsSync(htmlPath)) {
    fail(
      `Missing signature files for sender=${sender}${variant ? ` variant=${variant}` : ''}:\n` +
        `  ${txtPath}\n  ${htmlPath}\n` +
        `Create both (see senders/README.md). Variants are only needed for A/B tests;\n` +
        `contacts without a "variant" field use senders/${sender}.signature.{txt,html}.`
    );
  }
  const sig = {
    text: readFileSync(txtPath, 'utf-8').trim(),
    html: readFileSync(htmlPath, 'utf-8').trim(),
  };
  sigCache.set(key, sig);
  return sig;
}

// --- Body assembly -----------------------------------------------------------
function greeting(first: string): string {
  return first ? greetingTpl.split('{first}').join(first) : greetingFallback;
}

function textBody(first: string, customLine: string, sigText: string): string {
  const parts = [greeting(first), cfg.body];
  if (customLine) parts.push(customLine);
  parts.push(cfg.ask, `${signoff}\n${sigText}`);
  return parts.join('\n\n');
}

function htmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function htmlBody(first: string, customLine: string, sigHtml: string): string {
  const parts = [
    `<p>${escapeHtml(greeting(first))}</p>`,
    htmlParagraphs(cfg.body),
  ];
  if (customLine) parts.push(htmlParagraphs(customLine));
  parts.push(htmlParagraphs(cfg.ask), `<p>${escapeHtml(signoff)}</p>`, sigHtml);
  return (
    '<div style="font-family: Calibri, sans-serif; font-size: 11pt;">\n' +
    parts.join('\n') +
    '\n</div>'
  );
}

// --- Main --------------------------------------------------------------------
const out = resolve(cdir, 'emails');
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) {
  if (f.endsWith('.json')) unlinkSync(resolve(out, f));
}

let n = 0;
const counts: Record<string, number> = {};
for (const c of contacts) {
  const email = (c.email ?? '').trim();
  if (!email) continue;
  const variant = (c.variant ?? '').trim();
  const sig = loadSignature(cfg.sender, variant);
  const first = (c.first_name ?? '').trim();
  const customLine = (c.custom_line ?? '').trim();
  n += 1;
  counts[variant || 'default'] = (counts[variant || 'default'] ?? 0) + 1;

  const entry: Record<string, unknown> = {
    to: email,
    cc: c.cc ?? '',
    subject: cfg.subject,
    body: textBody(first, customLine, sig.text),
    html_body: htmlBody(first, customLine, sig.html),
    contact: {
      first_name: first,
      last_name: c.last_name ?? '',
      company: c.company ?? '',
      email,
      ...(variant ? { variant } : {}),
    },
  };
  if (cfg.attachment_path) entry.attachment_path = cfg.attachment_path;

  const fname = `${String(n).padStart(2, '0')}-${variant ? `${variant}-` : ''}${slug(email.split('@', 1)[0])}.json`;
  writeFileSync(resolve(out, fname), JSON.stringify(entry, null, 2) + '\n', 'utf-8');
}

console.log(`Wrote ${n} emails to ${out}`);
console.log('by variant:', counts);
console.log('NOTHING sent. Review + send in the UI: CAMPAIGN=' + campaign + ' npm run ui');

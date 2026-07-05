import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  sendOne,
  verifyConnection,
  closeTransporter,
  SENDER_NAME,
  SENDER_EMAIL,
  CAMPAIGN_LABEL,
  EMAILS_DIR,
  type EmailEntry,
} from './mailer.js';

const DELAY_MS = parseInt(process.env.EMAIL_DELAY_MS ?? '10000', 10);

function loadEmail(filePath: string): EmailEntry {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  const sendAll = process.argv.includes('--all');

  let files: string[] = [];

  if (sendAll) {
    files = readdirSync(EMAILS_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => resolve(EMAILS_DIR, f));
  } else if (args.length > 0) {
    files = args.map((f) => resolve(f));
  } else {
    console.log('Usage (set CAMPAIGN first, e.g. CAMPAIGN=example):');
    console.log('  tsx send.ts campaigns/<campaign>/emails/01-x.json            # send one');
    console.log('  tsx send.ts campaigns/<campaign>/emails/01-x.json --dry-run  # preview one');
    console.log('  tsx send.ts --all                                            # send all in this campaign');
    console.log('  tsx send.ts --all --dry-run                                  # preview all');
    process.exit(0);
  }

  console.log(`Campaign: ${CAMPAIGN_LABEL}`);
  console.log(`Files: ${files.length}`);
  console.log(`Sender: ${SENDER_NAME} <${SENDER_EMAIL}>`);
  if (dryRun) console.log('*** DRY RUN - no emails will be sent ***');
  console.log('---');

  if (!dryRun) {
    await verifyConnection();
    console.log('SMTP verified\n');
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const [i, file] of files.entries()) {
    const email = loadEmail(file);
    const label = `[${i + 1}/${files.length}]`;

    if (email.sent_at) {
      skipped++;
      console.log(`${label} SKIP (already sent ${email.sent_at}) -> ${email.to}`);
      continue;
    }

    if (dryRun) {
      console.log(`${label} WOULD SEND -> ${email.to}${email.cc ? ` (cc: ${email.cc})` : ''}`);
      console.log(`    Subject: ${email.subject}`);
      console.log(`    Variant: ${(email.contact?.variant as string) ?? '(n/a)'}`);
      console.log(`    File: ${file}`);
      sent++;
      continue;
    }

    try {
      const msgId = await sendOne(email);
      email.sent_at = new Date().toISOString();
      email.message_id = msgId;
      writeFileSync(file, JSON.stringify(email, null, 2), 'utf-8');
      sent++;
      console.log(`${label} OK -> ${email.to} (${msgId})`);
    } catch (err) {
      failed++;
      console.error(`${label} FAILED -> ${email.to}: ${err}`);
    }

    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n--- Done: ${sent} sent, ${failed} failed, ${skipped} skipped ---`);
  closeTransporter();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

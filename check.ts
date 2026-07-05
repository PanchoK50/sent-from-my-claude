/**
 * Verify a sender's mailbox credentials without sending anything.
 *
 * Usage:  npm run check -- <sender>
 *         npx tsx check.ts francisco
 *
 * Loads senders/<sender>.env, verifies the SMTP login, and (if IMAP_HOST is
 * set) verifies the IMAP login used to copy sent mail into your Sent folder.
 */
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sender = process.argv[2];
if (!sender) {
  console.error('Usage: npm run check -- <sender>   (e.g. npm run check -- francisco)');
  process.exit(1);
}

const envPath = resolve(__dirname, 'senders', `${sender}.env`);
if (!existsSync(envPath)) {
  console.error(`Sender config not found: ${envPath}`);
  console.error(`Copy senders/example.env to senders/${sender}.env and fill it in.`);
  process.exit(1);
}
config({ path: envPath });

const required = ['SENDER_NAME', 'SENDER_EMAIL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing values in ${envPath}: ${missing.join(', ')}`);
  process.exit(1);
}

async function main() {
  console.log(`Sender: ${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  try {
    await transporter.verify();
    console.log(`SMTP OK   ${process.env.SMTP_HOST}`);
  } catch (e) {
    console.error(`SMTP FAILED   ${process.env.SMTP_HOST}: ${e}`);
    process.exit(1);
  } finally {
    transporter.close();
  }

  if (process.env.IMAP_HOST) {
    const client = new ImapFlow({
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT ?? '993', 10),
      secure: true,
      auth: {
        user: process.env.IMAP_USER ?? process.env.SMTP_USER!,
        pass: process.env.IMAP_PASSWORD ?? process.env.SMTP_PASSWORD!,
      },
      logger: false,
    });
    try {
      await client.connect();
      await client.logout();
      console.log(`IMAP OK   ${process.env.IMAP_HOST} (sent mail will be copied to your Sent folder)`);
    } catch (e) {
      console.error(`IMAP FAILED   ${process.env.IMAP_HOST}: ${e}`);
      console.error('Sending still works without IMAP; sent mail just will not appear in your Sent folder.');
      process.exit(1);
    }
  } else {
    console.log('IMAP not configured (optional): sent mail will not be copied to your Sent folder.');
  }

  console.log('All good. You are ready to run a campaign.');
}

main();

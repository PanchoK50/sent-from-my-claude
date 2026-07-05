# Outreach Campaigns — Runbook

How to run a new outreach wave. The golden rule: **nothing is ever sent
unreviewed.** Claude prepares everything up to the review UI and stops. You
review every email; sending happens only on your explicit go, either per email
in the UI or by telling Claude to send the reviewed batch.

## Start a new wave (what you do)

1. Drop your CSV anywhere in the project (any filename). One CSV per sender per wave.
2. Tell Claude: `/outreach <filename>` (or just "new campaign, CSV: <filename>").
3. Answer the ~3 questions below.
4. Claude does everything up to review, then gives you the UI command. You review + send.

## The ~3 questions Claude will ask

1. **Sender** — which mailbox/identity + signature (from `senders/`).
2. **Message** — paste a template (subject + body + ask), say "reuse wave N",
   or point to a file in `templates/`.
3. **Wave label** — e.g. `Wave 2`. Used as the CRM tag and the campaign folder
   name. Claude auto-names it by date if you don't care.

Dedup is fixed by default: **skip anyone the same sender already emailed**
(matched per person by email; a different person at the same company is still
fair game). If you want a **follow-up to the same people**, say so explicitly;
that overrides the skip for that wave.

## What Claude does automatically (and then stops)

1. Parse the CSV. Rich exports (Apollo etc.) and minimal (`First Name, Email`)
   both work. Rows with no email are skipped.
2. Dedup against the sent log and the active CRM adapter (`crm/config.md`), and
   report who was dropped vs who is net-new.
3. Generate one email JSON per surviving contact in the campaign folder,
   personalized (`Hi {first}!`, with a plain "Hi!" fallback; optional
   per-person custom line when the template calls for it).
4. Hand you the review UI command. **STOP. Nothing is sent.**

## You review + send

```bash
CAMPAIGN=<campaign-folder> npm run ui
```

Open http://localhost:3333, read every email, edit inline if needed (the email
body is directly editable, Ctrl+S saves), send per contact once you OK it.
Sent emails are marked, logged to `sent-log.csv`, and copied to your mailbox's
Sent folder if IMAP is configured.

**Prefer to batch?** Review everything first (in the UI or straight in the
`emails/*.json` files), then tell Claude "send them all". Claude runs the
batch sender: it skips anything you already sent from the UI, picks up edits
you saved there, waits `EMAIL_DELAY_MS` between emails, and logs every send.
Claude never does this unprompted; the explicit instruction is the trigger.

## After you've sent

Tell Claude you're done. It runs the CRM adapter's `record` step so the next
wave dedups correctly. With the default `csv-log` adapter there is nothing to
do; the log was already written at send time.

## Template rules

- Templates live in `templates/`; each one carries its own voice rules.
- Universal: no em dashes, no AI-sounding phrasing, short and direct.
- If a template needs a per-person custom sentence, it needs either enough CSV
  columns (title, company, LinkedIn) to write it from, or you fill the blanks
  in the UI before sending.

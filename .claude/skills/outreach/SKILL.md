---
name: outreach
description: Start a new outreach campaign from a CSV of contacts. Use when the user types /outreach, says "new campaign", or provides a CSV of people to email. Parses contacts, dedups against the sent log and the configured CRM, generates one reviewable email draft per contact, then hands over the local review UI. Never sends without the user's explicit post-review instruction.
---

# New outreach campaign

Golden rule: **nothing is sent without the user's explicit, post-review go.**
You prepare everything up to the review UI and stop. Do not run `send.ts`, do
not call `/api/send`, do not "helpfully" send a test email. The single
exception: after the user has reviewed the drafts, they may explicitly tell
you to send the batch; that flow is step 8, and the explicit instruction is
the only trigger.

## 0. Preconditions

- If `senders/` contains no real sender (only `example.*`), stop and run the
  setup flow first (see the `outreach-setup` skill).
- Read `crm/config.md` for the active CRM adapter, then read that adapter file
  in `crm/`. You will follow its `dedup` and `record` sections literally.

## 1. Locate the CSV

The user usually passes a filename as the argument, or dropped a CSV somewhere
in the repo. If you can't find it, ask. Any filename works.

## 2. Ask the ~3 questions (one message, then wait)

1. **Sender** — which `senders/<name>.env` to use. If there is exactly one real
   sender, just confirm it.
2. **Message** — paste a new template (subject + body + ask), reuse an existing
   campaign's message ("reuse wave N"), or point to a file in `templates/`.
   If the template calls for per-person custom lines, confirm the CSV has
   enough info (title/company/LinkedIn) to write them.
3. **Wave label** — e.g. "Francisco Wave 2". Used as the campaign folder name
   (slugified, prefixed with `YYYY-MM`) and the CRM tag. Auto-name it by date
   if the user doesn't care.

Also fixed by default: dedup skips anyone the **same sender** already emailed
(matched per person by email; a different person at the same company is fair
game). If the user explicitly wants a follow-up to the same people, that
overrides the skip for this wave.

## 3. Parse the CSV

Both shapes work:

- Rich export (Apollo etc.): `First Name, Last Name, Title, Company Name, Email, Person Linkedin Url, ...`
- Minimal: `First Name, Email` or even just `Email`.

Rules: skip rows with no email; derive a missing first name from the email's
local part when it is clearly a person (`john.smith@` → "John"), otherwise
leave it empty (the greeting falls back to "Hi!"); derive a missing company
from the domain when obvious.

## 4. Dedup

Run the active adapter's `dedup` instructions. Always report: N parsed,
N dropped as already contacted (list them briefly), N net-new.

## 5. Create the campaign folder

`campaigns/<YYYY-MM-label-slug>/` with:

- `campaign.json` — `sender`, `label`, `date`, `subject`, `body`, `ask`
  (+ optional `greeting`, `greeting_fallback`, `signoff`, `attachment_path`).
- `contacts.json` — the surviving contacts: `first_name`, `last_name`,
  `company`, `email` (+ optional `variant`, `custom_line`, `cc`).

If the template uses per-person custom lines, write a `custom_line` for each
contact now, following the template's voice rules exactly (short, concrete, no
AI-sounding phrasing, no em dashes). If there is nothing to base a line on,
omit it for that contact rather than inventing filler.

If the campaign A/B tests signatures, set `variant` per contact (alternate
50/50 unless told otherwise) and make sure
`senders/<sender>.<variant>.signature.{txt,html}` exist.

## 6. Generate and spot-check

```bash
npm run generate -- <campaign-folder>
```

Read 2-3 of the generated `emails/*.json` and check: greeting correct, custom
line reads human, signature present, no template placeholders left over.

## 7. Hand over and STOP

Give the user exactly this and nothing else to run:

```bash
CAMPAIGN=<campaign-folder> npm run ui
```

Then stop. Nothing is sent yet. The user now reviews, and either sends each
email themselves in the UI or comes back and tells you to send the batch.

## 8. Batch send (only on explicit command)

If, and only if, the user explicitly tells you to send after reviewing
("looks good, send them all"):

```bash
CAMPAIGN=<campaign-folder> npm run send-all
```

Details that make this safe: emails already sent from the UI are skipped
(`sent_at` is set), edits saved in the UI are picked up (the UI writes back to
the JSON files), and the sender waits `EMAIL_DELAY_MS` between emails. If it
is ambiguous whether the user actually reviewed, ask first; when in doubt, run
`npm run dry-run` and show the summary before sending. Never treat "generate",
"prepare", or silence as permission to send.

## 9. After the wave is sent

Whichever way it was sent, run the active adapter's `record` instructions (the
send scripts already appended to `sent-log.csv` automatically). Report what
was recorded so the next wave's dedup works.

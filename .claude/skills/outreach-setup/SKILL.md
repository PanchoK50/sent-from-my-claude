---
name: outreach-setup
description: First-time setup of sent-from-my-claude for a new user. Use when the user types /outreach-setup, asks to "set me up", or tries to start a campaign with no sender configured. Interviews the user, then writes their sender credentials file, signature files, a message template, and the CRM config, and verifies the mailbox connection.
---

# sent-from-my-claude setup

Interview the user, then write their config. Keep it to one round of questions
where possible; sensible defaults over interrogation.

## 1. Interview (one message)

Ask for:

1. **Name + email address** they will send from, and a short sender handle
   (e.g. "francisco" → `senders/francisco.env`).
2. **Mail provider** — Gmail, Outlook, university/work, or other. This
   determines SMTP/IMAP hosts (cheatsheet in `senders/example.env` and
   `senders/README.md`). For Gmail, tell them they need an App Password
   (https://myaccount.google.com/apppasswords) and that their normal password
   will not work.
3. **Signature** — paste their existing email signature (or the name, role,
   org, links to build one from).
4. **Their project, in 2-3 sentences** — who they are, what they're working on,
   who they want to reach and why. Used for the template.
5. **CRM** — where should "who did I already contact" live?
   Default: the built-in sent log (no setup). Alternatives: Airtable (needs the
   Airtable MCP), or their own tool (walk them through `crm/custom.md` later).

## 2. Write the files

- `senders/<handle>.env` — from `example.env`, with their values. NEVER print
  the password back in chat; if they haven't provided one, leave the
  placeholder and tell them exactly which line to edit and that the file is
  gitignored.
- `senders/<handle>.signature.txt` and `.html` — both from their signature.
  Keep the HTML in the style of `example.signature.html` (inline styles,
  Calibri, small font) so it renders like a normal corporate signature.
- `templates/<handle>-default.md` — a first template following the structure
  and voice rules of `templates/example.md`, written from their project
  description. Show it to them for approval; the message matters.
- `crm/config.md` — set the active adapter. If Airtable: fill the Configuration
  block in `crm/airtable.md` (discover base/table IDs via the Airtable MCP if
  it is connected).

## 3. Verify

```bash
npm run check -- <handle>
```

If SMTP fails: most common causes are normal-password-instead-of-app-password
(Gmail/Yahoo), wrong host, or a university blocking external SMTP. Help them
debug; `senders/README.md` has the cheatsheet.

## 4. Suggest a dry run

Offer a smoke test: a mini campaign with the user's own email address as the
only contact, generated with their real template, so they can see the review
UI and send themselves one email end to end:

```bash
npm run generate -- <test-campaign>
CAMPAIGN=<test-campaign> npm run ui
```

Never send it for them. The rule from day one: the human presses Send.

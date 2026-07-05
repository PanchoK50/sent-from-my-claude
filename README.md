# sent-from-my-claude

**Drafted by Claude. Sent by you. Every single one.**

Like "sent from my iPhone", except Claude isn't allowed to press send.

Cold outreach with Claude Code doing the boring parts and you keeping the
finger on the trigger. You hand Claude a CSV of contacts, it dedups against
everyone you already emailed, drafts one personalized email per person in your
voice and with your signature, and opens a local review UI. **You read every
email and press Send yourself.** Nothing ever goes out automatically.

Built for customer discovery interviews (student startup projects, user
research), works for any small-batch, high-quality outreach where every email
should look hand-written, because you reviewed it by hand.

```
CSV of contacts
   │
   ▼
/outreach  ──►  Claude: parse → dedup vs sent log/CRM → draft emails
   │
   ▼
Review UI (localhost) ──►  YOU read, edit, send each email
   │
   ▼
sent-log.csv / your CRM  ──►  next wave dedups automatically
```

## What you need

- [Claude Code](https://claude.com/claude-code)
- Node.js 20+
- An email account you can send from (Gmail, Outlook, university, work)

## Quickstart

```bash
git clone <this-repo> && cd sent-from-my-claude
npm install
claude
```

Then, inside Claude Code:

1. **`/outreach-setup`** — Claude interviews you (name, mail provider,
   signature, what your project is), writes your config, and verifies your
   mailbox connection. One-time, ~5 minutes. The only manual step: putting
   your mail password in `senders/<you>.env` (gitignored; Gmail needs an
   [App Password](https://myaccount.google.com/apppasswords)).
2. Drop a CSV of contacts anywhere in the folder. Rich exports (Apollo,
   LinkedIn tools) or a bare `First Name, Email` list both work.
3. **`/outreach my-contacts.csv`** — answer ~3 questions (which sender, which
   message, what to call the wave). Claude preps everything and stops.
4. Run the command it gives you, e.g. `CAMPAIGN=2026-07-wave-1 npm run ui`,
   open http://localhost:3333, review each email, edit inline if you want,
   and send one by one.

Try it right now without any setup: `CAMPAIGN=example npm run dry-run` shows
what a send would look like using the bundled fake campaign.

## The rules the kit enforces

- **Human sends, always.** Claude is instructed (CLAUDE.md + skills) to stop at
  the review UI. The send button is yours.
- **No double-contacting.** Every sent email lands in `sent-log.csv`; the next
  wave drops anyone the same sender already emailed. Follow-ups to the same
  people are possible, but only when you explicitly ask.
- **Secrets stay local.** Credentials live in `senders/*.env`, which is
  gitignored, as are your real campaigns and contact lists.

## Bring your own CRM

Out of the box the kit remembers who you contacted in a plain CSV log (zero
setup). If your team lives in Airtable, Notion, HubSpot, or anything else,
the CRM is a **markdown adapter**: a file in `crm/` telling Claude how to dedup
against and record into your tool, usually via that tool's MCP server. Ship
your own by copying `crm/custom.md`. See `crm/README.md`.

## Repo tour

| Path | What |
|---|---|
| `CAMPAIGNS.md` | the runbook: how a wave works end to end |
| `CLAUDE.md` | the rules Claude follows in this repo |
| `.claude/skills/` | `/outreach` and `/outreach-setup` |
| `campaigns/` | one folder per wave (message + contacts + generated drafts); `example/` shows the format |
| `senders/` | your mailbox creds + email signature (per teammate) |
| `templates/` | reusable message templates with voice rules |
| `crm/` | pluggable CRM adapters (csv-log, airtable, none, custom) |
| `serve.ts` | the local review & send UI |
| `generate.ts` / `send.ts` / `check.ts` | draft generator / CLI sender / creds checker |

## Team usage

Two or three people can share one clone of this repo (or a private fork). Each
teammate adds their own sender in `senders/`, and dedup is per sender, so you
never step on each other's contacts. Point the CRM adapter at a shared base if
you want one view of the whole pipeline.

## FAQ

**Gmail says my password is wrong.** You need an App Password (requires 2FA):
https://myaccount.google.com/apppasswords. Your normal password won't work.

**Can it send automatically / on a schedule?** No, and that's the point. Cold
outreach that works is reviewed outreach. If you want drip campaigns, use a
marketing tool.

**Emails don't show in my Sent folder.** Set `IMAP_HOST` in your sender `.env`;
the kit copies each sent email to your Sent folder via IMAP.

**Can I A/B test?** Yes: signature variants per contact (see
`senders/README.md`), with per-variant counts in the UI.

## License

MIT

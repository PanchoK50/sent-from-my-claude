# sent-from-my-claude

Cold outreach drafted by Claude, sent by a human: CSV in, personalized drafts
out, the user reviews and sends every single email.

## Golden rules

1. **Never send an email.** Not via `send.ts`, not via the UI's API, not "just
   a test". Claude prepares drafts; the human reviews and presses Send in the
   UI. No exceptions, ever.
2. **Never commit or print credentials.** `senders/*.env` files are gitignored
   and stay that way.
3. **Dedup before drafting.** Nobody should get the same pitch twice. The
   active CRM adapter (`crm/config.md`) defines how.

## Workflows

- New campaign: the `outreach` skill (also documented in `CAMPAIGNS.md`).
- First-time user setup: the `outreach-setup` skill.

## Repo map

| Path | What |
|---|---|
| `campaigns/<wave>/` | one folder per wave: `campaign.json` (message) + `contacts.json` (people) + `emails/*.json` (generated drafts, one per contact) |
| `senders/` | per-person mailbox creds (`<name>.env`, gitignored) + signature files |
| `templates/` | message templates with voice rules |
| `crm/` | pluggable dedup/record adapters; `config.md` names the active one |
| `generate.ts` | contacts + campaign + signature → `emails/*.json` (never sends) |
| `serve.ts` | local review UI; the ONLY place emails get sent, by the human |
| `send.ts` | CLI batch sender (human-run only; `--dry-run` is safe) |
| `check.ts` | verify a sender's SMTP/IMAP creds without sending |
| `sent-log.csv` | append-only log of every sent email (written automatically) |

## Everyday commands

```bash
npm run check -- <sender>            # verify mailbox creds
npm run generate -- <campaign>       # (re)build emails/*.json for a campaign
CAMPAIGN=<campaign> npm run ui       # review & send UI at localhost:3333
CAMPAIGN=<campaign> npm run dry-run  # preview what would be sent, sends nothing
```

## Writing style for emails

Follow the template's voice rules (`templates/`). Universal rules: no em
dashes; short direct sentences; no AI-sounding phrasing ("I'd be curious
how...", "rare seat", "resonates"); when personalizing, be concrete about the
recipient's actual work or skip the personalization entirely.

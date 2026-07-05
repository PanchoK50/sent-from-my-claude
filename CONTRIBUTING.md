# Contributing

PRs are welcome, from humans and from their agents. External contributors
don't get push access; everything goes through fork → branch → pull request,
and a human reviews and merges. That mirrors how the kit itself works: drafts
from an agent, decisions from a person.

## For coding agents (Claude Code, etc.)

If your human asked you to contribute a change, follow this exactly:

```bash
# 1. Fork and clone (gh handles both; origin = your fork, upstream = this repo)
gh repo fork PanchoK50/sent-from-my-claude --clone
cd sent-from-my-claude
npm install

# 2. Branch
git checkout -b <short-topic-name>

# 3. Make the change, then run the smoke tests (all three must pass)
npx tsc --noEmit
npm run generate -- example
CAMPAIGN=example npm run dry-run

# 4. Commit, push to YOUR fork, open the PR
git commit -am "<what changed and why, one line>"
git push -u origin <short-topic-name>
gh pr create --repo PanchoK50/sent-from-my-claude \
  --title "<what changed>" \
  --body "<why, what you tested, anything the reviewer should know>"
```

If `gh` is not authenticated, ask your human to run `gh auth login` first.
Keep the PR to one focused change; open two PRs rather than one mixed one.

## Rules every PR must respect

1. **The golden rule is not negotiable.** Nothing in this kit may ever send an
   email the human has not reviewed, and nothing sends without an explicit
   human trigger (per-email in the UI, or a post-review batch-send command).
   PRs that add auto-sending, scheduling, or sending without review will be
   closed.
2. **No real people, no secrets.** No real names, email addresses, contact
   lists, credentials, or API keys anywhere, including in tests, examples,
   fixtures, and commit history. Example data stays obviously fictional
   (`ada@example.com`, `.example` domains).
3. **Stay dependency-light.** The kit is a handful of TypeScript files on
   nodemailer + imapflow + dotenv. New runtime dependencies need a good reason.
4. **Docs are part of the product.** If behavior changes, update README /
   CAMPAIGNS.md / the relevant skill in the same PR. Follow the existing voice:
   short, direct, no em dashes.

## Good first contributions

- **CRM adapters:** copy `crm/custom.md`, write `crm/<tool>.md` for Notion,
  Google Sheets, HubSpot, Attio... An adapter is markdown instructions, no
  code needed, but it must cover both `dedup` and `record` and include a
  Configuration section.
- **Email provider support:** the kit is only tested against university (TUM
  via LRZ) mail so far. Verified, documented settings for Gmail, Yahoo, or
  others would be great PRs, as would OAuth2 support in `mailer.ts` for
  Microsoft mailboxes (which no longer allow password-based SMTP).
- **Review UI improvements:** `serve.ts` is intentionally a single file with
  zero frontend dependencies. Improvements welcome within that constraint
  (keyboard navigation, bulk edit, diff view against the template...).
- **Skills:** sharpen `/outreach` and `/outreach-setup` instructions based on
  real usage.

## Reporting bugs

Open a GitHub issue with what you did, what you expected, and what happened.
If it involves an email provider quirk, name the provider; those reports are
gold.

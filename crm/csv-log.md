# Adapter: csv-log (default)

Uses the kit's built-in `sent-log.csv` as the only memory. Zero setup, works
offline, good enough for a single person or a small team sharing one repo.

## Configuration

None.

## dedup

1. If `sent-log.csv` does not exist at the repo root, nothing was ever sent:
   all contacts are net-new.
2. Otherwise read it (columns: `sent_at, sender, sender_email, to, first_name,
   last_name, company, campaign, subject, message_id`).
3. Drop every parsed contact whose email address (case-insensitive) already
   appears in the `to` column **for the same sender**. A different person at
   the same company is still fair game.
4. Exception: if the user explicitly asked for a follow-up wave to the same
   people, skip this filter for that wave.
5. Report to the user: how many contacts were dropped (and who), how many are
   net-new.

## record

Nothing to do. The send scripts append to `sent-log.csv` automatically on every
successful send (UI and CLI both).

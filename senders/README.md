# Senders

A "sender" is one mailbox + one signature. Each teammate who sends outreach gets
their own sender. Campaigns pick a sender by name in `campaign.json`.

Ask Claude to set this up for you (`/outreach-setup`), or do it by hand:

## 1. Credentials: `senders/<name>.env`

Copy `example.env` to `<name>.env` (e.g. `francisco.env`) and fill in your
mailbox settings. Real `.env` files are gitignored; never commit them.

**What's actually tested:** this kit has only ever been run against university
mailboxes, specifically TUM's mail infrastructure (LRZ), where it works well
with a plain SMTP login. Find your own university's settings by searching
"`<your university>` smtp settings" or asking IT.

**Untested / future work:** Gmail, Yahoo, Outlook, and other consumer
providers. Any mailbox that allows a plain SMTP login should work in
principle, but nobody has verified one yet. If you get a provider working,
please open a PR documenting the settings. (Heads-up for that future work:
Microsoft mailboxes no longer allow password-based SMTP at all, so they will
need OAuth2 support in the mailer.)

Verify without sending anything:

```bash
npm run check -- <name>
```

## 2. Signature: `senders/<name>.signature.txt` + `.html`

Two files with the same content, one plain text and one HTML. They are appended
after the sign-off ("Best,") of every generated email. See the `example.signature.*`
files for the format. The easiest path: paste your existing email signature into
Claude and ask it to write both files.

## 3. Optional A/B variants: `senders/<name>.<variant>.signature.*`

To A/B test two identities (e.g. "student researcher" vs "startup founder"),
create variant signature files like `francisco.founder.signature.txt` + `.html`.
Contacts with `"variant": "founder"` in `contacts.json` get that signature; the
review UI shows a badge per variant and per-variant counts, so you can compare
reply rates later.

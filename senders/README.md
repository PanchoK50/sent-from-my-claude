# Senders

A "sender" is one mailbox + one signature. Each teammate who sends outreach gets
their own sender. Campaigns pick a sender by name in `campaign.json`.

Ask Claude to set this up for you (`/outreach-setup`), or do it by hand:

## 1. Credentials: `senders/<name>.env`

Copy `example.env` to `<name>.env` (e.g. `francisco.env`) and fill in your
mailbox settings. Real `.env` files are gitignored; never commit them.

- **Gmail:** enable 2FA, then create an [App Password](https://myaccount.google.com/apppasswords)
  and use it as `SMTP_PASSWORD`. Host `smtp.gmail.com`, port 587.
- **Outlook / Office 365:** host `smtp-mail.outlook.com` (or `smtp.office365.com`), port 587.
- **University or work mailbox:** search "`<your university>` smtp settings" or ask IT.

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

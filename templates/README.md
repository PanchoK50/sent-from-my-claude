# Templates

One markdown file per message template. A template is the source Claude works
from when it builds a campaign: subject, body, ask, and the voice rules for any
per-person personalization. Keep old templates around; reusing "wave 2's
template" is a one-liner in the campaign workflow.

Start from `example.md`. To create your own, ask Claude: "write me an outreach
template for <your project>" and it will follow the same structure.

## How a template maps to a campaign

At campaign time, the template's parts are copied into `campaign.json`:

- **Subject** stays as-is for everyone.
- **Body** stays as-is for everyone (the greeting "Hi {first}!" is added
  automatically, with "Hi!" as the fallback when a first name is missing).
- **Custom line** (optional): a per-person sentence Claude writes for each
  contact, inserted between body and ask. This is where personalization lives.
- **Ask** stays as-is for everyone.

The signature is NOT part of the template; it comes from the sender
(see `senders/README.md`).

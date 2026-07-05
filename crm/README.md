# CRM adapters

The kit needs a memory of who was already contacted, so the same person never
gets the same pitch twice. That memory has two layers:

1. **`sent-log.csv` (always on).** Every successful send is appended to
   `sent-log.csv` at the repo root by the send scripts, automatically. This is
   the kit's native memory and needs zero setup.
2. **A CRM adapter (optional).** If you want your contacts in a real CRM
   (Airtable, Notion, HubSpot, a spreadsheet...), pick an adapter. An adapter
   is just a markdown file that tells Claude how to talk to your tool.

## The adapter contract

Every adapter file must describe two operations:

- **`dedup`** — Given a sender and a list of parsed contacts, return which
  contacts were already contacted (and should be dropped from the wave).
- **`record`** — After a wave is sent, persist the sent contacts (who, by whom,
  which campaign, when) so the next `dedup` finds them.

Claude reads `crm/config.md` to find the active adapter, then follows that
adapter's instructions during the campaign workflow. That's the whole
abstraction: no code interface, just instructions.

## Included adapters

| Adapter | Dedup source | Record target | Setup |
|---|---|---|---|
| `csv-log.md` (default) | `sent-log.csv` | automatic | none |
| `airtable.md` | Airtable base via MCP | Airtable + `sent-log.csv` | Airtable MCP + config |
| `none.md` | nothing | `sent-log.csv` only | none |

To write your own (Notion, HubSpot, Google Sheets, your company's tool), copy
`custom.md` and fill it in. If your tool has an MCP server, Claude can operate
it directly; if not, describe the API/CLI calls to make.

## Switching adapters

Edit `crm/config.md` (or ask Claude to). One line names the active adapter;
adapter-specific settings live in a config block inside the adapter file.

# Adapter: airtable

Keeps contacts in an Airtable base via the Airtable MCP server, on top of the
always-on `sent-log.csv`. Good when a team wants a shared CRM with views,
statuses, and linked companies.

## Prerequisites

The Airtable MCP server must be connected in Claude Code (see
https://support.airtable.com/docs/airtable-mcp-server or use
`claude mcp add`). Verify with the `ping` tool or by listing bases.

## Configuration

Fill this in for your base (ask Claude to discover the IDs with
`search_bases` / `list_tables_for_base` and write them here):

```yaml
base_name: "My CRM"            # Airtable base name
base_id: ""                    # e.g. appXXXXXXXXXXXXXX
contacts_table: "Contacts"     # table holding people
accounts_table: "Accounts"     # optional: table holding companies, linked from Contacts
email_field: "Email"
name_field: "Name"
campaign_field: "Campaign"     # single/multi select or text: which wave contacted them
date_field: "Date Contacted"
owner_field: ""                # optional: which sender/teammate owns the contact
```

## dedup

1. Also run the `csv-log` dedup against `sent-log.csv` (it is the ground truth
   for what was physically sent).
2. For each remaining contact, `search_records` in the contacts table by email.
3. Drop contacts that already have a record with a non-empty campaign/date for
   this sender (same rules: per person by email, not per company; follow-up
   waves override the skip when the user asks).
4. Report dropped vs net-new.

## record

After the user confirms they finished sending (or you can see `sent_at` set in
the campaign's `emails/*.json`):

1. For each sent contact not yet in the base: create a Contact record (and an
   Account record linked to it, if an accounts table is configured).
2. For every sent contact: set the campaign field to this wave's label and the
   date field to the send date.
3. Confirm to the user how many records were created vs updated. Use the
   Airtable MCP write tools; never delete records during this step.

# Adapter: custom (template)

Copy this file to `crm/<your-tool>.md`, fill in the sections, and set
`Active adapter: <your-tool>` in `crm/config.md`. Claude follows these
instructions literally during the campaign workflow, so write them like you
would brief a careful assistant.

Works with anything Claude can reach: an MCP server (Notion, HubSpot, Linear,
Google Sheets...), a REST API called with curl, a CLI, or even a plain file.

## Prerequisites

<!-- What must be installed/connected first? e.g. "Notion MCP server connected",
     "HUBSPOT_TOKEN in .env", "gcloud CLI authenticated". -->

## Configuration

<!-- IDs, database/table names, field mappings. Anything Claude needs to know
     to find YOUR data. -->

## dedup

<!-- Step-by-step: given a sender and a list of parsed contacts (first_name,
     last_name, company, email), how does Claude find out who was already
     contacted? Which tool calls / API requests? What counts as "already
     contacted" (same sender? any sender? time window?)?
     Tip: also keep the csv-log dedup as step 1; sent-log.csv is the ground
     truth for what was physically sent from this repo. -->

## record

<!-- Step-by-step: after a wave is sent (sent_at timestamps appear in the
     campaign's emails/*.json), how does Claude persist that? Create records?
     Update statuses? Tag with the campaign label and date? -->

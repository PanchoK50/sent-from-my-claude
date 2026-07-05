# Adapter: none

No dedup, no CRM. Every contact in the CSV gets an email draft, even if they
were contacted before. `sent-log.csv` is still written on send (that is built
into the send scripts), it just isn't consulted.

Use this only for one-off waves where duplicates don't matter, or when someone
else already guarantees the list is clean.

## dedup

Skip entirely. Tell the user dedup is off because the `none` adapter is active.

## record

Nothing beyond the automatic `sent-log.csv`.

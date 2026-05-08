# CSV Import Format

Connection Manager can import connections from a CSV file
via the **Import CSV** button.

## Columns

- **`name`** *(string, required)* - Display name (e.g. `web-prod-01`)
- **`server`** *(string, required)* - IP address or hostname
- **`port`** *(integer, required)* - SSH port (e.g. `22`)
- **`username`** *(string, required)* - SSH username
- **`group`** *(string, required)* - Group (e.g. `prod/web`)
- **`labels`** *(string, optional)* - Space-separated tags for search (e.g. `nginx frontend`)

## Example

[servers.csv](servers.csv)

## Notes

- The first row must be the header row
- Extra whitespace around values is trimmed automatically
- Rows with empty `name` or `server` are skipped
- Duplicate entries are appended (not merged)

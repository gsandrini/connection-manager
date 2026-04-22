# CSV Import Format

Connection Manager can import connections from a CSV file
via the **Import CSV** button.

## Columns

| Field    | Type    | Required | Description                                             |
|----------|---------|----------|---------------------------------------------------------|
| name     | string  | yes      | Display name (e.g. `web-prod-01`)                       |
| server   | string  | yes      | IP address or hostname                                  |
| port     | integer | yes      | SSH port (e.g. `22`)                                    |
| username | string  | yes      | SSH username                                            |
| group    | string  | yes      | Group (e.g. `prod/web`)                                 |
| labels   | string  | no       | Space-separated tags for search (e.g. `nginx frontend`) |

## Example

[servers.csv](servers.csv)

## Notes

- The first row must be the header row
- Extra whitespace around values is trimmed automatically
- Rows with empty `name` or `server` are skipped
- Duplicate entries are appended (not merged)

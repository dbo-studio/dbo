# Changelog: Export, Import and Backup

Everything on this branch since it split from `dev` at `ba72cb02` (20 commits, migrations 00034–00039 after the merge into `new_features`).

## Export

- Export a whole table, a schema or a whole database, with the schema dump included.
- The export modal has scope and content options.
- Export scopes are covered in the e2e suite.

## Backup and restore

- A backup copies a whole database so it can be restored later. It is separate from export, and the dialog says so.
- Backups use the native tools (`pg_dump`, `mysqldump`, `sqlite3`) when they are found, and fall back to a built-in dump when they are not. An empty database can be backed up.
- Restore uses `psql`, `mysql` or a SQLite file copy. A backup file can be uploaded and restored. A safety backup of the target is taken first, and the user types the database name to confirm.
- A restore can create a new database, or go into a new database name picked from a job's history.
- The backup dialog opens from a database node in the connection menu.
- Inputs are hardened: file names, upload size and type, and download paths are checked, and downloads are limited to the backups folder. The folder is readable by the DBO user only.
- Backups run as jobs, so progress, cancel and the job modal work as they do for exports. A finished backup can be downloaded from the job modal.

## Native tool manager

- DBO finds native tools on `PATH` and in its own tool folder (`data/tools/<driver>/<version>/`).
- A missing tool offers a download. The dialog shows the source URL and size first, and nothing is downloaded without a click.
- Downloads come from a pinned manifest, are checked against a SHA-256 checksum, and are installed under the DBO tool folder. Only an administrator can download or remove a tool.
- A downloaded tool can be removed from the backup dialog.

## Schedules and retention

- Backup schedules (hourly, daily or weekly, with a time zone) run while DBO is running and make a backup without a manual trigger.
- Retention keeps the last N backups and the last N days. The newest backup is always kept.
- Schedules can be created, paused, resumed, run now and deleted from the backup dialog. Each schedule shows its next and last run.
- A schedule that cannot run is flagged before it fails, for example when the connection password is not remembered. A failed run raises an alert in the app. Free disk space is checked before a backup starts.

## Backup console

- A Backup console with a job list showing status, last result, last success, size and destination, with a count of failing jobs.
- A five-step job wizard (general, destination, source, schedule, options) and an edit flow for existing jobs.
- Run now, and a run history per job with status, size, duration and log.
- Destination is a local folder on the machine running DBO. Other destinations are not built yet.

## Compression, encryption and verify

- Backups can be gzip-compressed.
- Backups can be encrypted to a public key, so no passphrase is stored on the server. A wrong passphrase on restore fails cleanly.
- Verify checks a backup and reports pass or fail for each version. Encrypted contents can be checked with the passphrase.
- Restore from a job's history takes a passphrase when the backup is encrypted.

## Merge notes

- The backup migrations were renumbered from 00020–00025 to 00034–00039 to follow the agent-workspace migrations. A database that already ran the old numbers needs a manual look before upgrading.
- Job ids are numbers on the frontend again. The backup types `backup`, `restore` and `tool_install` were added to the job type.

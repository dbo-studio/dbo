# Changelog: Agent Workspace

Everything on this branch since it split from `dev` at `ba72cb02` (86 commits, migrations 00020–00033).

## Agent workspace

- A full-window workstation with a canvas that follows the agent. It holds the tables, diagrams, charts and reports the agent makes, and the chat links to them.
- Agent schema changes are stored as changesets. They open as a schema diff with SQL, can be edited in place (new tables, indexes, foreign keys), show the live table definition next to the proposal, and can be applied from the stored ops.
- New changeset ops: alter column, drop column, add index, rename, views, checks, drop table, and create database or schema (with a mini diagram).
- Data changes can be previewed and applied from the changeset. Several data changes can be proposed as one, and related tables can be seeded.
- Applied changes can be undone, schema changes through generated take-back SQL and data changes through stored undo.
- Postgres and SQLite apply schema changes atomically. MySQL warns that schema changes are not atomic and reports partial applies.
- Every apply attempt is logged with its SQL and shown in the AI settings.
- Each connection has an agent permission tier that sets how far the agent may go.
- The agent can read query plans before advising on indexes, measure a table before writing filters or constraints, and review a schema and fix what it finds.
- The plan shows as a checklist. Tool calls show as readable steps, with a density setting.
- Each chat session runs its own turn with a status badge. A message typed while the agent answers is queued.
- A running summary keeps long chats within context.

## AI chat and providers

- The chat mode sits in the composer, and the chat chrome is slimmer.
- Answers follow as they stream and render like a chat app. Chat tables keep their last row and fill their card. Mermaid diagrams are drawn in the chat.
- Aggregate results can be charted in the chat.
- Searchable context picker for the `@` button and `@` mentions.
- AI provider settings are rebuilt with validation, a connection test, model search, saved custom models and provider logos. The broken Groq/Grok provider is dropped. Chat answers get five minutes.
- Provider failures are explained in the chat instead of raw client errors.
- The chat switches between a connection's databases, sends the database and schema it shows, and gives the AI the whole schema. The system prompt is rewritten.
- Workspace shortcuts for the sessions list and the changes surface.

## Dashboards and reports

- Reports (saved queries) and boards. Both have their own folders in the tree, with new, open, rename, duplicate and delete.
- Boards: drag cards in edit mode, add reports, refresh one card, auto-refresh, cached results with a refreshed time, CSV and PNG export per card, and JSON board import and export.
- Report filters: `{{name}}` placeholders in report SQL, with typed filters, field filters with value dropdowns, saved defaults, and one set of values per board. Filter values are bound parameters and never part of the SQL text. On Postgres, a filter used on its own (`SELECT {{x}}`) returns its value.
- Chart kit shared by the chat and reports: table, number, bar, row, line, area, pie, combo, scatter and bubble, funnel, gauge, heatmap, pivot and trend.
- The agent saves charts as reports, lists existing reports and boards, pins and unpins, and can edit and delete reports and boards. Edit and delete work in Agent mode only.
- Share links (server deployments only): read-only page with expiry, optional password, revoke, a rate limit and a visit log. Viewers can change filters only if the link allows it.
- Subscriptions: scheduled snapshots by email (SMTP settings in the app) or signed webhook, with hourly, daily and weekly presets, CSV per report plus an HTML summary, run history, and a pause after five failures in a row. A pause adds an entry to the notification center. Webhooks to private addresses are refused unless the app runs on desktop or sign-in is off.

## Background jobs and notifications

- A query that outlasts its wait moves to the background as a job, runs once, and tells the user when it ends. It does not count against the single-run policy. Stale queries are failed on boot.
- Live events over SSE (`GET /api/events`) and a notification inbox. One path writes a job's end, its event and its notification.
- Notification center in the app header, a job modal fed by events (no more polling), and background query state in the tab.
- Notification settings, plus system or browser notifications when a job ends while DBO is behind other windows.
- Failed jobs can be retried. A failed query reopens in an editor tab.
- Desktop: close hides DBO to the tray; the tray shows MCP and running jobs; quit asks for confirmation; start at login; no Dock icon while hidden in the tray; a notification click opens its entry.
- Modals can pin their action buttons in a footer below a scrolling body.

## Fixes

- Generated DDL quotes identifiers, so names like `sample-db` work.
- A failed agent query fails the tool, and answers stop repeating rows.
- A new connection starts on the engine's usual port.
- Multiline inputs grow with their text.
- A saved API key is kept when its field is clicked.
- An index is created with its table when both are in one changeset.
- A column's new type is applied on Postgres when the old definition is unknown.

## Migrations

00020 AI changesets · 00021 AI provider URL · 00022 AI audit entries · 00023 remove Groq, add timeout · 00024 questions · 00025 dashboards · 00026 connection agent tier · 00027 changeset op undo · 00028 AI chat summary · 00029 question params · 00030 dashboard shares · 00031 dashboard subscriptions · 00032 notifications · 00033 share filters and visit log

## Tests

- Playwright e2e for changeset ops, undo and partial apply (MySQL), the chart kit, report filters (SQLite, Postgres, MySQL), share links, subscriptions, background jobs, and auto-pause.
- Share links and subscriptions are covered on Postgres and MySQL at the API level.
- An on-demand evaluation of the agent against a real model.

## Not included

- Tray, close-to-tray, quit confirm, Dock hiding and autostart were compiled but not run.
- SMTP over TLS was not tested; only the unencrypted path is covered.
- Subscriptions send CSV and HTML only, with no PNG.

# Forge UI — Handover

## Pinned

- Deployed at http://194.182.181.217 via Caddy (:80 → :3000, /api/* → forge-server :3142)
- Auth: Bearer token `claw-alpha-2026` stored in localStorage
- Build with `NEXT_PUBLIC_FORGE_API=/api` on Exoscale (not localhost)
- Bun runtime at `~/.bun/bin/bun` — not in SSH default PATH
- Systemd user service: `forge-ui.service`

## [2026-04-10] task-streaming · live SSE + cancel + file viewer | BACKLOG.md

**Status:** Task detail page shows live events. Cancel button works. File viewer extracts paths from results.

**Done this session:**
- Task detail page: SSE streaming (tool calls, text deltas, iteration progress)
- Cancel button (DELETE /tasks/{id}) with CancellationToken
- File viewer: extract file paths from result text, view inline via /files endpoint
- deleteTask + taskStreamUrl added to API layer

**Next:**
1. Agent gallery — web UI for creating agents with persona template selector
2. Knowledge browser — /knowledge page for viewing distilled records
3. Per-user auth — replace shared token

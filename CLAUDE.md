# Forge UI — Web Dashboard for Agent Control

Next.js web interface for forge-server. Real-time task monitoring, agent management, thread browsing.

## Pointers

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — app structure, API integration, component layout
- [WORKFLOW.md](WORKFLOW.md) — development, build, deploy
- [BACKLOG.md](BACKLOG.md) — feature tracking
- [HANDOVER.md](HANDOVER.md) — session continuity (read pinned + latest)

## Conventions

- TypeScript strict (no `any`)
- Tailwind CSS utility-first, glass morphism design
- API calls centralized in `src/lib/api.ts` (auth header injection, 401 redirect)
- SSE streaming via `src/lib/sse-manager.ts` + `src/lib/use-sse.ts`
- Pages in `src/app/` (Next.js App Router)

## Non-obvious Constraints

- `NEXT_PUBLIC_FORGE_API=/api` for Exoscale build (Caddy proxies /api/* to forge-server :3142)
- EventSource can't set headers — SSE endpoints accept `?token=` query param for auth
- Bearer token stored in localStorage (`forge_token`), cleared on 401
- Bun runtime on Exoscale (`~/.bun/bin/bun`), not in default PATH for SSH

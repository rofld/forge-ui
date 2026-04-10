# Forge UI — Workflow

## Development

```bash
bun install                    # install dependencies
bun run dev                    # localhost:3000 (hot reload)
bun run build                  # production build
bun run start                  # production server
```

## Environment

Create `.env.local`:
```
NEXT_PUBLIC_FORGE_API=http://localhost:3142
```

For Exoscale build: `NEXT_PUBLIC_FORGE_API=/api` (Caddy proxies /api/* to forge-server).

## Code Structure

```
src/
├── app/                  — Next.js App Router (pages)
│   ├── login/page.tsx        — auth gate (Bearer token)
│   ├── agents/page.tsx       — agent list + create
│   ├── agents/[id]/page.tsx  — agent detail (stats, threads)
│   ├── tasks/page.tsx        — task dashboard (filter, stats, cards)
│   ├── tasks/[id]/page.tsx   — task detail (SSE streaming, cancel, file viewer)
│   ├── threads/[id]/page.tsx — thread chat (SSE, agent-aware)
│   └── page.tsx              — endless mode (global thread)
├── components/ui/        — shared components
│   ├── Sidebar.tsx           — navigation (threads, agents, tasks, pools)
│   ├── LayoutShell.tsx       — auth-aware layout wrapper
│   └── ThemePicker.tsx       — theme selection
├── lib/
│   ├── api.ts               — centralized fetch (auth headers, 401 redirect)
│   ├── sse-manager.ts       — SSE session management
│   ├── use-sse.ts           — React hook for SSE streaming
│   ├── types.ts             — TypeScript interfaces
│   └── format.ts            — display helpers
```

## Deploy to Exoscale

```bash
ssh ubuntu@194.182.181.217
export PATH=$HOME/.bun/bin:$PATH
cd ~/forge-ui && git pull
NEXT_PUBLIC_FORGE_API=/api bun run build
systemctl --user restart forge-ui
```

Verify: `curl -s http://194.182.181.217/login | head -5`

## Quality Gates

- TypeScript must compile (`bun run build` catches type errors)
- API calls go through `apiFetch()` in `lib/api.ts` (never raw fetch)
- SSE connections handle server disconnects gracefully

# Forge UI — Backlog

Depends on forge-server API additions. References to shard/forge backend phases
in `~/forge/docs/PLAN-hive-mind.md`.

## Endless Mode UX

- [ ] **Collapsed archive cards** — when context compacts, old messages collapse into
      expandable summary cards showing "Session N: did X, Y, Z (12 ops)".
      Click to expand and see the archive text. Uses: `GET /threads/:id/archive`
      Ref: forge Phase 3.4

- [ ] **Active context boundary** — visible line separating live context from archived.
      Moves down as conversation grows and compacts. SSE event `context_boundary`
      triggers UI update. Ref: forge Phase 2.3

- [ ] **Context recycling animation** — when compaction fires, messages above boundary
      animate into a collapsed card. User sees conversation being "digested".
      Ref: forge Phase 2.3 (SSE `context_compacted` event)

## Thread Knowledge

- [ ] **Knowledge panel** — sidebar/tab showing thread knowledge records. Editable.
      Uses: `GET/POST /threads/:id/knowledge`. Ref: forge Phase 2.4

- [ ] **Dream trigger** — "Consolidate memories" button in thread settings.
      Uses: `POST /threads/:id/dream`. Ref: forge Phase 2.4

- [ ] **Knowledge search** — search across thread knowledge records from the UI.
      Uses: `GET /threads/:id/knowledge/search?q=`. Ref: forge Phase 2.4

## Multi-Agent

- [ ] **Agent activity indicator** — show active agents in thread header/sidebar.
      Pulsing dot per active agent. Uses: `GET /threads/:id/agents`. Ref: forge Phase 4.1

- [ ] **@mention autocomplete** — tab-complete `@agent-scout` etc in chat composer.
      Uses: WorkChat agent directory. Ref: forge Phase 4.3

- [ ] **Agent cards** — each agent's output in a bordered card with persona label.
      Existing partial implementation — needs thread agent registry.

## Existing (from previous sprints)

- [ ] Tool/persona picker in thread creation
- [ ] Thinking block visualization

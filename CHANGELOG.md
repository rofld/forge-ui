# Changelog

All notable changes to forge-ui are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/). Dates are YYYY-MM-DD.

## [2026-03-24] Split & standalone

### Changed
- Split forge-ui to standalone repo from `rofld/forge`

## [2026-03-23] Canvas, streaming, themes & bug fixes

### Added
- Canvas syntax editor, per-thread whiteboard, thread tabs
- 6 themes, Edit diff view, improved light mode
- Incremental markdown rendering — line-by-line streaming
- Real token streaming, session persistence, collapsible tool groups
- Canvas editor, file explorer, whiteboard, themes, model controls
- Streaming timeline segments, SSE tool input/output
- Endless context, thread CRUD, shared context UI
- Inter font, collapsible sidebar
- Tool call cards, animations, richer markdown
- Z.ai models in model picker
- WorkChat panel, steering input

### Fixed
- 7 frontend bugs — race conditions, error handling, leaks
- FileReader onerror handlers, canvas timer leak
- Canvas file-not-found + editing lag in Endless mode
- Smooth streaming — subscribe before first notify, RAF throttle
- Smooth streaming text, no position reset on completion
- Throttled markdown rendering, unified font sizes

### Performance
- Fix canvas lag and backspace bug

## [2026-03-22] Initial UI

### Added
- Next.js 16 web UI for forge agent platform
- shadcn/ui, JetBrains Mono, Enter-to-send
- Landing chat, shard icon, collapsible sidebar
- Infinity icon, syntax highlighting, richer text rendering
- Warm glossy redesign — glass effects, amber accents

### Fixed
- SSE text accumulation, PoolInfo field match, remove dead code
- Infinity icon visible, empty state hero on all chat views

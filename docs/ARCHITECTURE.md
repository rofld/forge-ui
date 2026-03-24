# Forge UI — Architecture Document

> **Generated**: Auto-generated from codebase analysis  
> **Stack**: Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript 5

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Component Hierarchy](#component-hierarchy)
4. [Data Flow: Message Lifecycle](#data-flow-message-lifecycle)
5. [SSE Streaming Pipeline](#sse-streaming-pipeline)
6. [Canvas / File System Integration](#canvas--file-system-integration)
7. [Theme System](#theme-system)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [API Layer](#api-layer)
10. [Key Patterns & Conventions](#key-patterns--conventions)

---

## Project Overview

Forge UI is a web frontend for the **Forge agent platform** — a system for managing AI agent threads, pools, and their shared knowledge. The UI provides:

- **Endless mode** — a persistent global chat thread (id: `__global__`)
- **Named threads** — isolated agent conversations with knowledge/archive management
- **Agent pools** — multi-agent orchestration with heartbeat monitoring
- **Canvas** — a slide-out file viewer/editor connected to the backend filesystem
- **Whiteboard** — a freeform spatial canvas for organizing notes and files
- **File Explorer** — keyboard-navigable filesystem browser

The backend API runs at `localhost:3142` (configurable via `NEXT_PUBLIC_FORGE_API`).

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout — fonts, ThemeProvider, CanvasProvider
│   ├── page.tsx                  # Landing page — Endless mode (global chat)
│   ├── globals.css               # Tailwind config, theme CSS vars, glass utilities
│   ├── explorer/
│   │   └── page.tsx              # File explorer — keyboard-driven file browser
│   ├── pools/
│   │   ├── page.tsx              # Pool list view
│   │   └── [id]/page.tsx         # Pool detail — heartbeats, shared context
│   ├── threads/
│   │   ├── page.tsx              # Thread list view
│   │   └── [id]/
│   │       ├── page.tsx          # Thread chat view
│   │       └── knowledge/
│   │           └── page.tsx      # Archives, memories, shared context editor
│   └── whiteboard/
│       └── page.tsx              # Whiteboard spatial canvas
│
├── components/
│   ├── canvas/
│   │   └── Canvas.tsx            # Slide-out file viewer/editor panel
│   ├── chat/
│   │   ├── ChatInput.tsx         # Inline chat input with @ file picker
│   │   ├── Composer.tsx          # Modal composer (Cmd+K) with same features
│   │   ├── FileLink.tsx          # Markdown renderer — file path detection → canvas
│   │   ├── FilePickerDropdown.tsx# @ mention file autocomplete dropdown
│   │   ├── MessageBubble.tsx     # Rendered message with tool calls & markdown
│   │   ├── ModelControls.tsx     # Model selector + thinking budget + effort
│   │   ├── ShardMenu.tsx         # Quick-action menu (explain, refactor, test, etc.)
│   │   ├── StreamingText.tsx     # Live streaming response with segment timeline
│   │   ├── ToolCall.tsx          # Individual tool call card (collapsible)
│   │   └── VerboseOutput.tsx     # Full tool trace modal (Ctrl+O)
│   ├── files/
│   │   └── FileExplorer.tsx      # Compact file tree dropdown in chat header
│   ├── knowledge/
│   │   ├── ArchiveEntry.tsx      # L0/L1/L2 archive card
│   │   ├── MemoryEditor.tsx      # Memory (CLAUDE.md-style) inline editor
│   │   └── SharedContextEditor.tsx # Shared context entry editor
│   ├── pools/
│   │   ├── HeartbeatGrid.tsx     # Real-time agent heartbeat grid
│   │   ├── PoolCard.tsx          # Pool summary card
│   │   └── SharedContext.tsx     # Pool-level shared context viewer
│   ├── ui/
│   │   ├── LayoutShell.tsx       # App shell — providers + sidebar + canvas
│   │   ├── Sidebar.tsx           # Main navigation sidebar
│   │   ├── SidebarWrapper.tsx    # Collapsible sidebar state wrapper
│   │   ├── ThemePicker.tsx       # Theme selection dropdown (4 themes)
│   │   ├── TokenBadge.tsx        # Token count + cost display
│   │   ├── StatusDot.tsx         # Agent status indicator
│   │   ├── FolderIcon.tsx        # SVG folder icon
│   │   ├── InfinityIcon.tsx      # SVG infinity icon
│   │   ├── ShardIcon.tsx         # SVG shard/diamond brand icon
│   │   ├── badge.tsx             # Shadcn badge
│   │   ├── button.tsx            # Shadcn button
│   │   ├── card.tsx              # Shadcn card
│   │   ├── separator.tsx         # Shadcn separator
│   │   └── tooltip.tsx           # Shadcn tooltip
│   └── whiteboard/
│       ├── WhiteboardCanvas.tsx  # Pannable/zoomable infinite canvas
│       ├── WBNodeCard.tsx        # Draggable whiteboard node
│       ├── WBToolbar.tsx         # Whiteboard toolbar (add, zoom, tools)
│       └── types.ts              # WBNode type definition
│
└── lib/
    ├── api.ts                    # REST API client (threads, pools, files, etc.)
    ├── canvas-context.tsx        # CanvasProvider — file open/edit/save state
    ├── chat-context.tsx          # (Unused / reserved for future)
    ├── theme-context.tsx         # ThemeProvider — 4 themes, localStorage persistence
    ├── types.ts                  # TypeScript types (Thread, Message, SSE events, etc.)
    ├── use-sse.ts                # SSE streaming hook — message → segments pipeline
    ├── format.ts                 # Formatting utils (tokens, cost, time, bytes, model names)
    ├── prose.ts                  # Shared Tailwind prose classes for markdown
    └── utils.ts                  # cn() — clsx + tailwind-merge
```

---

## Component Hierarchy

```
<html data-theme="ember-dark">
└── <body>
    └── LayoutShell                          ← src/components/ui/LayoutShell.tsx
        ├── ThemeProvider                    ← src/lib/theme-context.tsx
        │   └── CanvasProvider               ← src/lib/canvas-context.tsx
        │       ├── SidebarWrapper            ← collapsible state
        │       │   └── Sidebar              ← navigation, thread/pool lists, ThemePicker
        │       │       ├── ShardIcon         ← brand logo
        │       │       ├── InfinityIcon      ← endless mode link
        │       │       ├── ThemePicker       ← theme dropdown
        │       │       ├── Thread list       ← dynamic, with rename/delete
        │       │       └── Pool list         ← dynamic
        │       │
        │       ├── <main>                   ← page content (from App Router)
        │       │   │
        │       │   ├── [page.tsx — Endless Mode]
        │       │   │   ├── ShardMenu        ← quick actions dropdown
        │       │   │   ├── FileExplorer     ← compact file tree
        │       │   │   ├── MessageBubble[]   ← rendered messages
        │       │   │   │   ├── Markdown      ← react-markdown + FileLink components
        │       │   │   │   └── ToolCall[]    ← tool execution cards
        │       │   │   ├── StreamingText     ← live response segments
        │       │   │   │   ├── TextSegment   ← markdown text blocks
        │       │   │   │   ├── ToolSegment   ← tool call cards (running/done)
        │       │   │   │   └── ThinkingSegment ← thinking indicator
        │       │   │   ├── ChatInput         ← inline input bar
        │       │   │   │   ├── ModelControls  ← model + thinking budget
        │       │   │   │   └── FilePickerDropdown ← @ file autocomplete
        │       │   │   ├── Composer          ← modal input (Cmd+K)
        │       │   │   │   └── FilePickerDropdown
        │       │   │   ├── VerboseOutput     ← tool trace modal (Ctrl+O)
        │       │   │   └── TokenBadge        ← cost/token footer
        │       │   │
        │       │   ├── [threads/[id]/page.tsx]
        │       │   │   └── (same chat layout as Endless)
        │       │   │
        │       │   ├── [threads/[id]/knowledge/page.tsx]
        │       │   │   ├── ArchiveEntry[]    ← L0/L1/L2 archive cards
        │       │   │   ├── MemoryEditor[]    ← memory entries
        │       │   │   └── SharedContextEditor[] ← shared context entries
        │       │   │
        │       │   ├── [pools/page.tsx]
        │       │   │   └── PoolCard[]        ← pool summary cards
        │       │   │
        │       │   ├── [pools/[id]/page.tsx]
        │       │   │   ├── HeartbeatGrid     ← real-time agent grid
        │       │   │   └── SharedContext     ← pool shared context
        │       │   │
        │       │   ├── [explorer/page.tsx]
        │       │   │   └── File list         ← keyboard-navigable
        │       │   │
        │       │   └── [whiteboard/page.tsx]
        │       │       └── WhiteboardCanvas  ← pannable infinite canvas
        │       │           ├── WBNodeCard[]  ← draggable nodes
        │       │           └── WBToolbar     ← toolbar overlay
        │       │
        │       └── Canvas                   ← slide-out file viewer/editor
        │           ├── Preview mode         ← syntax-highlighted read-only
        │           └── Edit mode            ← textarea with Cmd+S save
        └──
```

---

## Data Flow: Message Lifecycle

### Complete path: Prompt box → SSE → Segments → Rendered output

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. USER INPUT                                                       │
│                                                                       │
│  ChatInput / Composer                                                 │
│  ├── User types message                                               │
│  ├── @ trigger → FilePickerDropdown (queries /files/list endpoint)    │
│  ├── ModelControls set: model, thinkingBudget, effort                 │
│  └── Enter → calls sendMessage(content, model, budget, effort)        │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. useSSE HOOK  (src/lib/use-sse.ts)                                │
│                                                                       │
│  sendMessage(content, model, thinkingBudget, effort)                  │
│  ├── setIsStreaming(true)                                              │
│  ├── setSegments([{ kind: 'thinking' }])  ← show thinking indicator   │
│  ├── Optimistically append user message to messages[]                 │
│  └── POST /threads/{id}/messages  { content, model, effort }          │
│       → Returns SSE ReadableStream                                    │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. SSE EVENT PARSING                                                │
│                                                                       │
│  ReadableStream → line-by-line parsing                                │
│  Buffer accumulates partial lines until \n                            │
│                                                                       │
│  Event types:                                                         │
│  ┌─────────────────┬───────────────────────────────────────────────┐  │
│  │ text_delta      │ Append to accTextRef, update last TextSegment │  │
│  │ assistant       │ Full text block, create TextSegment +         │  │
│  │                 │ ToolSegments for any tool_calls               │  │
│  │ tool_start      │ Create/update ToolSegment (status: running)   │  │
│  │ tool_end        │ Update ToolSegment (status: success/error,    │  │
│  │                 │ output, durationMs)                           │  │
│  │ complete        │ Store token stats (input, output, cache)      │  │
│  │ done            │ Flush remaining text, finalize                │  │
│  │ error           │ Set error message                             │  │
│  └─────────────────┴───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SEGMENT STATE  (StreamSegment[])                                 │
│                                                                       │
│  Segments represent the streaming timeline:                           │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  ┌────────────┐   │
│  │ ThinkingSeg │→ │ TextSeg    │→ │ ToolSeg     │→ │ TextSeg    │   │
│  │ (spinner)   │  │ "Let me.." │  │ Bash ✓ 230ms│  │ "Done! .." │   │
│  └─────────────┘  └────────────┘  └─────────────┘  └────────────┘   │
│                                                                       │
│  On stream end:                                                       │
│  ├── ToolSegments → saved to lastToolCalls (for VerboseOutput)        │
│  ├── Final TextSegment → appended to messages[] as assistant msg      │
│  └── segments[] → cleared to []                                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. RENDERING                                                        │
│                                                                       │
│  Historical messages:                                                 │
│    messages.map(m => <MessageBubble>)                                  │
│    └── Markdown content → react-markdown + rehype-highlight           │
│        └── FileLink: code spans with file paths → clickable → Canvas  │
│        └── ToolCall: collapsible cards with input/output               │
│                                                                       │
│  Live streaming:                                                      │
│    segments.map(s => <StreamingText>)                                  │
│    ├── TextSegment → live markdown rendering with cursor               │
│    ├── ToolSegment → ToolCall card (running spinner / done check)      │
│    └── ThinkingSegment → pulsing "Thinking..." indicator               │
│                                                                       │
│  Canvas auto-refresh:                                                  │
│    If a ToolSegment (Edit/Write) targets the open canvas file,         │
│    refreshCanvas() is called to reload the file content.               │
└─────────────────────────────────────────────────────────────────────┘
```

### Segment Deduplication Logic

The SSE hook handles multi-turn agent responses (where the agent calls tools and then responds again) by:

1. **ThinkingSegments** are filtered out whenever real content arrives
2. **TextSegments** are deduplicated — if a new text block matches the last text segment, it's skipped
3. **ToolSegments** are matched by `id` — `tool_start` creates or updates, `tool_end` completes
4. **Final text** without tool calls replaces the trailing text segment (avoids duplicates from agent re-sending context)

---

## SSE Streaming Pipeline

```
Browser                          Backend (localhost:3142)
  │                                    │
  │  POST /threads/{id}/messages       │
  │  { content, model, effort }        │
  │ ──────────────────────────────────>│
  │                                    │
  │  event: message                    │
  │  data: {"type":"start","model":..} │
  │ <──────────────────────────────────│
  │                                    │
  │  data: {"type":"text_delta",       │
  │         "text":"Let me "}          │
  │ <──────────────────────────────────│  (repeated for each chunk)
  │                                    │
  │  data: {"type":"assistant",        │
  │         "text":"Let me check...",  │
  │         "tool_calls":[{            │
  │           "id":"tc_1",             │
  │           "name":"Bash",           │
  │           "input":{...}            │
  │         }]}                        │
  │ <──────────────────────────────────│
  │                                    │
  │  data: {"type":"tool_start",       │
  │         "id":"tc_1","name":"Bash"} │
  │ <──────────────────────────────────│
  │                                    │
  │  data: {"type":"tool_end",         │
  │         "id":"tc_1",               │
  │         "output":"...",            │
  │         "duration_ms":230}         │
  │ <──────────────────────────────────│
  │                                    │
  │  data: {"type":"text_delta",       │
  │         "text":"Here's "}          │
  │ <──────────────────────────────────│  (final response text)
  │                                    │
  │  event: complete                   │
  │  data: {"type":"complete",         │
  │         "input_tokens":12400,      │
  │         "output_tokens":3200,      │
  │         "cache_read_tokens":8000}  │
  │ <──────────────────────────────────│
  │                                    │
  │  event: done                       │
  │  data: {"type":"done"}             │
  │ <──────────────────────────────────│
```

---

## Canvas / File System Integration

### Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ CanvasProvider (src/lib/canvas-context.tsx)                            │
│                                                                        │
│ State:                                                                 │
│   file: { path, content, language, dirty } | null                      │
│   isOpen: boolean                                                      │
│   workingDir: string ("/home/ubuntu/forge" default)                    │
│   error: string | null (auto-clears after 4s)                          │
│                                                                        │
│ Methods:                                                               │
│   openFile(rawPath)  → resolvePath() → GET /files?path=... → setFile   │
│   refresh()          → re-reads current file from backend              │
│   close()            → setIsOpen(false), delayed setFile(null)         │
│   updateContent(str) → setFile({...file, content, dirty: true})        │
│   save()             → PUT /files { path, content }                    │
│   setWorkingDir(dir) → updates base for relative path resolution       │
└───────────┬──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Integration Points (useCanvas consumers)                              │
│                                                                        │
│ Component              │ Uses                │ Purpose                  │
│ ───────────────────────┼─────────────────────┼──────────────────────── │
│ Canvas.tsx             │ file, isOpen, close, │ Main viewer/editor      │
│                        │ updateContent, save  │ panel (slide-out)       │
│ LayoutShell.tsx        │ error                │ Error toast display     │
│ FileLink.tsx           │ openFile             │ Clickable file paths    │
│                        │                      │ in markdown output      │
│ FileExplorer.tsx       │ openFile, workingDir │ Header file tree        │
│ WBNodeCard.tsx         │ openFile             │ Whiteboard file nodes   │
│ explorer/page.tsx      │ openFile, workingDir │ Full file explorer      │
│ page.tsx (Endless)     │ isOpen, file,        │ Auto-refresh on Edit/   │
│                        │ refresh              │ Write tool calls        │
│ threads/[id]/page.tsx  │ isOpen, file,        │ Same auto-refresh +     │
│                        │ refresh, setWorkDir  │ thread working dir      │
└──────────────────────────────────────────────────────────────────────┘
```

### File Path Resolution

```
resolvePath(rawPath, workingDir):
  "/absolute/path"     → used as-is
  "./relative/path"    → workingDir + "/" + "relative/path"
  "relative/path"      → workingDir + "/" + "relative/path"
```

### Canvas Auto-Refresh

When the agent executes `Edit` or `Write` tool calls targeting the currently open canvas file, the canvas auto-refreshes:

```javascript
// In page.tsx — watches streaming segments
for (const seg of segments) {
  if (seg.kind === 'tool' && (seg.name === 'Edit' || seg.name === 'Write')) {
    if (seg.input?.file_path matches canvasFile.path) {
      refreshCanvas();  // re-reads file from backend
    }
  }
}
```

### Canvas UI Modes

| Mode | Trigger | Features |
|------|---------|----------|
| **Preview** | Default on open | Syntax-highlighted, read-only, line numbers |
| **Edit** | Click "Edit" button | Raw textarea, `Cmd+S` to save, dirty indicator |

---

## Theme System

### Architecture

```
ThemeProvider (src/lib/theme-context.tsx)
├── State: theme (ThemeId), persisted in localStorage('forge-theme')
├── On change: sets html.classList (dark/light) + data-theme attribute
└── Provides: { theme, setTheme, meta }

ThemePicker (src/components/ui/ThemePicker.tsx)
└── Dropdown in sidebar with swatch + name + description
```

### Available Themes

| Theme ID | Name | Description | Mode | Accent Color |
|----------|------|-------------|------|--------------|
| `ember-dark` | Ember | Warm amber on dark stone | Dark | `#f59e0b` (amber) |
| `verdant-dark` | Verdant | Terminal green on dark | Dark | `#10b981` (emerald) |
| `ember-light` | Ember Light | Warm amber on cream | Dark→Light | `#d97706` |
| `verdant-light` | Verdant Light | Fresh green on white | Dark→Light | `#059669` |

### How Themes Work

1. **CSS Custom Properties** (`globals.css`): Each `[data-theme="..."]` sets `--accent-500`, `--accent-400`, `--accent-300`, `--accent-600`, `--accent-rgb`
2. **Dark/Light class**: `html.classList` toggles `dark` / `light` for Tailwind's dark variant
3. **Color remapping** (`globals.css`): For verdant themes, all Tailwind `amber-*` utility classes are overridden to emerald equivalents via `!important` CSS rules (e.g., `.text-amber-400 { color: #34d399 }`)
4. **Light theme overrides**: Background colors, border colors, and text colors adjusted for light backgrounds
5. **Syntax highlighting**: `.hljs-number` and `.hljs-literal` use `var(--accent-400)` for theme-aware code coloring

### Glass Morphism

Custom utility classes defined in `globals.css`:

```css
.glass         → rgba(255,255,255,0.05) + blur(20px) + border rgba(255,255,255,0.08)
.glass-strong  → rgba(255,255,255,0.08) + blur(24px) + border rgba(255,255,255,0.1)
.glow-accent   → box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.15)
```

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action | Registered In |
|----------|--------|---------------|
| `Cmd/Ctrl + K` | Toggle Composer modal | `page.tsx`, `threads/[id]/page.tsx`, `knowledge/page.tsx` |
| `Cmd/Ctrl + O` | Toggle Verbose Output (tool trace log) | `page.tsx`, `threads/[id]/page.tsx` |

### Canvas Shortcuts

| Shortcut | Action | Registered In |
|----------|--------|---------------|
| `Escape` | Close canvas panel | `Canvas.tsx` |
| `Cmd/Ctrl + S` | Save file (in edit mode) | `Canvas.tsx` |

### Chat Input / Composer Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Send message | ChatInput, Composer |
| `Shift + Enter` | New line | ChatInput, Composer |
| `@` | Open file picker dropdown | ChatInput, Composer |
| `Escape` | Close file picker / close Composer | ChatInput, Composer |
| `Arrow Up/Down` | Navigate file picker results | ChatInput, Composer (when picker open) |
| `Tab` | Select file from picker | ChatInput, Composer (when picker open) |

### Verbose Output Shortcuts

| Shortcut | Action | Registered In |
|----------|--------|---------------|
| `Escape` | Close verbose output modal | `VerboseOutput.tsx` |

### File Explorer Shortcuts

| Shortcut | Action | Registered In |
|----------|--------|---------------|
| `Arrow Down` / `j` | Move selection down | `explorer/page.tsx` |
| `Arrow Up` / `k` | Move selection up | `explorer/page.tsx` |
| `Tab` | Enter directory | `explorer/page.tsx` |
| `Enter` | Open file in canvas | `explorer/page.tsx` |
| `Backspace` | Navigate up one directory | `explorer/page.tsx` |

### Sidebar Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Confirm thread rename | Sidebar inline rename |
| `Escape` | Cancel thread rename | Sidebar inline rename |

### ShardMenu Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Submit custom prompt input | ShardMenu custom input |
| `Escape` | Return to menu | ShardMenu input mode |

---

## API Layer

### Endpoint Map (`src/lib/api.ts`)

All requests go to `NEXT_PUBLIC_FORGE_API` (default: `http://localhost:3142`).

| Method | Endpoint | Function | Description |
|--------|----------|----------|-------------|
| GET | `/threads` | `listThreads()` | List all threads |
| GET | `/threads/:id` | `getThread(id)` | Thread detail + archive info |
| POST | `/threads` | `createThread(opts?)` | Create thread (optional id, model, working_dir) |
| DELETE | `/threads/:id` | `deleteThread(id)` | Delete thread |
| PATCH | `/threads/:id` | `renameThread(id, newId)` | Rename thread |
| GET | `/threads/:id/messages` | `getMessages(id)` | Get message history |
| POST | `/threads/:id/messages` | `postMessage(id, content, model?, budget?, effort?)` | Send message → SSE stream |
| GET | `/threads/:id/shared` | `listSharedContext(id)` | List shared context entries |
| PUT | `/threads/:id/shared/:name` | `updateSharedContext(id, name, content)` | Update shared context |
| DELETE | `/threads/:id/shared/:name` | `deleteSharedContext(id, name)` | Delete shared context |
| POST | `/threads/:id/shared` | `uploadSharedContext(id, file)` | Upload file as shared context |
| GET | `/threads/:id/archives` | `getArchives(id)` | Get L0/L1/L2 archives |
| GET | `/threads/:id/memories` | `getMemories(id)` | Get memory entries |
| PUT | `/threads/:id/memories/:name` | `updateMemory(id, name, content)` | Update memory |
| GET | `/pools` | `listPools()` | List agent pools |
| GET | `/pools/:id` | `getPool(id)` | Pool detail + heartbeats |
| GET | `/files?path=...` | `readFile(path)` | Read file content |
| PUT | `/files` | `writeFile(path, content)` | Write file content |
| GET | `/files/list?path=...&query=...` | *(inline fetch)* | List directory / search files |

---

## Key Patterns & Conventions

### 1. Context Provider Pattern

Three React contexts wrap the entire app via `LayoutShell`:

```
ThemeProvider → CanvasProvider → LayoutInner
```

Each follows the same pattern:
- `createContext<T | null>(null)` with a provider component
- `useX()` hook that throws if used outside provider
- State + derived values exposed through the context

### 2. SSE Streaming with Segments

The `useSSE` hook is the core abstraction for agent communication:
- Returns `{ messages, isStreaming, segments, lastToolCalls, tokenStats, error, sendMessage, setMessages }`
- `segments[]` is the **live** streaming state; `messages[]` is the **committed** history
- After stream completes, segments are flushed into messages and cleared
- `lastToolCalls` preserves tool data for the Verbose Output modal after segments clear

### 3. File Path Detection in Markdown

`FileLink.tsx` provides custom `react-markdown` components that:
- Detect inline code spans that look like file paths (regex-based)
- Convert them to clickable buttons that open files in Canvas
- Detect file names in table rows for click-to-open behavior

### 4. Glassmorphism Design System

The UI uses a consistent "glass" design language:
- Semi-transparent backgrounds with backdrop blur
- Subtle borders (`rgba(255,255,255,0.06-0.1)`)
- Amber/emerald accent colors on dark stone backgrounds
- `animate-fade-in` / `animate-fade-in-up` for enter transitions

### 5. Typography

- **Sans-serif**: Space Grotesk (headings, UI text)
- **Monospace**: JetBrains Mono (code, file paths, technical content)
- Markdown prose styling centralized in `src/lib/prose.ts`

### 6. Component Composition

Chat pages (`page.tsx`, `threads/[id]/page.tsx`) share identical structure:
1. Header bar (ShardMenu + FileExplorer + thread info)
2. Scrollable message area (MessageBubble[] + StreamingText)
3. Input area (ChatInput inline + Composer modal)
4. Overlays (VerboseOutput modal)
5. Token/cost footer (TokenBadge)

### 7. Model Controls

Users can configure:
- **Model**: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5, gpt-4o, gpt-4o-mini
- **Thinking Budget**: 0–32000 tokens (slider)
- **Effort**: low, medium, high (mutually exclusive with thinking budget)

### 8. Token Cost Estimation

Client-side cost estimation using hardcoded per-token pricing in `format.ts`:
- Differentiates input, output, and cache-read token costs
- Displayed in TokenBadge component after each response

### 9. Auto-Refresh Pattern

Both Endless and Thread pages watch streaming tool segments for `Edit`/`Write` operations. When the target file matches the canvas's open file, `refreshCanvas()` is called to reload content — giving users real-time visibility into agent file edits.

### 10. Whiteboard

A freeform infinite canvas (`WhiteboardCanvas`) with:
- Pan (click + drag on background) and zoom (buttons)
- Three node types: `note`, `file`, `heading`
- File nodes open in Canvas on click
- State persisted in `localStorage`

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` 16.2.1 | App framework (App Router) |
| `react` 19.2.4 | UI library |
| `react-markdown` | Markdown rendering in messages |
| `rehype-highlight` | Syntax highlighting in code blocks |
| `remark-gfm` | GitHub Flavored Markdown (tables, etc.) |
| `highlight.js` | Code syntax highlighting engine |
| `lucide-react` | Icon library |
| `tailwindcss` 4 | Utility-first CSS |
| `@tailwindcss/typography` | Prose styling for markdown |
| `shadcn` | UI component primitives (button, badge, card, etc.) |
| `class-variance-authority` | Component variant management |
| `clsx` + `tailwind-merge` | Conditional class merging |
| `tw-animate-css` | Animation utilities |
| `@fontsource-variable/inter` | Font (referenced but Space Grotesk used primarily) |

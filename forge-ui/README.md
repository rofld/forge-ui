<div align="center">

# ◆ Forge UI

**The web interface for the Forge agent platform**

[![Next.js 16.2](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19.2](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui 4.1](https://img.shields.io/badge/shadcn%2Fui-4.1-000?style=flat-square)](https://ui.shadcn.com/)
[![Lines of Code](https://img.shields.io/badge/Lines-5.4k+-green?style=flat-square)](#)
[![Components](https://img.shields.io/badge/Components-35-blue?style=flat-square)](#-component-reference)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

<br/>

A real-time streaming chat UI, infinite whiteboard, file explorer, knowledge management system, and multi-agent pool monitor — all in one glassmorphic interface.

<br/>

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Keyboard Shortcuts](#-keyboard-shortcuts) · [Tech Stack](#-tech-stack) · [API Reference](#-api-layer)

</div>

---

## ✦ What is Forge UI?

Forge UI is a **Next.js 16** web frontend for the **Forge agent platform** — a system for managing AI agent threads, pools, and shared knowledge. It connects to the Forge backend API (default: `localhost:3142`) and provides a rich, keyboard-driven interface for:

- **Conversing** with AI agents via real-time Server-Sent Events (SSE) streaming
- **Managing threads** — isolated agent conversations with full history and inline rename
- **Monitoring agent pools** — multi-agent orchestration with live heartbeat status
- **Editing files** — slide-out canvas panel with syntax highlighting and markdown preview
- **Organizing ideas** — infinite spatial whiteboard with drag, pan, zoom, and color-coded nodes
- **Browsing knowledge** — three-tier archive system (L0/L1/L2) with memory editing and shared context

The UI is built with a **glassmorphism design language** — semi-transparent panels with backdrop blur, accent glow effects, and four switchable color themes. Every interaction is keyboard-accessible and optimized for developer workflows.

---

## ✦ Features

### 💬 Chat & Threads

| Feature | Description |
|---------|-------------|
| **Endless mode** | A persistent global chat thread (`__global__`) that lives forever — the default landing experience |
| **Named threads** | Create isolated conversations with independent context, history, and archives |
| **Real-time SSE streaming** | Responses stream token-by-token with an animated cursor using a segment-based pipeline |
| **Segment timeline** | Watch tool calls and text blocks appear in real-time as individual segments |
| **Token tracking** | Live input / output / cache-read token counts with per-model cost estimation |
| **Model switching** | Swap between Claude Opus, Sonnet, Haiku mid-conversation via dropdown |
| **Thinking levels** | Configurable extended thinking: Low (5k), Medium (10k), High (20k), or Ultrathink (50k) budget |
| **Effort control** | Opus effort levels (low / medium / high) for controlling reasoning depth |
| **File mentions** | Type `@` in the composer to autocomplete and attach file paths from the project filesystem |
| **Screenshot attachment** | Paste images from clipboard (`Cmd+V`) — up to 5 screenshots per message |
| **Markdown rendering** | Full GitHub Flavored Markdown with syntax-highlighted code blocks via highlight.js |
| **Shard Menu** | Quick-action menu (◆) with preset prompts: project overview, git status, available tools |
| **Custom search** | Shard Menu search mode — type a query to search the codebase via the agent |
| **Knowledge save** | Shard Menu knowledge mode — save notes directly to the agent's knowledge base |

### 🖼️ Canvas (File Editor)

- **Slide-out panel** — opens from the right side without leaving the current chat
- **Syntax highlighting** — powered by highlight.js with automatic language detection
- **Markdown preview** — toggle between raw source and beautifully rendered markdown
- **Live editing** — edit files in-place and save with `Cmd+S`
- **Auto-refresh** — canvas updates automatically when the agent edits the open file
- **File path detection** — clickable file paths in AI responses (`FileLink` component) open directly in canvas
- **Context-aware** — shared via React context (`CanvasProvider`) so any component can open files

### 🎨 Whiteboard

- **Infinite canvas** — pan with mouse drag, zoom with scroll wheel
- **Three node types** — notes, headings, and file references
- **Six color presets** — amber, emerald, blue, purple, red, pink per node
- **Grid background** — subtle dot grid that scales with zoom level
- **localStorage persistence** — whiteboard state survives page reloads
- **Click-to-create** — click on empty canvas with a tool selected to place a new node
- **Draggable nodes** — reposition nodes freely across the infinite space
- **Inline editing** — double-click any node to edit its content
- **Zoom controls** — toolbar buttons for zoom in, zoom out, and reset

### 📂 File Explorer

- **Full filesystem browser** — navigate the entire project directory tree via REST API
- **Keyboard-driven** — Vim-style `j`/`k` navigation, `Tab` to enter directories, `Backspace` to go up
- **File sizes** — human-readable byte formatting (B / KB / MB)
- **Download support** — download any file directly to your machine
- **Canvas integration** — press `Enter` to open a file in the slide-out editor
- **Compact dropdown** — also available as a dropdown in chat headers for quick file access

### 🧠 Knowledge Management

- **Three-tier archive system:**
  - **L0** — Operation-level logs (short-term memory, per-operation)
  - **L1** — Session summaries (mid-term memory, named entries)
  - **L2** — Epoch summary (long-term memory, single document)
- **Memory editor** — edit persistent agent personality/instructions (CLAUDE.md-style) with inline save
- **Shared context** — upload, edit, and delete context files shared with the agent
- **File upload** — drag-and-drop or button upload for shared context files
- **Inline composer** — interact with the agent directly from the knowledge page

### 🏊 Agent Pools

- **Pool listing** — view all active agent pools with task counts (pending + completed)
- **Heartbeat grid** — real-time agent status with color-coded indicators:
  - 🟢 Active (working on a task)
  - 🟡 Idle (waiting for work)
  - 🔴 Error state
- **Shared context viewer** — see context shared across all agents in a pool
- **Markdown briefings** — pool briefing documents rendered with full GFM
- **Auto-polling** — pool data refreshes automatically every 5 seconds

### 🎨 Theming System

Four built-in themes with instant switching via `ThemePicker` dropdown:

| Theme | Background | Accent | Swatch |
|-------|------------|--------|--------|
| **Ember Dark** | Warm dark stone (`#1c1917`) | Amber (`#f59e0b`) | 🟠 |
| **Verdant Dark** | Cool dark green (`#0f1512`) | Emerald (`#10b981`) | 🟢 |
| **Ember Light** | Warm cream (`#faf8f5`) | Deep amber (`#d97706`) | 🟡 |
| **Verdant Light** | Soft mint (`#f5faf7`) | Teal (`#059669`) | 🌿 |

Themes are implemented via:
- **CSS custom properties** — `--accent-500`, `--accent-400`, `--accent-300`, `--accent-600`, `--accent-rgb`
- **`data-theme` attribute** — on the `<html>` element for CSS selector targeting
- **`dark`/`light` class** — toggles all color scheme variables
- **localStorage persistence** — theme survives page reloads
- **Full accent remapping** — verdant themes remap all amber utilities to emerald via CSS overrides
- **Glass effect adaptation** — glassmorphism opacity adjusts for light vs dark backgrounds

### ⚡ Additional Features

| Feature | Description |
|---------|-------------|
| **Verbose Output** | Full tool-call trace log with copy-to-clipboard, toggled via `Cmd+O` |
| **Token Badge** | Compact display of input/output/cache tokens + estimated USD cost |
| **Cost estimation** | Per-model pricing for Claude Opus ($15/$75/M), Sonnet ($3/$15/M), Haiku ($0.80/$4/M) |
| **Status Dots** | Color-coded animated agent status indicators (idle / working / error) |
| **Glassmorphism UI** | Semi-transparent backgrounds with `backdrop-filter: blur()` throughout |
| **Collapsible sidebar** | Thread and pool navigation with inline rename support |
| **Time-of-day greeting** | Landing page greets you with "Good morning/afternoon/evening" |
| **Ultrathink mode** | Rainbow-shifting gradient badge for 50k+ thinking budget (inspired by Claude Code) |
| **Custom animations** | `fadeInUp`, `slideInLeft`, `slideInRight`, `expandDown`, `shimmer` keyframes |
| **Custom scrollbars** | Thin 6px scrollbar with stone-colored thumb on WebKit browsers |
| **Accent-colored selection** | Text selection uses the current theme's accent color |

---

## ✦ Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Forge backend** running on `localhost:3142` (or configure via environment variable)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd forge-ui

# Install dependencies
npm install
```

### Development

```bash
# Start the development server (Turbopack enabled by default)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
# Build for production
npm run build

# Start the production server
npm start
```

### Linting

```bash
npm run lint
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_FORGE_API` | `http://localhost:3142` | Forge backend API base URL |

---

## ✦ Architecture

### Directory Structure

```
forge-ui/
├── src/
│   ├── app/                              # Next.js 16 App Router pages
│   │   ├── layout.tsx                    # Root layout — fonts, theme, sidebar shell
│   │   ├── page.tsx                      # Landing page — Endless mode (global chat)
│   │   ├── globals.css                   # 478 lines — themes, glass, syntax, animations
│   │   ├── explorer/page.tsx             # Keyboard-driven file browser
│   │   ├── whiteboard/page.tsx           # Infinite spatial canvas
│   │   ├── pools/
│   │   │   ├── page.tsx                  # Pool list (redirects to /)
│   │   │   └── [id]/page.tsx             # Pool detail — heartbeats, context, briefing
│   │   └── threads/
│   │       ├── page.tsx                  # Thread list (redirects to /)
│   │       └── [id]/
│   │           ├── page.tsx              # Thread chat view
│   │           └── knowledge/page.tsx    # Archives + memories + shared context
│   │
│   ├── components/                       # 35 React components across 7 domains
│   │   ├── canvas/
│   │   │   └── Canvas.tsx                # Slide-out file viewer/editor panel
│   │   ├── chat/                         # 11 chat interface components
│   │   │   ├── ChatInput.tsx             # Inline input bar with @ file picker
│   │   │   ├── Composer.tsx              # Full-screen modal input (Cmd+K)
│   │   │   ├── MessageBubble.tsx         # Message rendering with markdown + tools
│   │   │   ├── StreamingText.tsx         # Live SSE streaming with segment timeline
│   │   │   ├── ToolCall.tsx              # Individual tool call card (collapsible)
│   │   │   ├── ToolCallGroup.tsx         # Grouped tool call container
│   │   │   ├── FileLink.tsx              # Clickable file paths → opens canvas
│   │   │   ├── FilePickerDropdown.tsx    # @ mention autocomplete dropdown
│   │   │   ├── ModelControls.tsx         # Model selector + thinking budget
│   │   │   ├── ShardMenu.tsx             # Quick action menu (◆)
│   │   │   └── VerboseOutput.tsx         # Full tool trace log modal
│   │   ├── files/
│   │   │   └── FileExplorer.tsx          # Compact file tree dropdown
│   │   ├── knowledge/                    # 3 knowledge management components
│   │   │   ├── ArchiveEntry.tsx          # L0/L1/L2 archive card
│   │   │   ├── MemoryEditor.tsx          # Memory inline editor
│   │   │   └── SharedContextEditor.tsx   # Context file editor
│   │   ├── pools/                        # 3 pool monitoring components
│   │   │   ├── HeartbeatGrid.tsx         # Real-time agent status grid
│   │   │   ├── PoolCard.tsx              # Pool summary card
│   │   │   └── SharedContext.tsx          # Pool shared context viewer
│   │   ├── ui/                           # 14 base UI components
│   │   │   ├── LayoutShell.tsx           # App shell with ThemeProvider + CanvasProvider
│   │   │   ├── Sidebar.tsx               # Main navigation sidebar
│   │   │   ├── SidebarWrapper.tsx        # Collapsible sidebar state manager
│   │   │   ├── ThemePicker.tsx           # 4-theme selector dropdown
│   │   │   ├── TokenBadge.tsx            # Token count + cost display
│   │   │   ├── StatusDot.tsx             # Agent status indicator
│   │   │   ├── badge.tsx                 # shadcn/ui badge
│   │   │   ├── button.tsx                # shadcn/ui button (with variants)
│   │   │   ├── card.tsx                  # shadcn/ui card (header, title, content, footer)
│   │   │   ├── separator.tsx             # shadcn/ui separator
│   │   │   ├── tooltip.tsx               # shadcn/ui tooltip
│   │   │   ├── ShardIcon.tsx             # Custom ◆ shard SVG icon
│   │   │   ├── FolderIcon.tsx            # Custom 📁 folder SVG icon
│   │   │   └── InfinityIcon.tsx          # Custom ∞ infinity SVG icon
│   │   └── whiteboard/                   # 3 whiteboard components
│   │       ├── WhiteboardCanvas.tsx      # Pannable/zoomable infinite canvas
│   │       ├── WBNodeCard.tsx            # Draggable node with edit/color picker
│   │       └── WBToolbar.tsx             # Tool selector + zoom controls
│   │
│   └── lib/                              # 10 shared utilities and providers
│       ├── api.ts                        # 20+ REST API endpoint wrappers
│       ├── types.ts                      # Core TypeScript interfaces (13 types)
│       ├── use-sse.ts                    # SSE streaming React hook
│       ├── sse-manager.ts                # Global SSE session persistence singleton
│       ├── theme-context.tsx             # ThemeProvider + useTheme hook
│       ├── canvas-context.tsx            # CanvasProvider + useCanvas hook
│       ├── chat-context.tsx              # Chat-level context (model, etc.)
│       ├── format.ts                     # Token, cost, time, byte formatters
│       ├── prose.ts                      # Shared Tailwind prose class strings
│       └── utils.ts                      # cn() — clsx + tailwind-merge utility
│
├── docs/
│   └── ARCHITECTURE.md                   # Detailed auto-generated architecture reference
├── demo/                                 # Demo content files
│   ├── poem.txt
│   ├── story.txt
│   └── tool_showcase.txt
├── tests/
│   └── test-example.md
├── package.json                          # forge-ui v0.1.0 — 16 dependencies
├── tsconfig.json                         # TypeScript 5 — strict, bundler resolution
├── next.config.ts                        # Turbopack enabled, root dir configured
├── components.json                       # shadcn/ui config (base-nova style, RSC)
├── eslint.config.mjs                     # ESLint 9 with next config
└── postcss.config.mjs                    # PostCSS with @tailwindcss/postcss
```

### Component Hierarchy

```
<html> (data-theme, dark/light class, font CSS vars)
└── <body>
    └── LayoutShell
        └── ThemeProvider
            └── CanvasProvider
                ├── SidebarWrapper
                │   └── Sidebar
                │       ├── ThemePicker
                │       ├── Thread list (with inline rename)
                │       ├── Pool list
                │       ├── Endless mode link
                │       ├── Explorer link
                │       └── Whiteboard link
                ├── <main> — [Page Content]
                │   ├── ChatInput / Composer
                │   ├── MessageBubble[]
                │   │   ├── StreamingText (with animated cursor)
                │   │   ├── ToolCallGroup[]
                │   │   │   └── ToolCall[] (collapsible)
                │   │   └── FileLink (in markdown → canvas)
                │   ├── ShardMenu (quick actions ◆)
                │   ├── ModelControls + ThinkingToggle
                │   ├── VerboseOutput (trace log modal)
                │   └── TokenBadge
                └── Canvas (slide-out panel, right side)
```

### Data Flow: Message Lifecycle

```
User types message in ChatInput or Composer
    ↓
onSend(content, model, thinkingBudget, effort)
    ↓
POST /threads/{id}/messages  →  { content, model?, thinking_budget?, effort? }
    ↓  (returns SSE ReadableStream)
sse-manager.ts opens reader, creates ActiveSession
    ↓
Server sends events:
  → "start"        { model }
  → "text_delta"   { text }           ← accumulates into TextSegment
  → "tool_start"   { id, name }      ← creates ToolSegment
  → "tool_end"     { id, output }    ← completes ToolSegment
  → "assistant"    { text, tool_calls, stop_reason }
  → "complete"     { input_tokens, output_tokens, cache_read_tokens }
  → "done"         { error? }
    ↓
use-sse.ts hook syncs from ActiveSession → component state
    ↓
StreamingText renders live segments[] with animated cursor
    ↓
Stream ends → segments committed to messages[] array
    ↓
MessageBubble renders final message with markdown, tool calls, file links
```

### SSE Streaming Pipeline

The streaming system uses a **segment-based architecture** that decouples the SSE reader from React lifecycle:

| Layer | File | Responsibility |
|-------|------|----------------|
| **Manager** | `sse-manager.ts` | Global singleton. Keeps SSE connections alive across React navigation. Prevents duplicate streams. Manages `ActiveSession` state with `segments[]`, `tokenStats`, `error`, `isStreaming`. Notifies registered listeners on state changes. |
| **Hook** | `use-sse.ts` | React bridge. Registers as a listener on the session manager. Syncs `segments[]` and `messages[]` to component state. Provides `sendMessage()` and `isStreaming` to consumers. |
| **Segments** | `StreamSegment` | Individual content blocks — `TextSegment` (accumulated text deltas) and `ToolSegment` (tool name, status, output). Displayed live during streaming, collapsed into a single `Message` on completion. |

This design means **navigation doesn't kill active streams** — if a user navigates away and returns, the session manager has continued accumulating results, and the hook syncs the current state.

### Context Providers

| Provider | File | What it provides |
|----------|------|------------------|
| `ThemeProvider` | `theme-context.tsx` | `theme` (ThemeId), `setTheme()`, `meta` (name, description, isDark, swatch) |
| `CanvasProvider` | `canvas-context.tsx` | `openFile()`, `closeCanvas()`, `isOpen`, `filePath`, `content`, `language` |
| Chat Context | `chat-context.tsx` | Model settings and chat-level state |

---

## ✦ Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Endless** | Persistent global chat thread (`__global__`) — the main interface with greeting |
| `/threads` | Thread List | Redirects to `/` (threads listed in sidebar) |
| `/threads/[id]` | **Thread Chat** | Individual thread conversation with full streaming support |
| `/threads/[id]/knowledge` | **Knowledge** | Archive browser (L0/L1/L2) + memory editor + shared context manager |
| `/pools` | Pool List | Redirects to `/` (pools listed in sidebar) |
| `/pools/[id]` | **Pool Detail** | Agent heartbeat grid, task counts, briefing document, shared context |
| `/explorer` | **Explorer** | Keyboard-driven filesystem browser with canvas integration |
| `/whiteboard` | **Whiteboard** | Infinite spatial canvas for organizing notes, headings, and file references |

---

## ✦ Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd> | Toggle Composer modal (full-screen input) |
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>O</kbd> | Toggle Verbose Output (tool trace log) |

### Chat Input & Composer

| Shortcut | Action |
|----------|--------|
| <kbd>Enter</kbd> | Send message |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Insert new line |
| <kbd>@</kbd> | Open file picker dropdown |
| <kbd>Escape</kbd> | Close file picker / close Composer |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate file picker results |
| <kbd>Tab</kbd> | Select file from picker |
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste screenshot from clipboard |

### Canvas (File Editor)

| Shortcut | Action |
|----------|--------|
| <kbd>Escape</kbd> | Close canvas panel |
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>S</kbd> | Save file to disk |

### File Explorer

| Shortcut | Action |
|----------|--------|
| <kbd>↓</kbd> / <kbd>j</kbd> | Move selection down |
| <kbd>↑</kbd> / <kbd>k</kbd> | Move selection up |
| <kbd>Tab</kbd> | Enter directory |
| <kbd>Enter</kbd> | Open file in canvas |
| <kbd>Backspace</kbd> | Navigate up one directory |

### Sidebar

| Shortcut | Action |
|----------|--------|
| <kbd>Enter</kbd> | Confirm thread rename |
| <kbd>Escape</kbd> | Cancel thread rename |

### Shard Menu

| Shortcut | Action |
|----------|--------|
| <kbd>Enter</kbd> | Submit custom prompt / search query |
| <kbd>Escape</kbd> | Cancel and close menu |

### Verbose Output

| Shortcut | Action |
|----------|--------|
| <kbd>Escape</kbd> | Close modal |

---

## ✦ Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 16.2.1 | App Router, Turbopack dev server, React Server Components |
| [React](https://react.dev/) | 19.2.4 | UI rendering with concurrent features |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Strict type safety across all source files |

### Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling with CSS-first configuration |
| [shadcn/ui](https://ui.shadcn.com/) | 4.1 | Base components (button, card, badge, tooltip, separator) |
| [Base UI](https://base-ui.com/) | 1.3 | Headless React primitives (peer dependency of shadcn/ui) |
| [Lucide React](https://lucide.dev/) | 0.577 | 1000+ icon library |
| [class-variance-authority](https://cva.style/) | 0.7 | Component variant system for shadcn/ui |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 3.5 | Intelligent Tailwind class merging via `cn()` utility |
| [tw-animate-css](https://github.com/magicuidesign/tw-animate-css) | 1.4 | Animation utility classes |

### Content Rendering

| Technology | Version | Purpose |
|------------|---------|---------|
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10.1 | Markdown → React component rendering |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | 4.0 | GitHub Flavored Markdown (tables, strikethrough, autolinks) |
| [rehype-highlight](https://github.com/rehypejs/rehype-highlight) | 7.0 | Code block syntax highlighting bridge |
| [highlight.js](https://highlightjs.org/) | 11.11 | Syntax highlighting engine (warm dark color scheme) |
| [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) | 0.5 | Prose styling for rendered markdown content |

### Fonts

| Font | CSS Variable | Usage |
|------|-------------|-------|
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | `--font-sans` | Primary sans-serif — headings, UI text, body |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | `--font-mono` | Monospace — code blocks, technical content, kbd |
| [Inter](https://rsms.me/inter/) | — | Variable font fallback via `@fontsource-variable/inter` |

---

## ✦ Component Reference

### Chat Components (11)

| Component | File | Description |
|-----------|------|-------------|
| `Composer` | `chat/Composer.tsx` | Full-screen modal input triggered by `Cmd+K` with file picker, model controls, screenshot paste (up to 5), and attached file badges |
| `ChatInput` | `chat/ChatInput.tsx` | Inline chat input bar at the bottom of thread views with `@` file mentions and auto-resize |
| `MessageBubble` | `chat/MessageBubble.tsx` | Renders a single user or assistant message with markdown, tool call groups, and file links |
| `StreamingText` | `chat/StreamingText.tsx` | Displays live SSE streaming content with animated cursor and segment-by-segment timeline |
| `ToolCall` | `chat/ToolCall.tsx` | Collapsible card showing a single tool invocation with status indicator (spinning/✓/✗) |
| `ToolCallGroup` | `chat/ToolCallGroup.tsx` | Groups consecutive tool calls with auto-expand for the currently active call |
| `FileLink` | `chat/FileLink.tsx` | Detects file paths in rendered markdown and makes them clickable — opens in canvas panel |
| `FilePickerDropdown` | `chat/FilePickerDropdown.tsx` | Autocomplete dropdown for `@` file mentions with keyboard navigation (↑/↓/Tab) |
| `ModelControls` | `chat/ModelControls.tsx` | Model picker dropdown (Opus / Sonnet / Haiku) with descriptive labels |
| `ShardMenu` | `chat/ShardMenu.tsx` | Quick-action dropdown (◆) with preset prompts, codebase search mode, and knowledge save mode |
| `VerboseOutput` | `chat/VerboseOutput.tsx` | Full tool trace log modal with copy-to-clipboard functionality |

### Canvas Components (1)

| Component | File | Description |
|-----------|------|-------------|
| `Canvas` | `canvas/Canvas.tsx` | Slide-out right panel — file viewer/editor with syntax highlighting, markdown preview toggle, and `Cmd+S` save |

### Whiteboard Components (3)

| Component | File | Description |
|-----------|------|-------------|
| `WhiteboardCanvas` | `whiteboard/WhiteboardCanvas.tsx` | Infinite pannable/zoomable canvas with dot grid background and click-to-place nodes |
| `WBNodeCard` | `whiteboard/WBNodeCard.tsx` | Individual draggable node (note/heading/file) with inline editing and 6-color picker |
| `WBToolbar` | `whiteboard/WBToolbar.tsx` | Floating toolbar — tool type selector (select/note/heading/file) and zoom controls (+/−/reset) |

### Knowledge Components (3)

| Component | File | Description |
|-----------|------|-------------|
| `ArchiveEntry` | `knowledge/ArchiveEntry.tsx` | Renders an L0/L1/L2 archive entry with markdown content in a styled card |
| `MemoryEditor` | `knowledge/MemoryEditor.tsx` | Inline editor for persistent agent memory entries with save/delete |
| `SharedContextEditor` | `knowledge/SharedContextEditor.tsx` | Editor for shared context files with content editing, save, and delete |

### Pool Components (3)

| Component | File | Description |
|-----------|------|-------------|
| `HeartbeatGrid` | `pools/HeartbeatGrid.tsx` | Color-coded grid of agent heartbeats with status, current task, and token count |
| `PoolCard` | `pools/PoolCard.tsx` | Summary card showing pool stats — agent count, pending tasks, completed tasks |
| `SharedContext` | `pools/SharedContext.tsx` | Renders pool-level shared context contributed by multiple agents |

### UI Components (14)

| Component | File | Description |
|-----------|------|-------------|
| `LayoutShell` | `ui/LayoutShell.tsx` | Root provider wrapper — composes ThemeProvider + CanvasProvider + Canvas panel |
| `Sidebar` | `ui/Sidebar.tsx` | Main navigation — threads, pools, Endless mode, explorer, whiteboard links |
| `SidebarWrapper` | `ui/SidebarWrapper.tsx` | Manages collapsible sidebar state (open/collapsed) |
| `ThemePicker` | `ui/ThemePicker.tsx` | Dropdown with 4 theme swatches, names, and descriptions |
| `TokenBadge` | `ui/TokenBadge.tsx` | Compact token count display (input/output/cache) + estimated USD cost |
| `StatusDot` | `ui/StatusDot.tsx` | Animated color-coded status indicator (idle → yellow, working → green, error → red) |
| `button` | `ui/button.tsx` | shadcn/ui button — variants: default, destructive, outline, secondary, ghost, link |
| `badge` | `ui/badge.tsx` | shadcn/ui badge — variants: default, secondary, destructive, outline |
| `card` | `ui/card.tsx` | shadcn/ui card — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `separator` | `ui/separator.tsx` | shadcn/ui separator (horizontal/vertical) |
| `tooltip` | `ui/tooltip.tsx` | shadcn/ui tooltip (provider, trigger, content) |
| `ShardIcon` | `ui/ShardIcon.tsx` | Custom ◆ diamond SVG icon (the Forge brand mark) |
| `FolderIcon` | `ui/FolderIcon.tsx` | Custom folder SVG icon with open/closed states |
| `InfinityIcon` | `ui/InfinityIcon.tsx` | Custom ∞ infinity SVG icon for Endless mode |

### Files Components (1)

| Component | File | Description |
|-----------|------|-------------|
| `FileExplorer` | `files/FileExplorer.tsx` | Compact file tree dropdown used in chat headers for quick file browsing |

---

## ✦ API Layer

All backend communication is centralized in `src/lib/api.ts`, wrapping 20+ REST endpoints against the Forge backend:

### Threads

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `listThreads()` | `GET` | `/threads` | List all threads |
| `getThread(id)` | `GET` | `/threads/:id` | Get thread detail (with archive info) |
| `createThread(opts?)` | `POST` | `/threads` | Create new thread (optional id, model, working_dir) |
| `deleteThread(id)` | `DELETE` | `/threads/:id` | Delete a thread |
| `renameThread(id, newId)` | `PATCH` | `/threads/:id` | Rename a thread |

### Messages & Streaming

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getMessages(threadId)` | `GET` | `/threads/:id/messages` | Get message history |
| `postMessage(threadId, content, model?, thinkingBudget?, effort?)` | `POST` | `/threads/:id/messages` | Send message → returns SSE stream |

### Archives & Memories

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getArchives(threadId)` | `GET` | `/threads/:id/archives` | Get L0/L1/L2 archives |
| `getMemories(threadId)` | `GET` | `/threads/:id/memories` | List memory entries |
| `updateMemory(threadId, name, content)` | `PUT` | `/threads/:id/memories/:name` | Create/update a memory |

### Shared Context

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `listSharedContext(threadId)` | `GET` | `/threads/:id/shared` | List shared context entries |
| `updateSharedContext(threadId, name, content)` | `PUT` | `/threads/:id/shared/:name` | Create/update context entry |
| `deleteSharedContext(threadId, name)` | `DELETE` | `/threads/:id/shared/:name` | Delete context entry |
| `uploadSharedContext(threadId, file)` | `POST` | `/threads/:id/shared` | Upload file as shared context (multipart) |

### Pools

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `listPools()` | `GET` | `/pools` | List all agent pools |
| `getPool(id)` | `GET` | `/pools/:id` | Get pool detail (heartbeats, tasks, briefing) |

### Files

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `readFile(path)` | `GET` | `/files?path=:path` | Read file content with language detection |
| `writeFile(path, content)` | `PUT` | `/files` | Write/update file content |

---

## ✦ Type System

Core TypeScript interfaces defined in `src/lib/types.ts`:

```typescript
// Thread management
ThreadInfo          // id, created, last_active, model, provider, working_dir, token counts
ThreadDetail        // extends ThreadInfo + archive info + messages_bytes
CreateThreadOpts    // optional: id, model, working_dir

// Messages
Message             // role (user|assistant), content (string | ContentBlock[])
ContentBlock        // type, text?, id?, name?, input?, content?, is_error?

// Knowledge
Archives            // l2 (string|null), l1 ({name, content}[]), l0 ({id, content}[])
Memory              // name, content

// Pools
PoolInfo            // id, agent_count, pending_tasks, completed_tasks
PoolDetail          // id, briefing, shared_context, heartbeats, tasks
HeartbeatEntry      // agent, task?, tokens?, status?, ts?

// SSE Events (6 types)
SseStartEvent       // { type: 'start', model }
SseTextDeltaEvent   // { type: 'text_delta', text }
SseAssistantEvent   // { type: 'assistant', text, model, stop_reason, tool_calls }
SseToolEvent        // { type: 'tool_start'|'tool_end', id, name, is_error?, output? }
SseCompleteEvent    // { type: 'complete', input_tokens, output_tokens, cache_read_tokens }
SseDoneEvent        // { type: 'done', error? }

// Aggregated
TokenStats          // input_tokens, output_tokens, cache_read_tokens
```

---

## ✦ Utility Functions

Defined in `src/lib/format.ts`:

| Function | Example | Description |
|----------|---------|-------------|
| `formatTokens(n)` | `12400` → `"12.4k"` | Compact token count display |
| `estimateCost(model, in, out, cache)` | — | USD cost from token counts + model pricing |
| `formatCost(usd)` | `0.082` → `"$0.082"` | Dollar string with appropriate precision |
| `shortModel(id)` | `"claude-opus-4-6"` → `"opus-4.6"` | Compact model display name |
| `timeAgo(iso)` | `"2024-01-15T..."` → `"3h ago"` | Human-readable relative time |
| `formatBytes(n)` | `1234567` → `"1.2 MB"` | Human-readable file size |
| `cn(...inputs)` | — | `clsx()` + `twMerge()` class utility |

---

## ✦ Configuration

### shadcn/ui (`components.json`)

```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "iconLibrary": "lucide",
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
```

### TypeScript (`tsconfig.json`)

- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **Strict**: enabled
- **Path alias**: `@/*` → `./src/*`
- **Plugins**: Next.js type augmentation

### Turbopack (`next.config.ts`)

Next.js 16 Turbopack is enabled by default for development with explicit `root: __dirname` configuration.

---

## ✦ Design System

### Glassmorphism Classes

| Class | Background | Blur | Border | Use case |
|-------|------------|------|--------|----------|
| `.glass` | `rgba(255,255,255,0.05)` | `20px` | `rgba(255,255,255,0.08)` | Standard panels, cards |
| `.glass-strong` | `rgba(255,255,255,0.08)` | `30px` | `rgba(255,255,255,0.1)` | Emphasized containers |
| `.glass-input` | `rgba(255,255,255,0.07)` | `16px` | `rgba(255,255,255,0.08)` | Input fields, textareas |

### Glow Effects

| Class | Effect |
|-------|--------|
| `.glow-accent` | `box-shadow: 0 0 20px rgba(accent, 0.1)` |
| `.glow-accent-strong` | `box-shadow: 0 0 30px rgba(accent, 0.15), 0 0 60px rgba(accent, 0.05)` |

### Animation Classes

| Class | Animation | Duration |
|-------|-----------|----------|
| `.animate-fade-in-up` | Fade in + translate Y 8px → 0 | 300ms |
| `.animate-fade-in` | Simple opacity 0 → 1 | 200ms |
| `.animate-slide-left` | Slide from left 6px | 250ms |
| `.animate-slide-right` | Slide from right 6px | 250ms |
| `.animate-expand` | Expand height 0 → 500px | 200ms |
| `.animate-shimmer` | Shimmer gradient sweep | 2s infinite |

### Ultrathink Mode

When thinking budget ≥ 50,000 tokens, a special rainbow gradient mode activates:

- `.ultrathink-badge` — Rainbow gradient background with 3s animation cycle
- `.ultrathink-text` — Rainbow gradient text via `background-clip: text`
- `.ultrathink-bg` — Subtle rainbow tinted background

---

## ✦ Model Pricing

Built-in cost estimation for supported models:

| Model | Input (per 1M) | Output (per 1M) | Cache Read (per 1M) |
|-------|----------------|------------------|---------------------|
| Claude Opus 4 | $15.00 | $75.00 | $1.50 |
| Claude Sonnet 4 | $3.00 | $15.00 | $0.30 |
| Claude Haiku 4.5 | $0.80 | $4.00 | $0.08 |
| GPT-4o | $5.00 | $15.00 | $2.50 |
| GPT-4o Mini | $0.15 | $0.60 | $0.075 |

Unknown models default to Sonnet-level pricing.

---

## ✦ Scripts

```bash
npm run dev      # Start dev server with Turbopack (port 3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint 9
```

---

## ✦ Further Reading

- **[Architecture Document](docs/ARCHITECTURE.md)** — detailed auto-generated architecture reference covering data flow, SSE pipeline, theme system, and key patterns
- **[AGENTS.md](AGENTS.md)** — agent instructions for code generation (Next.js 16 specific guidance)

---

<div align="center">

**◆ Forge UI** — Built with Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript 5

*~5,400 lines of code · 35 components · 8 routes · 4 themes · 20+ API endpoints*

</div>

<div align="center">

# ◆ Forge UI

**The web interface for the Forge agent platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

<br/>

A real-time streaming chat UI, infinite whiteboard, file explorer, knowledge management system, and multi-agent pool monitor — all in one interface.

<br/>

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Keyboard Shortcuts](#-keyboard-shortcuts) · [Tech Stack](#-tech-stack)

</div>

---

## ✦ What is Forge UI?

Forge UI is a Next.js web frontend for the **Forge agent platform** — a system for managing AI agent threads, pools, and shared knowledge. It connects to the Forge backend API (default: `localhost:3142`) and provides a rich, keyboard-driven interface for:

- **Conversing** with AI agents via real-time Server-Sent Events streaming
- **Managing threads** — isolated agent conversations with full history
- **Monitoring agent pools** — multi-agent orchestration with live heartbeats
- **Editing files** — slide-out canvas with syntax highlighting
- **Organizing ideas** — infinite spatial whiteboard with drag, pan, and zoom
- **Browsing knowledge** — three-tier archive system (L0/L1/L2) with memory editing

---

## ✦ Features

### 💬 Endless Chat & Threads

- **Endless mode** — a persistent global chat thread (`__global__`) that lives forever
- **Named threads** — create isolated conversations with independent context
- **Real-time streaming** — SSE-based response streaming with live cursor animation
- **Segment timeline** — watch tool calls and text blocks appear in real-time
- **Token tracking** — live input/output/cache token counts with cost estimation
- **Model switching** — swap between Claude Opus, Sonnet, Haiku, GPT-4o, and more mid-conversation
- **Thinking budget** — configurable extended thinking with adjustable token budget
- **File mentions** — type `@` to autocomplete file paths from the project filesystem
- **Screenshot attachment** — paste or attach images directly into messages
- **Markdown rendering** — full GFM support with syntax-highlighted code blocks

### 🖼️ Canvas (File Editor)

- **Slide-out panel** — opens from the right side without leaving the chat
- **Syntax highlighting** — powered by highlight.js with language auto-detection
- **Markdown preview** — toggle between source and rendered markdown view
- **Live editing** — edit files in-place and save with `Cmd+S`
- **Auto-refresh** — canvas updates automatically when the AI edits the open file
- **File path detection** — clickable file paths in AI responses open directly in canvas

### 🎨 Whiteboard

- **Infinite canvas** — pan and zoom with mouse drag and scroll wheel
- **Node types** — notes, headings, and file references
- **Color coding** — customizable node background colors
- **Grid background** — subtle dot grid that scales with zoom
- **localStorage persistence** — whiteboard state survives page reloads
- **Double-click to create** — add new nodes anywhere on the canvas

### 📂 File Explorer

- **Full filesystem browser** — navigate the project directory tree
- **Keyboard-driven** — Vim-style `j/k` navigation, `Tab` to enter, `Backspace` to go up
- **File sizes** — human-readable byte formatting (B / KB / MB)
- **Download support** — download any file directly to your machine
- **Canvas integration** — press `Enter` to open a file in the slide-out editor

### 🧠 Knowledge Management

- **Three-tier archive system:**
  - **L0** — Operation-level logs (short-term memory)
  - **L1** — Session summaries (mid-term memory)
  - **L2** — Epoch summaries (long-term memory)
- **Memory editor** — edit persistent agent personality/instructions (CLAUDE.md-style)
- **Shared context** — upload and manage files as agent context
- **Inline composer** — interact with the agent directly from the knowledge page

### 🏊 Agent Pools

- **Pool monitoring** — view active agent pools with task counts
- **Heartbeat grid** — real-time agent status with color-coded indicators
- **Shared context viewer** — see context shared across pool agents
- **Markdown briefings** — pool briefing documents rendered with full GFM
- **Auto-polling** — pool data refreshes every 5 seconds

### 🎨 Theming

Four built-in themes with instant switching:

| Theme | Description | Swatch |
|-------|-------------|--------|
| **Ember Dark** | Warm amber on dark stone | 🟠 |
| **Verdant Dark** | Terminal green on dark | 🟢 |
| **Ember Light** | Warm amber on cream | 🟡 |
| **Verdant Light** | Fresh green on white | 🌿 |

Themes persist via `localStorage` and apply via CSS custom properties + `data-theme` attribute.

### ⚡ Additional Features

- **Shard Menu** — quick actions (explain, refactor, test, fix, document) with custom prompts
- **Verbose Output** — full tool-call trace log with copy-to-clipboard (`Cmd+O`)
- **Token Badge** — compact display of token usage and estimated cost per conversation
- **Status Dots** — color-coded agent status indicators (idle, working, error)
- **Glassmorphism UI** — semi-transparent backgrounds with backdrop blur throughout
- **Collapsible sidebar** — thread and pool navigation with inline rename support
- **Cost estimation** — per-model pricing for Claude Opus/Sonnet/Haiku, GPT-4o, GPT-4o-mini
- **Time-of-day greeting** — the landing page greets you based on the current time

---

## ✦ Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Forge backend** running on `localhost:3142` (or set `NEXT_PUBLIC_FORGE_API`)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd forge-ui

# Configure environment
cp .env.example .env.local

# Install dependencies
npm install
```

### Development

```bash
# Start the development server (Turbopack enabled)
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

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_FORGE_API` | `http://localhost:3142` | Forge backend API URL |

Copy `.env.example` to `.env.local` and adjust as needed. The backend is [rofld/forge](https://github.com/rofld/forge) — start it with `forge serve --port 3142`.

---

## ✦ Architecture

### Directory Structure

```
src/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout — fonts, providers, sidebar
│   ├── page.tsx                      # Landing — Endless mode (global chat)
│   ├── globals.css                   # Theme vars, glass utilities, syntax colors
│   ├── explorer/page.tsx             # Keyboard-driven file browser
│   ├── whiteboard/page.tsx           # Infinite spatial canvas
│   ├── pools/
│   │   ├── page.tsx                  # Pool list (redirects to /)
│   │   └── [id]/page.tsx            # Pool detail — heartbeats, context
│   └── threads/
│       ├── page.tsx                  # Thread list (redirects to /)
│       └── [id]/
│           ├── page.tsx              # Thread chat view
│           └── knowledge/page.tsx    # Archives, memories, shared context
│
├── components/
│   ├── canvas/Canvas.tsx             # Slide-out file viewer/editor panel
│   ├── chat/                         # Chat interface components
│   │   ├── ChatInput.tsx             # Inline input with @ file picker
│   │   ├── Composer.tsx              # Modal composer (Cmd+K)
│   │   ├── MessageBubble.tsx         # Message rendering with tool calls
│   │   ├── StreamingText.tsx         # Live streaming with segment timeline
│   │   ├── ToolCall.tsx              # Individual tool call card
│   │   ├── ToolCallGroup.tsx         # Grouped tool call container
│   │   ├── FileLink.tsx              # Clickable file paths → canvas
│   │   ├── FilePickerDropdown.tsx    # @ mention autocomplete
│   │   ├── ModelControls.tsx         # Model selector + thinking budget
│   │   ├── ShardMenu.tsx             # Quick action menu
│   │   └── VerboseOutput.tsx         # Full tool trace modal
│   ├── files/FileExplorer.tsx        # Compact file tree dropdown
│   ├── knowledge/                    # Knowledge management
│   │   ├── ArchiveEntry.tsx          # L0/L1/L2 archive card
│   │   ├── MemoryEditor.tsx          # Memory inline editor
│   │   └── SharedContextEditor.tsx   # Context file editor
│   ├── pools/                        # Pool monitoring
│   │   ├── HeartbeatGrid.tsx         # Real-time agent status grid
│   │   ├── PoolCard.tsx              # Pool summary card
│   │   └── SharedContext.tsx         # Pool shared context viewer
│   ├── ui/                           # Base UI components
│   │   ├── LayoutShell.tsx           # App shell with providers
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── SidebarWrapper.tsx        # Collapsible sidebar state
│   │   ├── ThemePicker.tsx           # 4-theme selector dropdown
│   │   ├── TokenBadge.tsx            # Token/cost display
│   │   ├── StatusDot.tsx             # Agent status indicator
│   │   ├── badge.tsx                 # shadcn/ui badge
│   │   ├── button.tsx                # shadcn/ui button
│   │   ├── card.tsx                  # shadcn/ui card
│   │   ├── separator.tsx             # shadcn/ui separator
│   │   ├── tooltip.tsx               # shadcn/ui tooltip
│   │   └── *Icon.tsx                 # Custom SVG icons
│   └── whiteboard/                   # Whiteboard components
│       ├── WhiteboardCanvas.tsx      # Pannable/zoomable infinite canvas
│       ├── WBNodeCard.tsx            # Draggable node with edit/color
│       └── WBToolbar.tsx             # Tool selector + zoom controls
│
└── lib/                              # Shared utilities
    ├── api.ts                        # 20+ REST API endpoint functions
    ├── types.ts                      # Core TypeScript interfaces
    ├── use-sse.ts                    # SSE streaming React hook
    ├── sse-manager.ts                # Global SSE session persistence
    ├── theme-context.tsx             # Theme provider + context
    ├── canvas-context.tsx            # Canvas provider + context
    ├── format.ts                     # Token, cost, time, byte formatters
    ├── prose.ts                      # Shared Tailwind prose classes
    └── utils.ts                      # cn() class merge utility
```

### Component Hierarchy

```
RootLayout
└── ThemeProvider
    └── CanvasProvider
        └── SidebarWrapper
            ├── Sidebar
            │   ├── ThemePicker
            │   ├── Thread list (with inline rename)
            │   └── Pool list
            ├── LayoutShell
            │   └── [Page Content]
            │       ├── ChatInput / Composer
            │       ├── MessageBubble[]
            │       │   ├── StreamingText
            │       │   ├── ToolCallGroup → ToolCall[]
            │       │   └── FileLink (in markdown)
            │       ├── ShardMenu
            │       ├── VerboseOutput
            │       └── TokenBadge
            └── Canvas (slide-out panel)
```

### Data Flow: Message Lifecycle

```
User types message
    ↓
ChatInput/Composer → onSend callback
    ↓
POST /threads/{id}/messages (creates user message)
    ↓
useSSE hook opens SSE stream → GET /threads/{id}/stream
    ↓
Server sends events: content_block_start → content_block_delta → content_block_stop
    ↓
Live segments[] accumulate (displayed by StreamingText)
    ↓
Stream ends → segments committed to messages[] array
    ↓
MessageBubble renders final message with markdown + tool calls
```

### SSE Streaming Pipeline

The streaming system uses a **segment-based architecture** that separates live streaming state from committed message history:

- **`sse-manager.ts`** — Global singleton that keeps SSE connections alive across React navigation. Prevents duplicate streams and manages session lifecycle.
- **`use-sse.ts`** — React hook that bridges the SSE manager to component state. Maintains `segments[]` for live content and `messages[]` for committed history.
- **Segments** — Individual content blocks (text, tool_use, tool_result) that accumulate during streaming and collapse into a single message on completion.

### API Layer

All backend communication goes through `src/lib/api.ts`, which wraps 20+ REST endpoints:

| Category | Endpoints |
|----------|-----------|
| **Threads** | List, get, create, rename, delete |
| **Messages** | List messages, post message, stream SSE |
| **Files** | List directory, read file, write file |
| **Archives** | Get L0/L1/L2 archives per thread |
| **Memories** | List, save, delete memories |
| **Shared Context** | List, upload, delete context files |
| **Pools** | List pools, get pool detail |

---

## ✦ Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Toggle Composer modal |
| `Cmd/Ctrl + O` | Toggle Verbose Output (tool trace log) |

### Chat Input & Composer

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | Insert new line |
| `@` | Open file picker dropdown |
| `Escape` | Close file picker / close Composer |
| `↑` / `↓` | Navigate file picker results |
| `Tab` | Select file from picker |

### Canvas (File Editor)

| Shortcut | Action |
|----------|--------|
| `Escape` | Close canvas panel |
| `Cmd/Ctrl + S` | Save file |

### File Explorer

| Shortcut | Action |
|----------|--------|
| `↓` / `j` | Move selection down |
| `↑` / `k` | Move selection up |
| `Tab` | Enter directory |
| `Enter` | Open file in canvas |
| `Backspace` | Navigate up one directory |

### Sidebar

| Shortcut | Action |
|----------|--------|
| `Enter` | Confirm thread rename |
| `Escape` | Cancel thread rename |

### Shard Menu

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit custom prompt |
| `Escape` | Cancel custom prompt |

### Verbose Output

| Shortcut | Action |
|----------|--------|
| `Escape` | Close modal |

---

## ✦ Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 16.2 | App Router, Turbopack, RSC |
| [React](https://react.dev/) | 19.2 | UI rendering with concurrent features |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety throughout |

### Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | 4.1 | Base UI components (button, card, badge, tooltip) |
| [Base UI](https://base-ui.com/) | 1.3 | Headless React primitives |
| [Lucide React](https://lucide.dev/) | 0.577 | Icon library |
| [class-variance-authority](https://cva.style/) | 0.7 | Component variant system |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 3.5 | Intelligent class merging |
| [tw-animate-css](https://github.com/magicuidesign/tw-animate-css) | 1.4 | Animation utilities |

### Content Rendering

| Technology | Version | Purpose |
|------------|---------|---------|
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10.1 | Markdown → React rendering |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | 4.0 | GitHub Flavored Markdown (tables, strikethrough) |
| [rehype-highlight](https://github.com/rehypejs/rehype-highlight) | 7.0 | Code block syntax highlighting |
| [highlight.js](https://highlightjs.org/) | 11.11 | Syntax highlighting engine |
| [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) | 0.5 | Prose styling for rendered content |

### Fonts

| Font | Usage |
|------|-------|
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | Sans-serif — headings, UI text |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Monospace — code, technical content |
| [Inter](https://rsms.me/inter/) | Variable — body text |

---

## ✦ Component Reference

### Chat Components (11)

| Component | Description |
|-----------|-------------|
| `Composer` | Full-screen modal input triggered by `Cmd+K` with file picker, model controls, screenshot paste |
| `ChatInput` | Inline chat input bar with `@` file mentions and model selector |
| `MessageBubble` | Renders a single message with markdown, tool calls, and file links |
| `StreamingText` | Displays live SSE streaming with animated cursor and segment timeline |
| `ToolCall` | Collapsible card showing a single tool invocation with status indicator |
| `ToolCallGroup` | Groups consecutive tool calls with auto-expand for active calls |
| `FileLink` | Detects file paths in markdown and makes them clickable → opens in canvas |
| `FilePickerDropdown` | Autocomplete dropdown for `@` file mentions with keyboard navigation |
| `ModelControls` | Model picker (Opus/Sonnet/Haiku/GPT-4o) + thinking budget slider |
| `ShardMenu` | Quick-action dropdown (explain, refactor, test, fix, document, custom) |
| `VerboseOutput` | Full tool trace log modal with copy-to-clipboard |

### Whiteboard Components (3)

| Component | Description |
|-----------|-------------|
| `WhiteboardCanvas` | Infinite pannable/zoomable canvas with grid background |
| `WBNodeCard` | Individual draggable node (note/heading/file) with color picker |
| `WBToolbar` | Toolbar with node type selector and zoom controls |

### Knowledge Components (3)

| Component | Description |
|-----------|-------------|
| `ArchiveEntry` | Renders an L0/L1/L2 archive entry with markdown content |
| `MemoryEditor` | Inline editor for persistent agent memory entries |
| `SharedContextEditor` | Editor for shared context files with save/delete |

### Pool Components (3)

| Component | Description |
|-----------|-------------|
| `HeartbeatGrid` | Color-coded grid of agent heartbeats with status and task info |
| `PoolCard` | Summary card showing pool stats (agents, pending, completed) |
| `SharedContext` | Renders pool-level shared context from multiple agents |

### UI Components (14)

| Component | Description |
|-----------|-------------|
| `LayoutShell` | Root provider wrapper (theme + canvas contexts) |
| `Sidebar` | Main navigation — threads, pools, Endless mode, explorer links |
| `SidebarWrapper` | Manages collapsible sidebar state |
| `ThemePicker` | Dropdown with 4 theme swatches and descriptions |
| `TokenBadge` | Compact token count (input/output/cache) + cost display |
| `StatusDot` | Animated color-coded status indicator (idle/working/error) |
| `Canvas` | Slide-out file viewer/editor with syntax highlighting + markdown preview |
| `FileExplorer` | Compact file tree dropdown for chat header |
| `button` | shadcn/ui button with variants |
| `badge` | shadcn/ui badge |
| `card` | shadcn/ui card (header, title, content, footer) |
| `separator` | shadcn/ui separator |
| `tooltip` | shadcn/ui tooltip |
| `*Icon` | Custom SVG icons (Shard ◆, Folder 📁, Infinity ∞) |

---

## ✦ Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Endless | Persistent global chat thread — the main interface |
| `/threads/[id]` | Thread | Individual thread conversation view |
| `/threads/[id]/knowledge` | Knowledge | Archive browser + memory editor + shared context |
| `/pools/[id]` | Pool Detail | Agent heartbeats, tasks, briefing, shared context |
| `/explorer` | Explorer | Keyboard-driven filesystem browser |
| `/whiteboard` | Whiteboard | Infinite spatial canvas for organizing ideas |

---

## ✦ Configuration

### shadcn/ui

Configured with `base-nova` style, RSC enabled, Lucide icons, neutral base color, and CSS variables. Component aliases:

```json
{
  "components": "@/components",
  "ui": "@/components/ui",
  "lib": "@/lib",
  "hooks": "@/hooks",
  "utils": "@/lib/utils"
}
```

### Turbopack

Next.js 16 Turbopack is enabled for development with explicit root directory configuration.

### Fonts

Loaded via Google Fonts (Space Grotesk + JetBrains Mono) with `@fontsource-variable/inter` as a fallback.

---

## ✦ Scripts

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## ✦ Further Reading

- **[Architecture Document](docs/ARCHITECTURE.md)** — detailed 600+ line auto-generated architecture reference covering data flow, SSE pipeline, theme system, and key patterns
- **[AGENTS.md](AGENTS.md)** — agent instructions for code generation

---

<div align="center">

**◆ Forge UI** — Built with Next.js 16, React 19, and Tailwind CSS 4

</div>

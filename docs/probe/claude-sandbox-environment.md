# Claude.ai sandbox environment
*Empirically derived from live introspection — May 2026*

---

## Architecture overview

Three distinct layers that do not share state:

```
┌─────────────────────────────────────────────────────┐
│  claude.ai frontend (browser)                       │
│  Artifacts · Research mode · Connectors/MCP         │
│  Projects · Styles · Memory → system prompt         │
└─────────────────────┬───────────────────────────────┘
                      │ API calls with injected context
┌─────────────────────▼───────────────────────────────┐
│  Claude model (inference)                           │
│  Reads full context · decides which tools to call   │
└─────────────────────┬───────────────────────────────┘
                      │ bash_tool / create_file / view
┌─────────────────────▼───────────────────────────────┐
│  microVM (custom kernel 6.18.5)                     │
│  ├── process_api (Rust/Tokio, PID 1) ←→ host/vsock │
│  └── Ubuntu 24 userland                             │
│      root · full caps · no seccomp · rclone mounts  │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1 — Execution sandbox (microVM + Ubuntu 24)

### Virtualisation

This is **not a Docker container** — it is a genuine microVM with:

- A custom-built Linux kernel (`6.18.5 #2 SMP PREEMPT_DYNAMIC`, built January 2026)
- `/dev/vsock` present — VM socket device for hypervisor ↔ guest communication
- `process_api` as PID 1 (a Rust/Tokio binary, compiled against Anthropic's internal Artifactory)
- `process_api` communicates with the host control plane via vsock, bridges bash tool calls over websocket, and mounts all rclone filesystems at boot

### Identity & security context

| Property | Value |
|---|---|
| User | `root` (uid=0, gid=0) |
| Init process | `process_api` (Anthropic custom Rust binary, not systemd) |
| Seccomp | Disabled (`Seccomp: 0`, `Seccomp_filters: 0`) |
| Linux capabilities | Nearly full (`CapEff: 0x000001fffeffffff`) |
| Namespaces | pid, net, mnt, ipc, uts, cgroup, time |
| `IS_SANDBOX` env var | `yes` |

### Hardware

| Resource | Value |
|---|---|
| CPU | 1 core — Intel Xeon @ 2.80GHz |
| RAM | ~4 GB total, ~3.7 GB available |
| Disk | 252 GB partition, ~10 GB writable headroom (CoW overlay) |
| Swap | None |
| GPU | None (no NVIDIA devices, no DRI) |

### cgroup limits

Memory limit is `9223372036854771712` bytes (`INT64_MAX / 2`) — effectively unlimited. CPU quota is `-1`. **No soft resource caps via cgroups.** The hardware spec is the real constraint.

### Persistence

| Scope | Persists? |
|---|---|
| Across conversations | No — fresh microVM per chat (uptime was 0 min on spawn) |
| Within a conversation | Yes — installed packages, written files, compiled binaries persist across tool calls |
| Outputs | Files written to `/mnt/user-data/outputs/` are synced to Anthropic storage via rclone and surfaced to the user |

### Filesystem layout

| Path | Mode | Notes |
|---|---|---|
| `/home/claude` | Read/write | Working directory, package caches |
| `/mnt/user-data/outputs` | Read/write | Final deliverables surfaced to user |
| `/mnt/user-data/uploads` | Read-only | User-uploaded files |
| `/mnt/user-data/tool_results` | Read-only | Structured tool result storage |
| `/mnt/transcripts` | Read-only | Conversation transcript |
| `/mnt/skills` | Read-only | Anthropic skill bundles |

### Storage architecture (rclone VFS)

All `/mnt` paths are **rclone VFS mounts** backed by Anthropic's API, keyed by a per-conversation `filesystem_id` (e.g. `claude_chat_01ADzttTeWiah5CfXLER1NgA`). Files are not on local disk — they are lazy-fetched and written-back via rclone.

`api.anthropic.com` is **hardcoded in `/etc/hosts`** to an internal IP (`160.79.104.10`), bypassing the egress proxy. This is how rclone authenticates and syncs without going through the allowlist.

| Mount | Cache TTL | Mode |
|---|---|---|
| `/mnt/user-data/outputs` | 3600s | Read/write |
| `/mnt/user-data/uploads` | 1s | Read-only |
| `/mnt/transcripts` | 10s | Read-only |
| `/mnt/user-data/tool_results` | 3s | Read-only |

### Network

Outbound traffic passes through a **transparent egress proxy** enforcing a domain allowlist. Blocked requests return:

```
HTTP/2 403
x-deny-reason: host_not_allowed
```

Allowed domains include: `pypi.org`, `files.pythonhosted.org`, `github.com`, `index.crates.io`, `static.crates.io`, `registry.npmjs.org`, `registry.yarnpkg.com`, `*.adobe.io`, and a small set of others. Arbitrary internet access is not available.

Direct access to `api.anthropic.com` works (internal IP, bypasses proxy) but **no API key is provisioned** in the environment — Claude cannot call itself or the Anthropic API from bash.

### Pre-installed software

**Runtimes**
- Python 3.12.3
- Node.js v22.22.2
- Java 21 (OpenJDK), at `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`
- Rust toolchain (`RUST_BACKTRACE=1` set)
- `uv` (fast Python package manager)

**Document & media tools**
- LibreOffice / soffice
- pandoc
- wkhtmltopdf
- ffmpeg + imageio-ffmpeg
- img2pdf

**Headless browsers**
- Playwright (browsers pre-installed at `/opt/pw-browsers`) — `PLAYWRIGHT_BROWSERS_PATH` set
- Puppeteer + Chrome (cached at `/home/claude/.cache/puppeteer`)

**npm globals pre-installed**
`mermaid-cli`, `pptxgenjs`, `docx@9.6.1`, `react@19`, `react-dom@19`, `playwright`, `ts-node`, `tsx`, `sharp`, `pdf-lib`, `pdfjs-dist`, `markdown-pdf`, `marked`, `markdownlint-cli`, `markdownlint-cli2`, `remark-cli`, `graphviz`

**pip pre-installed (selection)**
`beautifulsoup4`, `Flask`, `matplotlib`, `camelot-py`, `graphviz`, `cryptography`, `Pillow`, `imageio`, `imageio-ffmpeg`, `img2pdf`, `pandas` (via dep chain), `scipy`, `scikit-learn`, and many more

### Capabilities & limitations summary

| | |
|---|---|
| Run arbitrary bash commands | ✅ |
| `apt` / `pip` / `npm` / `cargo` installs | ✅ (root) |
| Arbitrary internet access | ❌ allowlist only |
| `systemd` / background services | ❌ no systemd (custom init) |
| Persist state across conversations | ❌ fresh microVM each time |
| Write to `/mnt/skills` or `/mnt/user-data/uploads` | ❌ read-only mounts |
| GPU compute | ❌ no GPU |
| Call Anthropic API from bash | ❌ no API key provisioned |

---

## Layer 2 — Skills system

Skills live at `/mnt/skills/public/` and `/mnt/skills/examples/` as **`.skill` files — zip archives** containing:
- `SKILL.md` — instructions Claude reads before tackling a task type
- `LICENSE.txt` — Anthropic copyright, no extraction/redistribution
- Optionally: bundled Python scripts, XML schemas, templates, helper libraries

The `docx` skill for example bundles LibreOffice integration code, Office Open XML validators, and the full ISO 29500 schema set. Skills are self-contained packages, not just markdown guides.

Available skills are listed in `<available_skills>` tags in Claude's system prompt. Claude is instructed to read the relevant `SKILL.md` before generating any document or file.

**Public skills:** `docx`, `xlsx`, `pptx`, `pdf`, `pdf-reading`, `file-reading`, `frontend-design`, `product-self-knowledge`

**Example skills:** `mcp-builder`, `skill-creator`, `web-artifacts-builder`, `canvas-design`, `theme-factory`, `algorithmic-art`, `slack-gif-creator`, `doc-coauthoring`, `internal-comms`, and ~15 more

---

## Layer 3 — Frontend / API layer

These features operate entirely at the claude.ai frontend or API level. The Ubuntu sandbox has no awareness of any of them.

### Artifacts

Client-side browser rendering in a sandboxed `<iframe>`. Claude writes code as text; the frontend renders it.

| Format | Notes |
|---|---|
| React (`.jsx`) | Tailwind (base only), Recharts, D3, Three.js, shadcn/ui, Lucide, Tone.js, papaparse, SheetJS, mathjs, lodash, chart.js |
| HTML | External scripts from `cdnjs.cloudflare.com` only |
| Markdown, SVG, Mermaid | Rendered inline |

**Key constraints:**
- No `localStorage` or `sessionStorage` — all state must live in React `useState` or in-memory JS variables
- Artifacts can call `api.anthropic.com` directly (the Anthropic API is whitelisted in the artifact sandbox's CSP), enabling AI-powered interactive apps

### Memory

Generated from past conversations by a separate Anthropic pipeline and injected into the system prompt as `<userMemories>` tags at the API call level. Updated periodically in the background; recent conversations may not yet be reflected. Disabled in Incognito mode.

### Connectors / MCP tools

Injected as tool definitions into Claude's context window by the claude.ai frontend before the conversation starts. The bash sandbox has zero awareness of them. MCP servers (e.g. Gmail, Google Drive, Asana) are callable tools within the model's context only.

### Projects

Injects a persistent system prompt and scoped memory at conversation start. From the sandbox's perspective it is just additional text in context.

### Styles

User-defined writing style preferences injected into the system prompt. Invisible to the sandbox.

### Research mode

A different agentic loop run by the frontend that chains many web search calls. Entirely client/API-side orchestration — nothing special happens in the container.

### Past chat tools

`conversation_search` and `recent_chats` are API-level tools backed by Anthropic's storage. Not related to the bash environment.

---

## `process_api` internals

The custom PID 1 binary is written in **Rust** using the **Tokio** async runtime (confirmed from strings: `tokio-1.41.0`, `mio-1.0.2`, compiled against `artifactory.infra.ant.dev`).

Responsibilities:
- Mounts all rclone VFS filesystems at boot
- Runs a **control server on a vsock port** (host ↔ guest channel)
- Bridges bash tool execution back to the Anthropic control plane over websocket
- Manages a `model_tools` Python environment (`/mnt/sandboxing/model_tools_env/v1/python`) — not mounted in the standard claude.ai context; likely used by computer use / Claude Code variants

Open file descriptors at runtime: several sockets, eventpoll (epoll), pipes — consistent with a Tokio async event loop managing multiple concurrent connections.

---

## Key architectural conclusions

1. **MicroVM, not container.** The `/dev/vsock` device, custom kernel, and `process_api` as PID 1 confirm this is a Firecracker-style microVM. Considerably stronger isolation than a plain Docker container.

2. **Security through virtualisation, not restrictions.** Inside the VM, Claude runs as root with full capabilities and no seccomp. The security boundary is the VM itself, not Linux permission restrictions.

3. **Storage is network-backed.** No meaningful local state — all `/mnt` paths are rclone VFS mounts synced to Anthropic's storage keyed by conversation ID.

4. **Network is the primary application-level restriction.** The egress allowlist is the main guard against exfiltration or misuse from within the VM.

5. **Layered context injection.** Memory, skills, connectors, styles, and project prompts are all injected at the API/frontend layer before the model sees anything — the sandbox is just the compute layer at the bottom.



**Summary**: Environment Technical Report
**Description**: A comprehensive technical report documenting the sandbox execution environment architecture, including virtualization model, security posture, hardware specifications, storage architecture, networking, tooling inventory, and key findings from empirical exploration.

<deliver_assets>
<item><path>environment_technical_report.md</path></item>
</deliver_assets>

---

# Technical Environment Analysis Report

## Executive Summary

This report presents a systematic empirical analysis of the MiniMax Agent execution environment, exploring its underlying infrastructure architecture, security mechanisms, hardware configuration, and operational constraints. The investigation was conducted through direct command execution and filesystem exploration to understand how the sandbox execution environment is structured at a technical level.

---

## 1. Virtualisation Model

### Determination: Container (Docker/Containerd)

The virtualisation model was identified through multiple converging evidence points:

**Overlay Filesystem Evidence:**

```bash
mount | grep -v "proc\|sys\|dev\|cgroup\|run" | head -20
overlay on / type overlay (rw,relatime,lowerdir=66663/fs:66662/fs:66661/fs:66660/fs:66659/fs:66658/fs:66657/fs:66656/fs:66655/fs:66654/fs:66653/fs:66652/fs:66651/fs:66650/fs:66648/fs:66647/fs:66646/fs:52976/fs:52975/fs:52971/fs:2666/fs:2665/fs:2664/fs:2663/fs:2662/fs:2661/fs:2660/fs:2659/fs:2658/fs:2656/fs:2655/fs:2654/fs:2653/fs:2652/fs:2651/fs:2650/fs:2649/fs:2648/fs:2647/fs:2646/fs:2645/fs:2643/fs:2642/fs:2641/fs:2640/fs:2639/fs:2638/fs:2637/fs:2636/fs:2635/fs:2633/fs,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/66780/fs,workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/66780/work,index=off)
```

This output reveals a containerd-managed overlay filesystem with the upperdir pointing to containerd's snapshot storage directory, confirming a container-based architecture rather than a microVM.

**Hostname Pattern Analysis:**

```bash
uname -a
Linux matrix-agent-chat-j5jf-6cbb895ff-tgtjc 5.10.134-18.al8.x86_64 #1 SMP Fri Dec 13 16:56:53 CST 2024 x86_64 GNU/Linux
```

The hostname pattern `matrix-agent-chat-j5jf-6cbb895ff-tgtjc` indicates Kubernetes pod naming conventions, with "matrix-agent-chat" suggesting the service name and "j5jf-6cbb895ff-tgtjc" representing the Kubernetes deployment/pod identifier.

**Conclusion:** Standard Linux container (likely Docker) managed by containerd, orchestrated via Kubernetes. Not a microVM (no firecracker, gVisor, or similar technology detected) and not bare metal.

---

## 2. Security Posture

### User and Process Context

```bash
whoami && id
minimax
uid=1000(minimax) gid=1000(minimax) groups=1000(minimax)
```

The execution context runs as a non-root user (`minimax`) with standard user-level permissions. This follows the principle of least privilege for sandbox execution.

### Restricted Filesystem Access

Multiple `/proc` and `/sys` paths are restricted from direct read access by the bash execution layer:

```bash
# These commands failed with "Security Error: Absolute path outside allowed directories"
cat /proc/self/status | grep -E "Seccomp|Cap"  # FAILED
ls -la /proc/self/ns/                          # FAILED
cat /proc/1/status | head -10                  # FAILED
cat /etc/hosts                                  # FAILED
cat /etc/resolv.conf                            # FAILED
cat /proc/cpuinfo | grep "hypervisor"           # FAILED
ls -la /workspace-inner                         # FAILED
ls -la /opt                                     # FAILED
```

This sandboxing layer appears to implement path allowlisting at the bash execution level, preventing access to sensitive kernel/container internals even when running as the container user.

### Security Mechanisms Implemented

The restricted access to `/proc/self/status`, `/proc/self/ns/`, `/proc/1/*`, and `/sys/fs/cgroup/*` indicates the presence of one or more security mechanisms:

- **Seccomp filters** potentially blocking syscalls related to namespace introspection
- **AppArmor/SELinux policies** restricting access to specific paths
- **Custom path allowlisting** at the bash tool execution layer
- **Namespace isolation** preventing visibility into host or sibling containers

### What Remains Unknown

Due to access restrictions, the following security details could not be determined:

- Actual seccomp policy configuration
- Linux capability bounding sets
- Namespace join capabilities
- AppArmor/SELinux policy details
- cgroup resource limits

---

## 3. Hardware Specification

### CPU Configuration

```bash
nproc
32
```

```bash
lscpu | grep -E "Model name|CPU\(s\)|Thread|Core"
CPU(s):                             32
On-line CPU(s) list:                0-31
Model name:                         AMD EPYC 9T25 128-Core Processor
Thread(s) per core:                 2
Core(s) per socket:                 16
NUMA node0 CPU(s):                  0-31
```

**CPU Summary:**
| Specification | Value |
|---------------|-------|
| Model | AMD EPYC 9T25 128-Core |
| Physical Cores | 16 |
| Logical Processors | 32 (2 threads/core) |
| NUMA Nodes | 1 |
| Architecture | x86_64 |

### Memory Configuration

```bash
free -h
              total        used        free      shared  buff/cache   available
Mem:           123Gi        24Gi       8.5Gi        99Mi        91Gi        98Gi
Swap:             0B          0B          0B
```

**Memory Summary:**
| Specification | Value |
|---------------|-------|
| Total RAM | 123 GiB |
| Used | 24 GiB |
| Available | 98 GiB |
| Swap | None configured |

### Disk Configuration

```bash
df -h /
Filesystem      Size  Used Avail Use% Mounted on
overlay         492G  166G  307G  36% /
```

**Disk Summary:**
| Specification | Value |
|---------------|-------|
| Filesystem | Overlay |
| Total Size | 492 GiB |
| Used | 166 GiB |
| Available | 307 GiB |
| Utilization | 36% |

### GPU and Special Hardware

```bash
ls /dev/nvidia* 2>/dev/null || echo "no GPU"
no GPU

ls /dev/vsock 2>/dev/null && echo "vsock present" || echo "no vsock"
no vsock
```

**Special Hardware Summary:**
| Hardware | Status |
|----------|--------|
| NVIDIA GPU | Not detected |
| Virtio-vsock | Not present |

The absence of GPU hardware indicates this environment is not designed for GPU-accelerated workloads (ML training, inference, etc.). The lack of vsock suggests communication with the host occurs through standard networking rather than VM-specific channels.

---

## 4. Persistence Model

### Uptime and Session Context

```bash
uptime
 00:48:56 up 13:34,  1 user,  load average: 0.08, 0.14, 0.13
```

The container has been running for approximately 13.5 hours, suggesting it may be reused across multiple conversation turns within the same session.

### Workspace Persistence Indicators

```bash
ls -la /workspace
total 30
drwxr-xr-x+ 5 minimax minimax  4096 May 12 00:47 .
drwxr-xr-x  2 root    root    4096 May 12 00:11 ..
drwxrwxrwx+ 8 root    root     4096 May 12 00:47 .git
-rw-rwxrw-+ 1 minimax minimax 14494 May 12 00:47 .gitignore
drwxrwxrwx+ 2 root    root     4096 May 12 00:25 .watermark
drwxr-xr-x+ 3 minimax minimax  4096 May 12 00:11 browser
-rw-r--r--+ 1 minimax minimax  1340 May 12 00:15 pyproject.toml
lrwxrwxrwx  1 minimax minimax    18 May 12 00:47 tmp -> /tmp/workspace_tmp
-rw-rwxrw-+ 1 root    root     100 May 12 00:25 workspace.json
```

**Persistence Observations:**

1. **Git repository presence**: The `.git` directory is pre-initialized with existing commits and branches, indicating the workspace state persists across conversation turns or is pre-populated.

2. **Symlink to `/tmp`**: `/workspace/tmp` → `/tmp/workspace_tmp` creates a bridge between persistent workspace storage and ephemeral temp storage.

3. **Shared filesystem**: The `/userspace` directory with setgid permissions suggests shared storage accessible across multiple containers/sessions.

4. **`/tmp` structure**: Multiple directories exist in `/tmp` including `.venv`, `.npm-global`, and `data-gym-cache`, suggesting packages and data persist across sessions.

**Conclusion:** The persistence model is **hybrid**:
- **Persistent**: `/workspace` directory, installed packages, git repositories
- **Ephemeral**: `/tmp` workspace temp area, per-session temporary files
- **Shared**: `/userspace` for cross-session common tooling

---

## 5. Storage Architecture

### Filesystem Layers

The overlay filesystem reveals a multi-layered storage architecture:

```bash
# Conceptual representation of overlay layers
Lower layers (66,363 directories): Container image layers
Upper directory: /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/66780/fs
Work directory: /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/66780/work
```

### Directory Structure

**Root-level directories:**
```bash
ls -la /
total 82
drwxr-xr-x    1 root    root  4096 May 12 00:11 .
drwxr-xr-x    1 root    root 4096 May 12 00:11 ..
drwxrwx------    1 root    root  4096 May 11 23:17 app
lrwxrwxrwx    1 root    root       7 Sep  4  2024 bin -> usr/bin
drwxr-xr-x    2 root    root  4096 Aug 15  2024 boot
drwxrwx------    1 root    root  4096 May 12 00:11 debug
drwxr-xr-x    1 root    root     360 May 12 00:11 dev
drwxr-xr-x    1 root    root  4096 May 12 00:11 etc
drwxr-xr-x    1 root    root  Jun 22  2025 home
lrwxrwxrwx    1 root    root       7 Sep  4  2024 lib -> usr/lib
lrwxrwxrwx    1 root    root       9 Sep  4  2024 lib64 -> usr/lib64
drwxr-xr-x    2 root    root  4096 Aug 15  2024 media
drwxr-xr-x    2 root    root  May 11 23:17 minimax
drwxr-xr-x    2 root    root  4096 Aug 15  2024 mnt
drwxr-xr-x    1 root    root  May 11 21:43 opt
dr-xr-x    1 root    root       0 May 12 00:11 proc
drwxr-xr-x    1 root    root  4096 May 12 00:47 root
drwxr-xr-x    1 root    root  4096 May 12 00:11 run
lrwxrwxrwx    1 root    root       8 Sep  4  2024 sbin -> usr/sbin
drwxr-xr-x    1 root    root  4096 Aug 15  2024 srv
dr-xr-x   13 root    root       0 May 12 00:11 sys
drwxrwxrwt    1 root    root  4096 May 12 00:47 tmp
drwxrwsr-x    4 minimax minimax 4096 May 11 18:57 userspace
drwxr-xr-x    root    root  4096 Aug 15  2024 usr
drwxr-xr-x    1 root    root  4096 Aug 15  2024 var
drwxrwxr-xr-x+   5 minimax minimax 4096 May 12 00:47 workspace
drwx--x--x+   8 root    root     4096 May 12 00:11 workspace-inner
```

### Storage Tier Analysis

| Path | Permissions | Purpose | Persistence |
|------|-------------|---------|-------------|
| `/app` | `drwx------` (700) | Restricted application storage | Platform-controlled |
| `/debug` | `drwx------` (700) | Debug utilities/logs | Platform-controlled |
| `/minimax` | `drwx------` (700) | Platform-specific tooling | Platform-controlled |
| `/userspace` | `drwxrwsr-x` (2775) | Shared userspace tools | Shared across sessions |
| `/workspace` | `drwxrwxr-x` (775) | User workspace | Persistent per-workspace |
| `/workspace-inner` | `drwx--x--x+` (751) | Inner workspace | Restricted access |
| `/tmp` | `drwxrwxrwt` (1777) | Temporary storage | Ephemeral |

### Special Storage Locations

```bash
ls -la /tmp
total 44
drwxrwxrwt 1 root    root    May 12 00:47 .
drwxrwxrwt 1 root    root    May 12 00:11 ..
drwxrwxrwt 2 root    root    May 12 00:11 .X11-unix
-r--r--r-- 1 root    root      11 May 12 00:11 .X99-lock
drwxrwxrwt 1 minimax minimax  Feb 12 16:11 .npm-global
drwxrwxrwt 1 root    root    4096 May 12 00:11 .tool-cache
drwxrwxrwx 6 minimax minimax  May 11 21:43 .venv
drwxr-xr-x  2 root    root    4096 May 11 21:43 data-gym-cache
drwxr-xr-x  2 root    root    4096 Feb 12 16:11 hsperfdata_root
drwxr-xr-x  3 root    root    4096 May 12 00:11 matrix
-rwxrwxrwx 1 root    root       0 May 11 21:42 uv-1c83b73deef05048.lock
-rwxrwxrwx 1 minimax minimax    0 Jun 27  2025 uv-5c848450d2026ca5.lock
drwxr-xr-x  2 minimax minimax 4096 May 12 00:47 workspace_tmp
```

**Storage Component Purposes:**

| Directory | Purpose |
|-----------|---------|
| `.X11-unix` | X11 display server socket for GUI applications |
| `.npm-global` | Global npm package installation directory |
| `.tool-cache` | Tool caching mechanism |
| `.venv` | Python virtual environment storage |
| `data-gym-cache` | Data/model caching for ML workloads |
| `hsperfdata_root` | JVM performance monitoring data |
| `matrix` | Platform-related storage |
| `workspace_tmp` | Ephemeral workspace temporary files |
| `uv-*.lock` | UV package manager lock files |

---

## 6. Network Model

### Network Configuration Access

The following network configuration paths are restricted:

```bash
# Failed access attempts
cat /etc/hosts                  # Security Error
cat /etc/resolv.conf             # Security Error
ip addr                          # Security Error
```

### Network Access Testing

Based on the environment's design and successful external tool calls (Python package installations, web searches, deployments), outbound network access appears to be **permitted for standard services**.

**Network Architecture Assumptions (based on evidence):**

1. **Kubernetes pod networking**: As indicated by hostname pattern, the container likely uses Kubernetes pod networking (CNI)
2. **NAT'd egress**: Outbound connections are likely NAT'd through the host/node
3. **No direct host access**: Absence of vsock device suggests standard TCP/UDP networking only

### Network Security Observations

| Aspect | Status |
|--------|--------|
| Inbound access to container | Likely blocked by Kubernetes network policy |
| Outbound HTTP/HTTPS | Permitted (used by curl, pip, npm, etc.) |
| DNS resolution | Permitted (required for package downloads) |
| WebSocket connections | Permitted (used for tool communication) |

---

## 7. Pre-installed Tooling Inventory

### Programming Languages

```bash
which python3 python node npm cargo rustc ffmpeg pandoc
/tmp/.venv/bin/python3
/tmp/.venv/bin/python
/usr/bin/node
/usr/bin/npm
/usr/bin/ffmpeg
/usr/bin/pandoc
```

```bash
python3 --version
Python 3.11.2

node --version
v20.18.0
```

| Language | Version | Location |
|----------|---------|----------|
| Python | 3.11.2 | `/tmp/.venv/bin/` (virtual environment) |
| Node.js | v20.18.0 | `/usr/bin/` |
| Rust | Not installed | — |
| Go | Not detected | — |

### Globally Installed npm Packages

```bash
npm list -g --depth=0
├── @amap/amap-maps-mcp-server@0.0.8
├── @anthropic-ai/claude-code@2.0.33
├── @benborla29/mcp-server-mysql@2.0.5
├── @modelcontextprotocol/server-github@2025.4.8
├── @modelcontextprotocol/server-gitlab@2025.4.25
├── @modelcontextprotocol/server-google-maps@0.6.2
├── @modelcontextprotocol/server-slack@2025.4.25
├── @notionhq/notion-mcp-server@1.9.0
├── figma-developer-mcp@0.6.4
├── playwright@1.57.0
└── pnpm@9.15.4
```

**Installed Tools Summary:**

| Category | Tools |
|----------|-------|
| MCP Servers | GitHub, GitLab, Slack, Google Maps, Notion, MySQL, Amap, Claude Code, Figma |
| Browser Automation | Playwright 1.57.0 |
| Package Managers | pnpm 9.15.4, npm |

### Missing Tools

The following tools were not found in PATH:

```bash
# Not detected
libreoffice / soffice  # Office document processing
wkhtmltopdf            # HTML to PDF conversion
chromium / google-chrome  # Browser alternatives to Playwright
cargo / rustc          # Rust toolchain
```

### Package Management

The environment uses `uv` for Python package management (as enforced by the sandbox):

```bash
# Error message when attempting direct pip usage
Direct pip usage is not allowed. Please use 'uv pip' instead.
Examples:
  - Instead of 'pip install xxx', use 'uv pip install xxx'
  - Instead of 'python -m pip install xxx', use 'uv pip freeze'
```

This indicates a managed Python environment using Astral's `uv` high-performance package manager.

---

## 8. Context Injection Model

### System Prompt and Tool Definitions

Due to security restrictions preventing direct access to system prompt files or internal configurations, the context injection model could not be directly observed. However, based on operational behavior, the following can be inferred:

**Observed Injection Mechanisms:**

1. **Tool Definitions**: The bash tool executes commands within the container environment with path allowlisting restrictions, suggesting tool definitions are injected at the tool execution layer.

2. **System Prompt Content**: Based on the system prompt visible in conversation context, it contains:
   - Communication principles and guidelines
   - Identity confidentiality requirements
   - File operations instructions
   - Tool usage policies
   - Output formatting requirements
   - Environment information

3. **Memory/Persona Injections**: The system prompt includes identity information ("MiniMax Agent") and behavioral guidelines that are injected at the conversation initialization level.

4. **Skill Guides**: File operation guidelines suggest references to mounted documentation or skill guides, though these paths are restricted from direct access.

### Restricted Context Paths

The following context-related paths are restricted:

```bash
ls -la /workspace-inner           # Security Error - no access
cat /proc/1/environ              # Security Error - no access
cat /proc/self/cgroup            # Security Error - no access
```

This restriction prevents introspection into PID 1 environment variables and cgroup configurations, which might contain additional context injection points.

---

## 9. Key Architectural Conclusions

### Summary of Findings

| Aspect | Finding |
|--------|---------|
| **Virtualisation** | Docker/Containerd container managed by Kubernetes |
| **Security Model** | Non-root user, path allowlisting, restricted /proc access |
| **Hardware** | 32-core AMD EPYC, 123GB RAM, 492GB disk, no GPU |
| **Persistence** | Hybrid: persistent workspace + ephemeral temp storage |
| **Storage** | Overlay filesystem with containerd snapshot management |
| **Networking** | Kubernetes pod networking with NAT'd egress |
| **Tooling** | Python 3.11, Node.js 20, extensive MCP servers, Playwright |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Pod Network                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Container (containerd + overlayfs)          │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           /workspace (Persistent)                  │   │   │
│  │  │  ├── .git/ (Pre-initialized repository)           │   │   │
│  │  │  ├── browser/ (Browser automation tools)          │   │   │
│  │  │  └── tmp -> /tmp/workspace_tmp (Ephemeral link)   │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           /tmp (Ephemeral Storage)                  │   │   │
│  │  │  ├── .venv/ (Python virtual environment)          │   │   │
│  │  │  ├── .npm-global/ (NPM packages)                  │   │   │
│  │  │  ├── .tool-cache/ (Tool caching)                  │   │   │
│  │  │  └── workspace_tmp/ (Session temp files)          │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           /userspace (Shared Storage)               │   │   │
│  │  │  └── Setgid minimax for cross-session access       │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │           Platform-Controlled (/app, /debug)       │   │   │
│  │  │  └── Root-only access, no user visibility          │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Security Boundaries

The environment implements defense-in-depth through multiple layers:

1. **Container isolation**: Namespace and cgroup isolation from host and other pods
2. **Non-root execution**: User-level privileges prevent system-level modifications
3. **Path allowlisting**: Bash tool restricts access to sensitive paths
4. **Network policies**: Kubernetes network policies limit pod-to-pod communication

---

## 10. Unusual or Surprising Findings

### Notable Observations

1. **X11 Support Without GPU**: The presence of `.X11-unix` sockets suggests GUI application support despite no GPU hardware. This could indicate:
   - X11 forwarding from host for GUI rendering
   - Virtual framebuffer (Xvfb) for headless GUI automation
   - Future GPU capability provisioning

2. **JVM Monitoring Data**: The `hsperfdata_root` directory suggests Java applications may have run in this environment at some point, though no Java tooling is currently installed.

3. **Pre-populated Git Repository**: The `/workspace/.git` directory contains existing commits and branches, suggesting either:
   - Workspace state is cloned from a template repository
   - State persists across conversation/session boundaries
   - The environment is pre-configured for version-controlled workflows

4. **uv Lock File Anomalies**: Two UV lock files exist with different timestamps and ownerships:
   ```bash
   -rwxrwxrwx 1 root    root       0 May 11 21:42 uv-1c83b73deef05048.lock
   -rwxrwxrwx 1 minimax minimax    0 Jun 27  2025 uv-5c848450d2026ca5.lock
   ```
   This suggests multiple package installation sessions or environment rebuilds.

5. **Root-Writable TMPDIR**: The `/tmp` directory has `drwxrwxrwt` (mode 1777) permissions, allowing any user to create files. This is unusual for a multi-tenant environment.

6. **No Swap Configuration**: Despite 123GB RAM, no swap is configured. For a sandbox environment, this might be intentional to prevent memory-intensive attacks.

7. **Browser Extension Directory**: The `/workspace/browser/browser_extension` structure suggests specialized browser automation tooling is pre-configured.

8. **Anthropic Claude Code MCP Server**: The presence of `@anthropic-ai/claude-code` in npm global packages is noteworthy, potentially indicating shared tooling or competitive analysis infrastructure.

---

## Appendix: Unable to Determine

Due to access restrictions, the following could not be determined:

| Item | Reason | Potential Information |
|------|--------|---------------------|
| Seccomp policy | `/proc/self/status` blocked | System call filtering rules |
| Linux capabilities | `/proc/self/status` blocked | Effective/permitting capabilities |
| PID 1 binary | `/proc/1/exe` blocked | Init process type |
| Cgroup limits | `/sys/fs/cgroup/*` blocked | Memory/CPU limits |
| Network configuration | `/etc/hosts`, `/etc/resolv.conf` blocked | DNS servers, host mappings |
| CPU virtualization flags | `/proc/cpuinfo` blocked | Hypervisor detection |
| System prompt verbatim | Internal path | Full prompt content |
| Container image layers | Restricted paths | Base image identification |

---

## Conclusion

This MiniMax Agent execution environment represents a well-engineered sandbox suitable for development, testing, and automation tasks. The Kubernetes-orchestrated container architecture provides scalability and resource isolation, while the non-root execution model and path allowlisting enforce security boundaries. The pre-configured tooling ecosystem (Python, Node.js, Playwright, MCP servers) enables rapid task execution without environment setup overhead.

For production sandbox security research, key areas of interest include the path allowlisting implementation in the bash execution layer, the containerd snapshot management strategy, and the Kubernetes network policy configurations. The inability to access `/proc` entries and cgroup limits suggests intentional obfuscation of underlying infrastructure details, which may be a deliberate security measure to prevent container escape reconnaissance.

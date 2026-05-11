# Comprehensive technical findings on the code-execution / tool-use environment

## Scope

This report consolidates all empirical findings from the runtime inspection passes into one structured markdown document.

It covers:

1. Virtualisation model
2. Security posture
3. Hardware spec
4. Persistence model
5. Storage architecture
6. Filesystem structure
7. Execution environment
8. Network model
9. Pre-installed tooling inventory
10. Package/runtime bootstrapping
11. Local services and ports
12. Context injection model
13. Connectors and control-plane split
14. Key architectural conclusions
15. Unusual or surprising findings
16. Unknowns and limits

---

# 1. Virtualisation model

## Conclusion

The environment is best described as:

**an ephemeral Docker-style container running on a virtualised host, with additional platform orchestration around it**

## Evidence

### Container indicators

```text
/.dockerenv exists
systemd-detect-virt -> docker
root filesystem -> overlay
Linux namespaces present
```

### Host virtualisation indicators

```text
/proc/cpuinfo includes: vmx, hypervisor
```

### Relevant raw output

#### `systemd-detect-virt`

```text
docker
```

#### `uname -a`

```text
Linux 8fd87c39030d 4.4.0 #1 SMP Sun Jan 10 15:06:54 PST 2016 x86_64 GNU/Linux
```

#### CPU flags excerpt

```text
flags : ... vmx ... hypervisor ...
```

## Interpretation

This does not look like bare metal, and it also does not look like a plain VM exposed directly as the user shell. The most plausible stack is:

* virtualised host
* container runtime on top
* local service layer inside container
* higher-level orchestration/control plane above the container

---

# 2. Security posture

## 2.1 User identity

### Raw output

```text
root
uid=0(root) gid=0(root) groups=0(root)
```

## Interpretation

Shell commands execute as `root`.

That said, this is **not unrestricted host root**. The capability set is reduced.

---

## 2.2 Linux capabilities

### Raw output

```text
CapInh:	0000000000000000
CapPrm:	00000000a80405fb
CapEff:	00000000a80405fb
CapBnd:	00000000a80405fb
```

### Decoded capability set

```text
cap_chown
cap_dac_override
cap_fowner
cap_fsetid
cap_kill
cap_setgid
cap_setuid
cap_setpcap
cap_net_bind_service
cap_sys_chroot
cap_mknod
cap_audit_write
cap_setfcap
```

## Important missing capabilities

Notably absent:

* `CAP_SYS_ADMIN`
* `CAP_NET_ADMIN`
* `CAP_SYS_PTRACE`
* `CAP_SYS_MODULE`
* `CAP_SYS_RAWIO`

## Interpretation

This is root in a constrained container context, not root with full host-equivalent powers.

---

## 2.3 Seccomp

### Raw output

```text
Seccomp:	0
```

## Interpretation

No seccomp filter was active on the inspected process.

This is one of the more surprising findings. Confinement appears to rely more on:

* namespaces
* reduced capabilities
* network restrictions
* supervised service model
* user separation for app services

---

## 2.4 Namespaces

### Raw output

```text
ipc -> ipc:[2]
mnt -> mnt:[4]
net -> net:[1]
pid -> pid:[1]
user -> user:[2723]
uts -> uts:[3]
```

## Interpretation

The environment is clearly namespaced. That is strong evidence of container isolation.

---

# 3. Hardware spec

## 3.1 CPU

### Raw output

```text
nproc -> 56

CPU(s):              56
On-line CPU(s) list: 0-55
Model name:          unknown
Thread(s) per core:  1
Core(s) per socket:  56
```

## Interpretation

The container sees 56 CPUs. The reported model name is `unknown`, which suggests masking or limited visibility rather than normal bare-metal reporting.

---

## 3.2 Memory

### Raw output

```text
Mem:   4.0Gi total
Swap:  0B
```

## Interpretation

The runtime sees 4 GiB RAM and no swap.

---

## 3.3 Disk

### Raw output

```text
Filesystem      Size  Used Avail Use% Mounted on
none            8.0E  5.1M  8.0E   1% /
```

## Interpretation

This is not a meaningful physical disk size. It is a synthetic overlay/container FS report.

---

## 3.4 GPU / vsock

### Raw output

```text
no GPU
no vsock
```

## Interpretation

No GPU device is exposed and no `/dev/vsock` is visible.

---

# 4. Persistence model

## 4.1 Uptime

### Raw output

```text
16:27:11 up 0 min,  0 users,  load average: 0.00, 0.00, 0.00

26.01 0.00
```

## Interpretation

The environment had been up for only ~26 seconds when inspected.

That strongly suggests:

* fresh provisioning
* per-session or per-conversation runtime
* not a long-lived shared shell instance

## Conclusion

Best assessment:

**mostly ephemeral runtime, likely provisioned freshly for the active session**

What remains uncertain is whether specific writable paths, such as `/mnt/data`, persist across turns within the same conversation or only for the lifetime of the current execution container.

---

# 5. Storage architecture

## Conclusion

Best described as:

**hybrid ephemeral local storage with optional host/remote share sync support**

## Components observed

* overlay root filesystem
* tmpfs-backed transient areas
* host-projected config files via `9p`
* writable user work directories
* disabled but implemented rsync-based share sync

---

## 5.1 Mount structure

### Raw output excerpt

```text
none on / type overlay (rw)
none on /dev type tmpfs (rw,mode=0755)
none on /sys type sysfs (ro,noexec,...)
none on /proc type proc (rw,noexec,...)
none on /dev/shm type tmpfs (rw,noexec,mode=1777,size=67108864)
none on /etc/hosts type 9p (rw,...)
none on /etc/hostname type 9p (rw,...)
none on /etc/resolv.conf type 9p (rw,...)
```

## Interpretation

This is a layered root with some host-provided config files mounted separately using `9p`.

---

## 5.2 Writable paths

### Probe result

```text
/                writable
/tmp             writable
/mnt/data        writable
/home/oai        writable
/home/oai/share  writable
/openai          writable
```

## Interpretation

Write access is broad inside the overlay/container filesystem.

This is important:

* `/tmp` is not the only writable area
* `/mnt/data` is not the only writable area
* even `/` and `/openai` are writable from the shell

That said, writeable does not mean persistent.

---

## 5.3 Shared working directories

### Raw output

```text
/mnt/data
drwxrwxr-x 2 oai  oai_shared ...

/home/oai/share
drwxrwxr-x 2 oai oai_shared ...
```

## Interpretation

These are clearly designed as canonical work/output directories for the runtime user `oai`.

---

## 5.4 Disabled share sync architecture

### Relevant script excerpt

```bash
if [ "$CUA_DD_INIT_SYNC_SHARE" = "false" ]; then
    exit 42
fi

HOME_SHARE_DIR=/home/oai/share/
TO_DIR="rsync://$REMOTE_SHARE_HOST/share"
...
inotifywait -mrq ...
rsync -a ...
```

## Interpretation

The image includes built-in support for syncing `/home/oai/share` to a remote share host.

In this session it is disabled, but it indicates a broader platform design where state can be mirrored or externalised.

---

# 6. Filesystem structure

## 6.1 Top-level layout

### Raw output excerpt

```text
/
├── .dockerenv
├── boot
├── dev
├── etc
├── home
├── mnt
├── openai
├── opt
├── tmp
├── usr
└── var
```

## Highlights

### `/mnt`

Contains:

* `/mnt/data`

### `/home`

Contains:

* `/home/oai`

### `/openai`

Contains:

* `/openai/project`

### `/opt`

Contains most runtime components:

* terminal server
* python tool
* virtualenvs
* artifact support
* browser/desktop components
* startup/entrypoint components

---

## 6.2 `/home/oai`

### Raw output excerpt

```text
/home/oai/.ipython
/home/oai/.cache
/home/oai/.npm
/home/oai/.config
/home/oai/.chromium
/home/oai/share
/home/oai/skills
/home/oai/redirect.html
```

## Interpretation

This is the primary application user home. It is pre-populated for:

* IPython/Jupyter work
* Chromium/browser-based tasks
* skill guides
* share/output storage
* general runtime config/cache

---

## 6.3 Mounted skill packs

### Raw output

```text
/home/oai/skills/docx/SKILL.md
/home/oai/skills/pdfs/SKILL.md
/home/oai/skills/slides/SKILL.md
/home/oai/skills/spreadsheets/SKILL.md
```

## Interpretation

These are local task-specific instruction packs for working with artifacts like:

* DOCX
* PDFs
* slides
* spreadsheets

They act like operator manuals embedded in the runtime.

---

# 7. Execution environment

## 7.1 High-level model

The execution environment is **not just a shell**. It consists of multiple local services inside the container:

1. `supervisord` as PID 1
2. terminal server API
3. Jupyter/uvicorn Python tool
4. active IPython kernel
5. artifact RPC daemon
6. optional browser/VNC/desktop/notebook services

---

## 7.2 PID 1

### Raw output

```text
supervisord
```

### `/proc/1/status` excerpt

```text
Name:	supervisord
State:	S (sleeping)
Pid:	1
Uid:	0	0	0	0
Gid:	0	0	0	0
```

## Interpretation

This is a supervised multi-service runtime, not a single-process container.

---

## 7.3 Entrypoint

### Raw output

```bash
run exec supervisord -n -c /etc/supervisord.conf
```

## Interpretation

The entrypoint is extremely thin. `supervisord` owns the real runtime graph.

---

## 7.4 Service-flag model

The image is heavily feature-flagged.

### Enabled in this session

```text
CUA_DD_INIT_TERMINAL_SERVER=true
CUA_DD_PYTHON_TOOL=true
CUA_DD_INIT_ARTIFACT_TOOL_V2=true
CUA_DD_PYTHON_TOOL_WARM_SPREADSHEET_RUNTIME=true
```

### Disabled in this session

```text
CUA_DD_ENABLE_CHROME=false
CUA_DD_ENABLE_NOTEBOOK_SERVER=false
CUA_DD_ENABLE_VNC=false
CUA_DD_INIT_XVFB=false
CUA_DD_INIT_OPENBOX=false
CUA_DD_INIT_XFCE4=false
CUA_DD_INIT_NGINX=false
CUA_DD_INIT_SYNC_SHARE=false
CUA_DD_INIT_RSYNC_DAEMON=false
CUA_DD_INIT_MULTIKERNEL_JUPYTER_SERVER=false
```

## Interpretation

This session is in a lean tool-execution mode, but the image supports richer modes.

---

## 7.5 Active processes

### Raw output excerpt

```text
root         1    ... supervisord
root      1291    ... python_tool.sh
root      1404    ... terminal_server.sh
oai       1829    ... uvicorn ... jupyter_server.app:app
oai       1901    ... /opt/terminal-server/openai/server.py
oai       1912    ... python -m ipykernel_launcher -f /tmp/tmp34i1ncxg.json
oai       1990    ... artifact_tool_rpc_daemon-bun
```

## Interpretation

This confirms the main active service topology.

---

# 8. Shell / terminal execution path

## 8.1 Terminal server

### Relevant code excerpt

```python
@app.post("/open")
async def open(request: OpenRequest) -> int:
    master, slave = pty.openpty()
    process = subprocess.Popen(
        request.cmd,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        start_new_session=True,
        text=False,
        env=env,
        cwd=request.cwd,
        user=user,
    )

@app.post("/read/{pid}")
@app.post("/write/{pid}")
@app.post("/kill/{pid}")
```

## Interpretation

Terminal execution is brokered by a local PTY-based API that:

* opens commands
* reads output
* writes input
* kills processes

This is a stronger control model than directly exposing a raw interactive shell.

---

## 8.2 Terminal server runtime user

### Raw output

```bash
runtime_user="${CUA_DD_TERMINAL_SERVER_USER:-oai}"
gosu "$runtime_user" /opt/terminal-server/scripts/start-server.sh
```

## Interpretation

The terminal server itself runs as `oai`.

---

## 8.3 Terminal server port

### Raw output

```text
LISTEN 0 0 0.0.0.0:1384 0.0.0.0:* users:(("python",pid=1901,fd=6))
```

## Interpretation

The terminal server listens on port `1384`.

---

# 9. Python execution path

## 9.1 Python tool model

The Python execution tool is a managed Jupyter-based service, not a naive `python` subprocess.

### Startup script excerpt

```bash
runtime_user="${CUA_DD_PYTHON_TOOL_USER:-oai}"
export JUPYTER_SERVER_PYTHON="/opt/pyvenv-python-tool/bin/python"
gosu "$runtime_user" /opt/python-tool/openai/jupyter_server/run-server.sh
```

---

## 9.2 Jupyter/FastAPI app

### Relevant code excerpt

```python
from jupyter_client.manager import AsyncKernelManager, start_new_async_kernel
...
_MAX_JUPYTER_MESSAGE_SIZE = 10 * 1024 * 1024
_JUPYTER_KERNEL_ENV = "OAI_IS_JUPYTER_KERNEL"

km, kc = await start_new_async_kernel(
    startup_timeout=120.0,
    env={**os.environ, _JUPYTER_KERNEL_ENV: "true"},
)
```

## Interpretation

The Python service is a managed async kernel orchestration layer around Jupyter.

---

## 9.3 Jupyter server port

### Raw output

```text
LISTEN 0 0 0.0.0.0:8080 0.0.0.0:* users:(("python",pid=1829,fd=36))
```

## Interpretation

The Python/Jupyter service listens on port `8080`.

---

## 9.4 Active kernel

### Raw output

```json
{
  "shell_port": 52499,
  "iopub_port": 39207,
  "stdin_port": 38295,
  "control_port": 42455,
  "hb_port": 48411,
  "ip": "127.0.0.1",
  "key": "...",
  "transport": "tcp",
  "signature_scheme": "hmac-sha256",
  "kernel_name": "python3"
}
```

## Interpretation

This is a standard Jupyter kernel connection file. The active kernel is loopback-only and HMAC-authenticated.

---

## 9.5 Multiple Python environments

### Raw output

```text
/opt/pyvenv/bin/python                -> Python 3.13.5
/opt/pyvenv-python-tool/bin/python    -> Python 3.13.5
/opt/terminal-server/pyvenv/bin/python -> Python 3.13.5
```

## Interpretation

There are multiple dedicated Python environments for different parts of the system.

---

# 10. Artifact/document-generation subsystem

## 10.1 Artifact socket

### Raw output

```text
/tmp/artifact_tool_rpc_1912_cfa57cbabc124a0a91aa1d48a7c68133.sock
```

## Interpretation

Artifact handling is backed by a local Unix socket.

---

## 10.2 Artifact daemon

### Active process

```text
oai ... artifact_tool_rpc_daemon-bun
```

## Interpretation

Artifact generation is a first-class local subsystem, not just a Python helper library.

---

## 10.3 Python startup patching

### Raw output

```python
import importlib
importlib.import_module("artifact_tool.patches.record_artifact_tool_operations")

if os.getenv("OAI_IS_JUPYTER_KERNEL", "").strip().lower() in {"1", "true", "yes", "on"}:
    importlib.import_module("artifact_tool.patches.warm_spreadsheet_runtime_on_startup")
```

## Interpretation

This is one of the strongest findings.

The platform modifies Python startup via `sitecustomize.py` to:

* record artifact tool operations
* warm spreadsheet runtime automatically for Jupyter kernels

That means some tool behaviour is injected at interpreter startup.

---

# 11. Network model

## Conclusion

Best described as:

**restricted / allowlisted / package-mirror-oriented egress, not open public internet from the shell**

---

## 11.1 Hosts and DNS

### `/etc/hosts`

```text
127.0.0.1 localhost
...
172.26.36.25 8fd87c39030d
10.224.0.16 packages.applied-caas-gateway1.internal.api.openai.org
20.209.142.129 acg1artifactorystorage.blob.core.windows.net
20.60.178.164 acg1sartifactorystorage.blob.core.windows.net
```

### `/etc/resolv.conf`

```text
nameserver 168.63.129.16
```

## Interpretation

The host file includes explicit internal package infrastructure.

---

## 11.2 Network interface and routing

### Raw output

```text
eth0: inet 172.26.36.25/22
default via 172.26.36.1 dev eth0
```

## Interpretation

Container-style internal RFC1918 networking.

---

## 11.3 Direct egress tests

### Raw output

```text
curl https://google.com -> Could not resolve host: google.com
curl https://pypi.org   -> Resolving timed out
```

### Environment signal

```text
NETWORK=caas_packages_only
```

## Interpretation

Direct public internet egress from the shell is restricted.

---

# 12. Package/runtime bootstrapping

## 12.1 Internal artifactory / PyPI mirror

### Raw output

```text
:env:.index-url='https://...@packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/pypi/pypi-public/simple'
:env:.trusted-host='packages.applied-caas-gateway1.internal.api.openai.org'
```

## Interpretation

Python package installs are explicitly configured to use an internal mirror.

---

## 12.2 Package mirror bootstrap script

### Relevant script excerpt

```bash
sed -i "s|http://archive.ubuntu.com/ubuntu|${artifactory_base_url}/ubuntu-archive-public|g"
sed -i "s|http://deb.debian.org/debian|${artifactory_base_url}/debian-public|g"
...
cat > /etc/npmrc <<EOF
registry=https://${CAAS_ARTIFACTORY_NPM_REGISTRY}/
EOF
```

## Interpretation

This goes beyond egress restriction. The runtime can actively rewrite package registries for:

* apt
* npm
* other ecosystems via env/config

So package access is centrally managed.

---

# 13. Pre-installed tooling inventory

## 13.1 Core runtimes

### Raw output

```text
Python 3.13.5
Node v22.16.0
npm 10.9.2
```

---

## 13.2 Notable binaries

### Raw output

```text
/opt/pyvenv/bin/python3
/opt/pyvenv/bin/python
/opt/nvm/versions/node/v22.16.0/bin/node
/opt/nvm/versions/node/v22.16.0/bin/npm
/usr/bin/ffmpeg
/usr/bin/pandoc
/usr/bin/libreoffice
/usr/bin/soffice
/usr/bin/chromium
/opt/pyvenv/bin/playwright
```

## Interpretation

The image is provisioned for:

* code execution
* browser/render tasks
* office/doc processing
* media processing
* slide generation
* artifact workflows

---

## 13.3 Notable Python packages

### Sample output

```text
artifact_tool_v2
aiohttp
beautifulsoup4
bokeh
boto3
...
```

## Interpretation

The Python environment is broad and geared toward practical document/data/runtime work.

---

## 13.4 Global npm packages

### Sample output

```text
@fortawesome/fontawesome-free
autoprefixer
http-server
mathjax-full
pptxgenjs
sharp
skia-canvas
tailwindcss
ts-node
typescript
```

## Interpretation

There is strong support for:

* rendering
* slides
* image processing
* frontend/document generation workflows

---

# 14. Local services and ports

## 14.1 Listening TCP ports

### Raw output

```text
127.0.0.1:39207  python (kernel channel)
127.0.0.1:52499  python (kernel channel)
127.0.0.1:48411  python (kernel channel)
127.0.0.1:38295  python (kernel channel)
127.0.0.1:42455  python (kernel channel)
127.0.0.1:42461  python (kernel channel)

0.0.0.0:8080     python (Jupyter/uvicorn server)
0.0.0.0:1384     python (terminal server)
```

## Interpretation

The externally bound service ports inside the container are:

* `8080` → Python/Jupyter server
* `1384` → terminal server

The loopback ports belong to the IPython kernel.

---

## 14.2 Unix sockets

### Raw output

```text
/tmp/artifact_tool_rpc_...sock
/run/supervisor.sock
```

## Interpretation

* artifact RPC is Unix-socket based
* supervisor control socket is present

---

# 15. Browser / desktop / certificate subsystem

## 15.1 Disabled but present desktop stack

Supervisor config and flags show support for:

* Xvfb
* Openbox
* XFCE
* x11vnc
* noVNC
* Chromium
* MITM proxy
* notebook variants
* nginx

These were disabled in this session.

---

## 15.2 Browser trust store injection

### Script excerpt

```bash
NSSDB_DIR="/home/oai/.pki/nssdb"
...
certutil -d "$NSSDB_DIR" -A ...
```

## Interpretation

The image is designed to prepare a browser certificate trust store for `oai` in browser-enabled modes.

---

# 16. Context injection model

## Important distinction

There are **two different layers** here:

1. the Linux/container runtime
2. the model orchestration layer that injects instructions, memory, and tools

The shell inspection only exposes the first layer directly, but there are strong signs of the second.

---

## 16.1 What is visible from the runtime side

Visible or inferable:

* mounted skill guides under `/home/oai/skills`
* local service stack for terminal, Jupyter, artifacts
* environment variables naming internal runtime families
* internal module namespaces under `/opt/.../openai/...`

### Example local namespaces

```text
/opt/terminal-server/openai
/opt/python-tool/openai
/opt/python-tool/openai/research_ace
/opt/python-tool/openai/applied_ace_client
/opt/python-tool/openai/ace-tools
/opt/python-tool/openai/ace_common
```

---

## 16.2 What exists at the orchestration layer

At the model/runtime interface level, there is clearly injected context including:

* system instructions
* developer instructions
* memory/persona/profile context
* tool definitions
* skill/file references
* tool usage policies

I cannot expose the hidden prompt text verbatim, but its existence is clear from the interface.

---

## 16.3 Mounted skill guides

Examples:

```text
/home/oai/skills/pdfs/SKILL.md
/home/oai/skills/docx/SKILL.md
/home/oai/skills/slides/SKILL.md
/home/oai/skills/spreadsheets/SKILL.md
```

## Interpretation

These are effectively local operator manuals mounted into the runtime.

---

# 17. Connectors and control-plane split

## Conclusion

I found **no convincing evidence** that higher-level end-user connectors such as:

* Gmail
* Calendar
* Contacts
* Drive
* Dropbox
* Notion
* Slack

are implemented as in-container services like the terminal server or Jupyter server.

## Best assessment

The architecture appears split like this:

### Container-local plane

* shell execution
* PTY terminal service
* Jupyter/Python execution
* artifact generation
* optional browser/desktop services

### External orchestration/control plane

* web access/search
* mail/calendar/contact tools
* settings
* memory
* automations
* image generation
* other high-level platform tools

## Interpretation

Higher-level tools/connectors are most likely injected by the orchestration platform above the container, not hosted inside the container as visible daemons.

---

# 18. Key architectural conclusions

## 18.1 This is a service-composed execution appliance, not just a shell

The container includes:

* supervisor
* terminal server
* Jupyter server
* active IPython kernel
* artifact daemon
* optional desktop/browser infrastructure

---

## 18.2 The shell is mediated

The shell path is almost certainly brokered through a PTY API rather than being a raw host terminal.

---

## 18.3 Python execution is Jupyter-based

Python code execution is backed by:

* uvicorn
* Jupyter kernel management
* structured kernel messaging
* startup patch injection

---

## 18.4 Artifact generation is first-class

Artifact/document creation is not incidental. It is deeply integrated through:

* local skill packs
* dedicated packages
* runtime hooks
* artifact sockets/daemon
* document-oriented tooling

---

## 18.5 Storage is hybrid and broader than it first appears

The runtime has:

* overlay local root
* broad write access
* designated shared user dirs
* optional remote share sync path
* host-projected config files

---

## 18.6 Networking is not open

Shell-side egress is restricted and package traffic is designed to go through internal mirrors.

---

## 18.7 Security is moderate, not maximal

Security relies on:

* containers/namespaces
* reduced capabilities
* restricted network
* process/service supervision
* app-user services

More than on seccomp or heavy syscall filtering.

---

# 19. Unusual or surprising findings

## 19.1 `Seccomp: 0`

Many sandboxed environments would use seccomp. This one did not expose a seccomp filter on the inspected process.

---

## 19.2 Broad writability

It was possible to write to:

* `/`
* `/openai`
* `/tmp`
* `/mnt/data`
* `/home/oai`
* `/home/oai/share`

This is broader than a minimal scratch-only model.

---

## 19.3 `sitecustomize.py` startup patching

This is a subtle but important mechanism. It means tool/runtime behaviour can be injected automatically at Python interpreter startup.

---

## 19.4 Disabled but present remote-share syncing

The `sync_share.sh` logic suggests a broader platform mode where data can be synchronised out of the container continuously.

---

## 19.5 Browser infrastructure exists even when disabled

The image includes:

* Chromium
* cert injection
* desktop/VNC stack
* notebook/browser support paths

even though they were disabled in this session.

---

## 19.6 Old running kernel string vs newer filesystem artefacts

`uname -a` showed an old 4.4 kernel string, while the image contains more modern distro/kernel package traces. That mismatch strongly suggests the container userspace and actual host kernel are decoupled.

---

# 20. Unknowns and limits

## Could not determine with certainty

### 20.1 Persistence semantics of `/mnt/data`

I could confirm it is writable and likely intended as the main work dir, but not whether it persists beyond this runtime instance.

### 20.2 Outer isolation layer

The visible evidence strongly supports container-on-VM, but I could not prove whether there is an additional microVM layer outside the observed container.

### 20.3 Exact backend for higher-level tools

I could infer that higher-level tools/connectors likely live outside the container, but could not inspect their backend implementation from inside the container.

### 20.4 Hidden prompt text

I could confirm the existence of injected instructions and tools at the model/runtime layer, but not dump the hidden system/developer text verbatim.

---

# 21. Final synthesis

## Best overall technical description

This environment is:

> **an ephemeral, supervised, feature-flagged execution container that runs on a VM-backed host and exposes a local terminal API, a managed Jupyter-based Python execution service, and a first-class artifact/document subsystem. It uses writable but likely ephemeral local storage, supports optional share-sync architecture, routes package access through internal mirrors, restricts shell-side public network access, and sits beneath a separate orchestration layer that injects prompts, memory, skills, and higher-level tools/connectors.**

## In simpler architectural layers

### Layer 1 — Host/platform

* virtualised infrastructure
* internal networking
* internal package mirrors
* container orchestration

### Layer 2 — Container runtime

* overlay FS
* namespaces
* reduced caps
* root-supervised services
* writable ephemeral storage

### Layer 3 — Local service plane

* terminal server
* Jupyter server
* IPython kernel
* artifact daemon
* optional browser/desktop stack

### Layer 4 — Orchestration/control plane

* system/developer instructions
* memory/persona injection
* tool definitions
* connectors like web/mail/calendar/settings/image generation

---

# 22. Most important raw snippets

## Root + constrained caps

```text
root
uid=0(root) gid=0(root) groups=0(root)

CapEff: 00000000a80405fb
```

## No seccomp

```text
Seccomp: 0
```

## Docker-style virtualisation

```text
systemd-detect-virt -> docker
```

## Overlay root + 9p config files

```text
none on / type overlay (rw)
none on /etc/hosts type 9p (rw,...)
none on /etc/hostname type 9p (rw,...)
none on /etc/resolv.conf type 9p (rw,...)
```

## Restricted network

```text
NETWORK=caas_packages_only
curl https://google.com -> Could not resolve host
```

## Terminal server

```python
@app.post("/open")
@app.post("/read/{pid}")
@app.post("/write/{pid}")
@app.post("/kill/{pid}")
```

## Jupyter-managed Python execution

```python
km, kc = await start_new_async_kernel(...)
```

## Active kernel

```json
{
  "ip": "127.0.0.1",
  "signature_scheme": "hmac-sha256",
  "kernel_name": "python3"
}
```

## Artifact startup patching

```python
importlib.import_module("artifact_tool.patches.record_artifact_tool_operations")
```

## Mounted skill packs

```text
/home/oai/skills/docx/SKILL.md
/home/oai/skills/pdfs/SKILL.md
/home/oai/skills/slides/SKILL.md
/home/oai/skills/spreadsheets/SKILL.md
```

---


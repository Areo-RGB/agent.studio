# Agent Config Studio — Implementation Plan

A high-performance, client-side developer workspace for creating, inspecting, organizing, and exporting configuration for AI coding agents across **Claude Code**, **Codex**, **Pi Coding Agent**, and **OpenCode**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during initial clarification and are locked into the architecture:

- **Confirmed Decision 1 (Starter Dataset)**: Pre-populate the local IndexedDB workspace on first launch with realistic, production-grade starter MCP servers (`fetch`, `sequential-thinking`, `memory`, `time`, `context7`), multi-file skills (e.g. `scientific-analysis`, `code-review-companion`), and tool-tailored prompt presets (`AGENTS.md`, `CLAUDE.md`, and Pi `APPEND_SYSTEM.md`).
- **Confirmed Decision 2 (Export Secret Redaction)**: Sensitive environment variables and authorization headers are masked with `"${YOUR_API_KEY}"` placeholder comments by default in all exports and previews, with a prominent 1-click toggle to include unmasked values when exporting locally.
- **Confirmed Decision 3 (Aesthetic Direction)**: Raycast and Linear inspired sleek dark theme default (subtle border hairlines, slate `#0a0d12` canvas, dense high-readability type, custom switch toggles, and zero-pill typographic metadata), with system/light theme support.
- **Mental Model Enforcement**: Strict adherence to the "Included in export" mental model. No button, label, or tooltip will ever state "Installed" or "Synced". Every download is accompanied by transparent manual installation instructions and config path references.

---

### 1. Overview & Core Concept

**Agent Config Studio** solves the configuration fragmentation problem across contemporary AI coding tools. Developers frequently configure MCP servers, agent skills (`SKILL.md`), and system prompt guidelines across distinct environments, each using incompatible file locations and configuration schemas (JSON vs. TOML, command arrays vs. string arguments, `env` vs. `environment`, `headers` vs. `http_headers`).

- **What It Does**: Provides a unified browser studio to author, organize, test-serialize, and bundle configs for the 4 major agent platforms without needing local disk permissions or backend servers.
- **Target Audience**: Software engineers, researchers, and AI toolmakers working with Claude Code, Codex, Pi, or OpenCode.
- **Key Value**: Guarantees syntax compliance per tool, prevents configuration invalidation (such as Codex rejecting `type = "stdio"` or Pi failing on SSE), provides instant export bundles, and maintains a private local workspace using Dexie (IndexedDB).

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Workspace Overview**: High-level telemetry of configured servers, skills, and prompts, tool matrix cards showing active inclusions, and one-click quick actions.
2. **MCP Server Management**:
   - High-density matrix table with 4 per-tool inclusion toggles and instant validation flags.
   - Rich drawer editor: transport selector (`stdio`, `HTTP`, `SSE`), command and arguments, dynamic key-value env editor with secret reveal, tool compatibility warnings, and live 4-tool preview tabs.
   - Config Importer: paste or drag-and-drop JSON/TOML, auto-format detection (Claude, Codex, OpenCode, Pi), conflict resolution (Skip, Replace, Rename), and batch tool assignment.
   - Quick Starter Templates: `mcp-server-fetch`, `mcp-server-time`, `@modelcontextprotocol/server-memory`, `@modelcontextprotocol/server-sequential-thinking`, `@upstash/context7-mcp`.
3. **Skills Library & Discovery**:
   - **Library Tab**: Table of installed browser skills with directory slug, description, tags, source repo, file tree count, and per-tool inclusion switches.
   - Skill Drawer / Editor: `SKILL.md` authoring with YAML frontmatter validator and live rendered preview; virtual file-tree manager for supporting files (`references/`, `scripts/`, `assets/`).
   - Import Modal: Single `SKILL.md`, multi-file upload, ZIP unpacker (detecting `SKILL.md` folders), or public GitHub repo fetcher.
   - **Discover Tab**: Configurable catalog browsing `anthropics/skills` and `ComposioHQ/awesome-claude-skills` with 1-click import and update diff checking.
4. **Prompts Studio**:
   - Tool selector tabs (Claude, Codex, Pi, OpenCode) enforcing the **single-active rule** per tool.
   - Dual-pane Markdown editor with split view, syntax highlighting, word/char metrics, and preset cloning.
   - Pi extras panel: dedicated authoring and export for `SYSTEM.md`, `APPEND_SYSTEM.md`, and prompt templates with clear behavioral explanations.
   - Cross-tool cloning: duplicate presets to other tools as independent copies.
5. **Export Center & Merge Suite**:
   - Ready-to-use export cards for all 4 tools.
   - Multi-mode exporter: individual files, per-tool ZIPs, or the complete Workspace Bundle (`export/claude/...`, `export/codex/...`, `export/pi/...`, `export/opencode/...`, `README.md`).
   - Interactive Export Preview: file tree inspector, syntax-highlighted code viewer, secret masking toggle, and safe config merge utility (preserving unrelated keys and comments).
6. **Settings & Backup**: Theme toggle, storage usage calculator, full workspace JSON export/import, and safe reset.

#### B. Visual Identity & Palette
- **Canvas Neutrals**: Deep slate `#0a0d14` (dark) / `#f8fafc` (light), `#121721` structural card surfaces, `#1e2638` subtle hairline borders.
- **Accents**: Indigo `#6366f1` / Blue `#3b82f6` for primary intents; Emerald `#10b981` for export inclusions; Amber `#f59e0b` for compatibility warnings.
- **Typography**: Clean sans-serif hierarchy (`Plus Jakarta Sans` / `Manrope`) paired with tabular monospace numerals (`JetBrains Mono` / `tabular-nums`) for configs, ports, and row counts.
- **Anti-Slop Discipline**: No arbitrary pill badge sandwiches, no fake latency meters, and no code-comment titles. Clean typography with subtle dividers.

---

### 3. Key Product Decisions & Trade-Offs

- **Dexie.js (IndexedDB) for Local Persistence**:
  - *Chosen Approach*: Multi-table IndexedDB database (`mcp_servers`, `skills`, `prompts`, `settings`, `revisions`) with full offline availability.
  - *Why*: Supports multi-megabyte skill bundles (supporting markdown, scripts, JSON data) without the 5MB browser `localStorage` bottleneck.
- **Strict Format Serializers & Codex Compliance**:
  - *Chosen Approach*: Distinct validated serializers for each tool. Codex serializer outputs standard TOML without `type` fields (which break Codex $\ge 0.158$) and maps HTTP headers to `http_headers`. OpenCode serializer combines `command` and `args` into a single array and uses `environment`. Pi serializer rejects unsupported SSE transports.
  - *Why*: AI tools fail silently or crash if invalid keys exist in user configs.
- **Comment-Preserving Merging**:
  - *Chosen Approach*: When users upload an existing `config.toml` or `.claude.json`, the app intelligently splices updated sections while preserving unrelated user settings and comments. If a structural merge risks corruption, it emits a non-destructive labeled snippet.
- **Pure Client-Side In-Memory ZIP Generation (JSZip)**:
  - *Chosen Approach*: Instant in-browser ZIP generation with proper directory structures, MIME types, and automated README guides.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Agent Config Studio UI                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Top Bar: Title · Global Search · Quick Add · Redaction · Export    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────┬─────────────────────────────────────────────────────┐ │
│ │ Sidebar Nav  │ Main Viewport Content                               │ │
│ │ • Overview   │ • MCP Matrix & Config Drawer                        │ │
│ │ • MCP        │ • Skills Library & GitHub Discover                  │ │
│ │ • Skills     │ • Prompts Editor & Pi Extras                        │ │
│ │ • Prompts    │ • Export Center & Bundle Previewer                  │ │
│ │ • Exports    │ • Settings & JSON Backup / Restore                  │ │
│ │ • Settings   │                                                     │ │
│ └──────────────┴─────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                                           ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│     Dexie.js Database     │               │   Tool Config Engines     │
│ • mcp_servers             │               │ • Claude Code Serializer  │
│ • skills (with virtual FS)│               │ • Codex TOML Serializer   │
│ • prompts (single-active) │               │ • Pi JSON Serializer      │
│ • app_settings            │               │ • OpenCode Serializer     │
└───────────────────────────┘               │ • JSZip Bundle Generator  │
                                            └───────────────────────────┘
```

#### Exact Tool Specification & File Target Matrix

| Tool | Target MCP Config | Transport Rules | Skill Dir | Prompt Location |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | `~/.claude.json` (`mcpServers` map) | `command`, `args`, `env` (stdio) or `type` (`http`/`sse`), `url`, `headers` | `~/.claude/skills/<slug>/` | `~/.claude/CLAUDE.md` |
| **Codex** | `~/.codex/config.toml` (`[mcp_servers.<id>]`) | **NO `type` attribute**. `command` (stdio) or `url` + `http_headers`. No SSE. | `~/.codex/skills/<slug>/` | `~/.codex/AGENTS.md` |
| **Pi** | `~/.pi/agent/mcp.json` (`mcpServers` map) | `enabled: true`. Stdio & HTTP. **Reject SSE**. | `~/.pi/agent/skills/<slug>/` | `~/.pi/agent/AGENTS.md` + `SYSTEM.md` + `APPEND_SYSTEM.md` |
| **OpenCode** | `~/.config/opencode/opencode.json` (`mcp` map) | `type: "local"` with combined `command: [bin, ...args]` and `environment` key. `type: "remote"` with `url`, `headers`. | `~/.config/opencode/skills/<slug>/` | `~/.config/opencode/AGENTS.md` |

#### Workspace Bundle Structure (Generated ZIP)
```
export/
  claude/
    mcp-config-snippet.json
    CLAUDE.md
    skills/<skill-slug>/SKILL.md (+ sibling files)
  codex/
    mcp-config-snippet.toml
    AGENTS.md
    skills/<skill-slug>/SKILL.md (+ sibling files)
  pi/
    mcp.json
    AGENTS.md
    APPEND_SYSTEM.md (if configured)
    skills/<skill-slug>/SKILL.md (+ sibling files)
  opencode/
    opencode-snippet.json
    AGENTS.md
    skills/<skill-slug>/SKILL.md (+ sibling files)
  README.md  (comprehensive step-by-step manual setup & backup guidance)
```

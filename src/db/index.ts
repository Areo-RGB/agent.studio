import Dexie, { type Table } from 'dexie';
import type { McpServer, Skill, PromptPreset, UserSettings } from '../types';

export class AgentConfigDatabase extends Dexie {
  mcp_servers!: Table<McpServer, string>;
  skills!: Table<Skill, string>;
  prompts!: Table<PromptPreset, string>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('AgentConfigStudioDB');
    this.version(1).stores({
      mcp_servers: '&id, name, transport, createdAt, updatedAt',
      skills: '&id, slug, name, sourceRepo, createdAt, updatedAt',
      prompts: '&id, tool, type, isActive, createdAt, updatedAt',
      settings: '&key'
    });
  }
}

export const db = new AgentConfigDatabase();

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  maskSecretsInExport: true,
  customRepos: ['anthropics/skills', 'ComposioHQ/awesome-claude-skills']
};

export async function getSettings(): Promise<UserSettings> {
  const row = await db.settings.get('user_settings');
  if (row && row.value) {
    return { ...DEFAULT_SETTINGS, ...(row.value as Partial<UserSettings>) };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({
    key: 'user_settings',
    value: { ...current, ...settings }
  });
}

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  const serverCount = await db.mcp_servers.count();
  if (serverCount > 0) {
    return false;
  }

  const now = Date.now();

  const starterServers: McpServer[] = [
    {
      id: 'fetch',
      name: 'Fetch MCP Server',
      description: 'Web content and API fetching server for fetching web pages and extracting readable content.',
      tags: ['web', 'http', 'scraping'],
      homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
      docsUrl: 'https://modelcontextprotocol.io',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      env: {
        USER_AGENT: 'AgentConfigStudio/1.0 (Developer Tool)'
      },
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now - 50000,
      updatedAt: now - 50000
    },
    {
      id: 'time',
      name: 'Time MCP Server',
      description: 'Provides current time queries and conversions across global timezones.',
      tags: ['utility', 'time', 'dates'],
      homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-time', '--local-timezone=UTC'],
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now - 40000,
      updatedAt: now - 40000
    },
    {
      id: 'memory',
      name: 'Memory Graph Server',
      description: 'Knowledge graph memory system for maintaining context and entity relationships across sessions.',
      tags: ['knowledge-graph', 'memory', 'persistence'],
      homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {
        MEMORY_STORE_PATH: '~/.cache/mcp-memory.json'
      },
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now - 30000,
      updatedAt: now - 30000
    },
    {
      id: 'sequential-thinking',
      name: 'Sequential Thinking',
      description: 'Dynamic structured problem solving via step-by-step reasoning and hypothesis revision.',
      tags: ['reasoning', 'planning', 'problem-solving'],
      homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now - 20000,
      updatedAt: now - 20000
    },
    {
      id: 'context7',
      name: 'Context7 Upstash MCP',
      description: 'Remote live context retrieval server over streamable HTTP.',
      tags: ['remote', 'context', 'http'],
      homepageUrl: 'https://upstash.com/docs/context7',
      transport: 'http',
      url: 'https://context7.upstash.io/mcp',
      headers: {
        Authorization: 'Bearer ${UPSTASH_CONTEXT7_API_KEY}'
      },
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now - 10000,
      updatedAt: now - 10000
    }
  ];

  const starterSkills: Skill[] = [
    {
      id: 'code-review-companion',
      slug: 'code-review-companion',
      name: 'Code Review Companion',
      description: 'Rigorous architectural code review auditor with automated security checklist.',
      tags: ['quality', 'audit', 'security'],
      category: 'Engineering',
      sourceRepo: 'anthropics/skills',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/code-review',
      contentHash: 'a8b3c9d1e2f3',
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      files: [
        {
          path: 'SKILL.md',
          content: `---
name: Code Review Companion
description: Thorough, objective review of git diffs and pull requests focusing on correctness, security, and performance.
---

# Code Review Companion

When analyzing code diffs or performing pull reviews:

## Core Review Protocol
1. **Correctness First**: Verify invariants, edge cases (empty collections, nil/null pointers, concurrency races), and boundary conditions.
2. **Security Checks**: Validate input boundaries, injection prevention, sensitive secret leakage, and credential exposures.
3. **Performance & Memory**: Audit database N+1 queries, unindexed filters, unbounded loops, and memory leak vectors.

Refer to \`references/checklist.md\` for the exhaustive categorization rubric before yielding conclusions.
`
        },
        {
          path: 'references/checklist.md',
          content: `# Code Review Verification Checklist

- [ ] Zero unhandled promise rejections or unchecked errors
- [ ] Concurrency: mutex guards or atomic operations where state is shared
- [ ] Secrets: No API keys, credentials, or session tokens in plain text
- [ ] API Design: Idempotency keys present on non-safe mutation endpoints
- [ ] Backward compatibility: Non-breaking database schema transitions
`
        }
      ],
      createdAt: now - 35000,
      updatedAt: now - 35000
    },
    {
      id: 'frontend-design-guardrails',
      slug: 'frontend-design-guardrails',
      name: 'Frontend Design Guardrails',
      description: 'Design constitution enforcing zero-pill discipline, optical balance, and anti-slop rules.',
      tags: ['ui', 'design-system', 'tailwind'],
      category: 'Design',
      sourceRepo: 'ComposioHQ/awesome-claude-skills',
      sourceUrl: 'https://github.com/ComposioHQ/awesome-claude-skills',
      contentHash: 'f4e5d6c7b8a9',
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      files: [
        {
          path: 'SKILL.md',
          content: `---
name: Frontend Design Guardrails
description: Architectural UI design constitution for building distinctive, production-grade web interfaces without generic AI tropes.
---

# Frontend Design Guardrails

Adhere strictly to modern developer ergonomics:
- **Zero-Pill Discipline**: Metadata is rendered as clean unboxed text with typographic separators (\`·\`), not colored capsule badges.
- **Top Bar Contract**: Exactly 1-line wordmark, 4-5 text nav links, and 1 primary action button.
- **Tabular Figures**: Every numeric figure, port number, or telemetry value uses \`font-mono tabular-nums\`.
- **High-Density Spacing**: Outer padding always exceeds inner child gaps.
`
        },
        {
          path: 'assets/design-tokens.json',
          content: JSON.stringify({
            spacing: { outer: '1.5rem', inner: '1rem', rowHeight: '2.5rem' },
            radii: { outer: '0.75rem', inner: '0.5rem' },
            fonts: { sans: 'Plus Jakarta Sans', mono: 'JetBrains Mono' }
          }, null, 2)
        }
      ],
      createdAt: now - 25000,
      updatedAt: now - 25000
    },
    {
      id: 'python-sandbox-executor',
      slug: 'python-sandbox-executor',
      name: 'Python Sandbox Executor',
      description: 'Guidelines and verification harness for executing isolated mathematical and scientific scripts.',
      tags: ['python', 'scripting', 'benchmarks'],
      category: 'Runtime',
      sourceRepo: 'Local',
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      files: [
        {
          path: 'SKILL.md',
          content: `---
name: Python Sandbox Executor
description: Standards for running fast, deterministic benchmarks and data validations inside isolated environments.
---

# Python Sandbox Executor

Always run deterministic evaluations with timeouts:
\`\`\`bash
python -m py_compile script.py
python scripts/benchmark.py
\`\`\`
`
        },
        {
          path: 'scripts/benchmark.py',
          content: `import time

def run_sample_benchmark():
    t0 = time.perf_counter()
    res = sum(i * i for i in range(100_000))
    t1 = time.perf_counter()
    print(f"Computed {res} in {(t1 - t0)*1000:.2f}ms")

if __name__ == "__main__":
    run_sample_benchmark()
`
        }
      ],
      createdAt: now - 15000,
      updatedAt: now - 15000
    }
  ];

  const starterPrompts: PromptPreset[] = [
    {
      id: 'claude-system-default',
      tool: 'claude',
      type: 'system',
      name: 'Production Systems Engineer',
      description: 'Primary system prompt for Claude Code (~/.claude/CLAUDE.md) enforcing rigorous architectural hygiene.',
      tags: ['production', 'architecture', 'typescript'],
      isActive: true,
      content: `# Claude Code Engineering Directives

You are the senior staff engineer on this codebase.

## Principles
1. **Concise Action**: Prioritize executable changes over conversational padding.
2. **Type Safety**: Strictly avoid \`any\`. Use exhaustive discriminated unions and runtime schemas.
3. **No Dead Controls**: Every UI button or route must have a complete working handler.
4. **Verification**: Always run lint and compile checks before concluding a task.
`,
      createdAt: now - 30000,
      updatedAt: now - 30000
    },
    {
      id: 'codex-system-default',
      tool: 'codex',
      type: 'system',
      name: 'Autonomous Refactoring Specialist',
      description: 'Primary system prompt for Codex (~/.codex/AGENTS.md) focusing on clean refactoring loops.',
      tags: ['refactoring', 'codex', 'clean-code'],
      isActive: true,
      content: `# Codex Agent Instructions

You are an automated code assistant operating via Codex CLI.

## Workflow Rules
- Read and verify existing file trees before proposing structural file edits.
- Use atomic, self-contained git commits where applicable.
- Never modify unrelated configuration files or strip user comments.
`,
      createdAt: now - 20000,
      updatedAt: now - 20000
    },
    {
      id: 'pi-system-default',
      tool: 'pi',
      type: 'system',
      name: 'Strict TDD Specialist',
      description: 'Primary system prompt for Pi Coding Agent (~/.pi/agent/AGENTS.md).',
      tags: ['tdd', 'testing', 'pi-agent'],
      isActive: true,
      content: `# Pi Coding Agent: Test-Driven Directives

Operate in strict Red-Green-Refactor cycles:
1. Write failing automated tests covering requirements and edge cases.
2. Implement the minimal clean code to make tests pass.
3. Refactor with zero regression.
`,
      createdAt: now - 15000,
      updatedAt: now - 15000
    },
    {
      id: 'pi-append-system-default',
      tool: 'pi',
      type: 'append_system',
      name: 'Team Style Appendix',
      description: 'Pi APPEND_SYSTEM.md: appended to the base system prompt without replacing it.',
      tags: ['style', 'appendix'],
      isActive: true,
      content: `## Additional Team Directives (APPEND_SYSTEM)

- Always format code with Prettier standard rules (2 spaces, single quotes).
- Ensure all public functions include concise docstrings explaining non-obvious constraints.
`,
      createdAt: now - 10000,
      updatedAt: now - 10000
    },
    {
      id: 'opencode-system-default',
      tool: 'opencode',
      type: 'system',
      name: 'Full-Stack Polyglot',
      description: 'Primary instructions for OpenCode (~/.config/opencode/AGENTS.md).',
      tags: ['opencode', 'polyglot', 'full-stack'],
      isActive: true,
      content: `# OpenCode Agent Protocol

- Maintain modular service layers and separate domain business logic from framework bindings.
- Validate environment variables explicitly at process boot.
- Keep dependency additions minimal and scrutinize license compatibility.
`,
      createdAt: now - 5000,
      updatedAt: now - 5000
    }
  ];

  await db.mcp_servers.bulkAdd(starterServers);
  await db.skills.bulkAdd(starterSkills);
  await db.prompts.bulkAdd(starterPrompts);
  await db.settings.put({ key: 'user_settings', value: DEFAULT_SETTINGS });

  return true;
}

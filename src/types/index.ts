export type ToolId = 'claude' | 'codex' | 'pi' | 'opencode';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortName: string;
  configFileName: string;
  configPathDisplay: string;
  skillsPathDisplay: string;
  promptPathDisplay: string;
  format: 'json' | 'toml';
  badgeColor: string;
  description: string;
  docNotes: string;
}

export const TOOLS: Record<ToolId, ToolDefinition> = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    shortName: 'Claude',
    configFileName: '.claude.json',
    configPathDisplay: '~/.claude.json',
    skillsPathDisplay: '~/.claude/skills/',
    promptPathDisplay: '~/.claude/CLAUDE.md',
    format: 'json',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    description: 'Anthropic CLI agent using ~/.claude.json with mcpServers JSON map.',
    docNotes: 'Uses JSON mcpServers map. Supports stdio (command, args, env) and remote (type: "http"|"sse", url, headers).'
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    shortName: 'Codex',
    configFileName: 'config.toml',
    configPathDisplay: '~/.codex/config.toml',
    skillsPathDisplay: '~/.codex/skills/',
    promptPathDisplay: '~/.codex/AGENTS.md',
    format: 'toml',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    description: 'Codex CLI agent using ~/.codex/config.toml with [mcp_servers.<id>] TOML tables.',
    docNotes: 'Transport inferred: command for stdio, url for HTTP. Never emit type="stdio" (breaks Codex >=0.158). Uses http_headers.'
  },
  pi: {
    id: 'pi',
    name: 'Pi Coding Agent',
    shortName: 'Pi',
    configFileName: 'mcp.json',
    configPathDisplay: '~/.pi/agent/mcp.json',
    skillsPathDisplay: '~/.pi/agent/skills/',
    promptPathDisplay: '~/.pi/agent/AGENTS.md',
    format: 'json',
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    description: 'Pi Agent using ~/.pi/agent/mcp.json with enabled flags. Rejects SSE.',
    docNotes: 'Uses JSON mcpServers with enabled: true. Supports stdio & HTTP. SSE is rejected. Supports SYSTEM.md & APPEND_SYSTEM.md.'
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    shortName: 'OpenCode',
    configFileName: 'opencode.json',
    configPathDisplay: '~/.config/opencode/opencode.json',
    skillsPathDisplay: '~/.config/opencode/skills/',
    promptPathDisplay: '~/.config/opencode/AGENTS.md',
    format: 'json',
    badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    description: 'OpenCode using ~/.config/opencode/opencode.json with mcp object.',
    docNotes: 'Command is a single array [bin, ...args]. Environment key is "environment". Type is "local" or "remote".'
  }
};

export type McpTransport = 'stdio' | 'http' | 'sse';

export interface McpServer {
  id: string; // unique slug e.g. "fetch"
  name: string;
  description: string;
  tags: string[];
  homepageUrl?: string;
  docsUrl?: string;
  transport: McpTransport;
  // stdio fields
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  workingDir?: string;
  // remote fields
  url?: string;
  headers?: Record<string, string>;
  // per-tool inclusion toggles
  toolsEnabled: Record<ToolId, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface SkillFile {
  path: string; // e.g. "SKILL.md", "references/api.md", "scripts/test.sh"
  content: string;
}

export interface Skill {
  id: string; // unique slug
  slug: string;
  name: string;
  description: string;
  tags: string[];
  category?: string;
  sourceRepo?: string; // e.g. "anthropics/skills"
  sourceUrl?: string;
  contentHash?: string;
  hasUpdate?: boolean;
  files: SkillFile[];
  toolsEnabled: Record<ToolId, boolean>;
  createdAt: number;
  updatedAt: number;
}

export type PromptType = 'system' | 'append_system' | 'template';

export interface PromptPreset {
  id: string;
  tool: ToolId;
  type: PromptType;
  name: string;
  description: string;
  content: string;
  tags: string[];
  isActive: boolean; // Single active per tool and type
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  maskSecretsInExport: boolean;
  customRepos: string[];
}

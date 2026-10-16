import type { McpServer, McpTransport, ToolId } from '../../types';

export interface ImportedMcpCandidate {
  id: string;
  name: string;
  description: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  detectedSource: 'claude' | 'codex' | 'pi' | 'opencode' | 'generic';
  isValid: boolean;
  error?: string;
  selectedAction: 'replace' | 'rename' | 'skip';
  newId?: string;
  existsInDb?: boolean;
  toolsEnabled: Record<ToolId, boolean>;
}

/**
 * Lightweight browser TOML reader for [mcp_servers.*] and [mcp.servers.*] tables.
 */
function parseTomlMcp(tomlText: string): Record<string, Record<string, unknown>> {
  const lines = tomlText.split(/\r?\n/);
  const result: Record<string, Record<string, unknown>> = {};
  let currentServerId: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Match [mcp_servers.<id>] or [mcp.servers.<id>]
    const headerMatch = line.match(/^\[(?:mcp_servers|mcp\.servers)\.([a-zA-Z0-9_\-."']+)\]$/);
    if (headerMatch) {
      let id = headerMatch[1].trim();
      if ((id.startsWith('"') && id.endsWith('"')) || (id.startsWith("'") && id.endsWith("'"))) {
        id = id.slice(1, -1);
      }
      currentServerId = id;
      if (!result[currentServerId]) {
        result[currentServerId] = {};
      }
      continue;
    }

    // Match other section header -> stop current server
    if (line.startsWith('[')) {
      currentServerId = null;
      continue;
    }

    if (currentServerId) {
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const rawVal = line.slice(eqIdx + 1).trim();

        // Parse basic values: strings, arrays, inline tables
        if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
          result[currentServerId][key] = rawVal.slice(1, -1);
        } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
          result[currentServerId][key] = rawVal.slice(1, -1);
        } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          // Parse string array
          try {
            // Convert to JSON-compatible array
            const jsonified = rawVal.replace(/'/g, '"');
            result[currentServerId][key] = JSON.parse(jsonified);
          } catch {
            result[currentServerId][key] = [];
          }
        } else if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
          // Parse inline table
          const inner = rawVal.slice(1, -1).trim();
          const table: Record<string, string> = {};
          if (inner) {
            const pairs = inner.split(',');
            for (const pair of pairs) {
              const [k, v] = pair.split('=').map((s) => s.trim());
              if (k && v) {
                const cleanV = v.replace(/^['"]|['"]$/g, '');
                table[k] = cleanV;
              }
            }
          }
          result[currentServerId][key] = table;
        } else if (rawVal === 'true' || rawVal === 'false') {
          result[currentServerId][key] = rawVal === 'true';
        } else {
          result[currentServerId][key] = rawVal;
        }
      }
    }
  }

  return result;
}

export function detectAndParseMcpConfig(
  rawInput: string,
  existingServers: McpServer[]
): {
  detectedFormat: 'claude' | 'codex' | 'pi' | 'opencode' | 'unknown';
  candidates: ImportedMcpCandidate[];
  parseError?: string;
} {
  const existingMap = new Map(existingServers.map((s) => [s.id, s]));
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { detectedFormat: 'unknown', candidates: [], parseError: 'Input is empty.' };
  }

  // 1. Check if TOML
  if (trimmed.includes('[mcp_servers.') || trimmed.includes('[mcp.servers.')) {
    try {
      const parsedTables = parseTomlMcp(trimmed);
      const candidates: ImportedMcpCandidate[] = [];

      for (const [id, data] of Object.entries(parsedTables)) {
        const isUrl = typeof data.url === 'string' && data.url.length > 0;
        const transport: McpTransport = isUrl ? 'http' : 'stdio';
        const exists = existingMap.has(id);

        let isValid = true;
        let error: string | undefined;

        if (transport === 'stdio' && typeof data.command !== 'string') {
          isValid = false;
          error = 'Missing "command" string for stdio server.';
        } else if (transport === 'http' && !data.url) {
          isValid = false;
          error = 'Missing "url" for HTTP server.';
        }

        const candidate: ImportedMcpCandidate = {
          id,
          name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `Imported from Codex configuration (${id})`,
          transport,
          command: typeof data.command === 'string' ? data.command : undefined,
          args: Array.isArray(data.args) ? (data.args as string[]) : undefined,
          env: typeof data.env === 'object' && data.env !== null ? (data.env as Record<string, string>) : undefined,
          url: typeof data.url === 'string' ? data.url : undefined,
          headers:
            typeof data.http_headers === 'object' && data.http_headers !== null
              ? (data.http_headers as Record<string, string>)
              : undefined,
          detectedSource: 'codex',
          isValid,
          error,
          existsInDb: exists,
          selectedAction: exists ? 'rename' : 'replace',
          newId: exists ? `${id}-imported` : undefined,
          toolsEnabled: { claude: true, codex: true, pi: true, opencode: true }
        };
        candidates.push(candidate);
      }

      return { detectedFormat: 'codex', candidates };
    } catch (e: unknown) {
      return { detectedFormat: 'codex', candidates: [], parseError: `Failed parsing Codex TOML: ${String(e)}` };
    }
  }

  // 2. Try JSON
  try {
    const parsed = JSON.parse(trimmed);
    const candidates: ImportedMcpCandidate[] = [];

    // Check OpenCode: { mcp: { ... } }
    if (parsed.mcp && typeof parsed.mcp === 'object' && !Array.isArray(parsed.mcp)) {
      for (const [id, dataRaw] of Object.entries(parsed.mcp)) {
        const data = dataRaw as Record<string, unknown>;
        const isLocal = data.type === 'local' || Array.isArray(data.command);
        const transport: McpTransport = isLocal ? 'stdio' : 'http';
        const exists = existingMap.has(id);

        let command: string | undefined;
        let args: string[] | undefined;

        if (Array.isArray(data.command)) {
          command = data.command[0];
          args = data.command.slice(1);
        } else if (typeof data.command === 'string') {
          command = data.command;
        }

        const candidate: ImportedMcpCandidate = {
          id,
          name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `Imported from OpenCode configuration (${id})`,
          transport,
          command,
          args,
          env: typeof data.environment === 'object' ? (data.environment as Record<string, string>) : undefined,
          url: typeof data.url === 'string' ? data.url : undefined,
          headers: typeof data.headers === 'object' ? (data.headers as Record<string, string>) : undefined,
          detectedSource: 'opencode',
          isValid: Boolean((transport === 'stdio' && command) || (transport === 'http' && data.url)),
          existsInDb: exists,
          selectedAction: exists ? 'rename' : 'replace',
          newId: exists ? `${id}-imported` : undefined,
          toolsEnabled: { claude: true, codex: true, pi: true, opencode: true }
        };
        candidates.push(candidate);
      }
      return { detectedFormat: 'opencode', candidates };
    }

    // Check Claude or Pi: { mcpServers: { ... } }
    let rawServersMap: Record<string, unknown> | null = null;
    let isPi = false;

    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
      rawServersMap = parsed.mcpServers;
    } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Check if it's a direct dictionary of servers
      const sampleKey = Object.keys(parsed)[0];
      if (sampleKey && typeof parsed[sampleKey] === 'object' && ('command' in parsed[sampleKey] || 'url' in parsed[sampleKey])) {
        rawServersMap = parsed;
      }
    }

    if (rawServersMap) {
      for (const [id, dataRaw] of Object.entries(rawServersMap)) {
        const data = dataRaw as Record<string, unknown>;
        if (data.enabled !== undefined) {
          isPi = true;
        }

        const transport: McpTransport =
          data.type === 'sse'
            ? 'sse'
            : data.type === 'http' || typeof data.url === 'string'
              ? 'http'
              : 'stdio';

        const exists = existingMap.has(id);
        const command = typeof data.command === 'string' ? data.command : undefined;
        const args = Array.isArray(data.args) ? (data.args as string[]) : undefined;
        const env = typeof data.env === 'object' ? (data.env as Record<string, string>) : undefined;
        const url = typeof data.url === 'string' ? data.url : undefined;
        const headers = typeof data.headers === 'object' ? (data.headers as Record<string, string>) : undefined;

        const isValid = Boolean((transport === 'stdio' && command) || ((transport === 'http' || transport === 'sse') && url));

        candidates.push({
          id,
          name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `Imported server (${id})`,
          transport,
          command,
          args,
          env,
          url,
          headers,
          detectedSource: isPi ? 'pi' : 'claude',
          isValid,
          error: isValid ? undefined : 'Missing required command or url.',
          existsInDb: exists,
          selectedAction: exists ? 'rename' : 'replace',
          newId: exists ? `${id}-imported` : undefined,
          toolsEnabled: { claude: true, codex: true, pi: transport !== 'sse', opencode: true }
        });
      }
      return { detectedFormat: isPi ? 'pi' : 'claude', candidates };
    }

    return { detectedFormat: 'unknown', candidates: [], parseError: 'Unrecognized JSON structure. Expected "mcpServers" or "mcp" object.' };
  } catch (err: unknown) {
    return { detectedFormat: 'unknown', candidates: [], parseError: `Invalid JSON syntax: ${String(err)}` };
  }
}

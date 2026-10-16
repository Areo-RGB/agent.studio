import type { McpServer } from '../../types';
import { maskEnv, maskHeaders } from './secretRedactor';

function escapeTomlString(str: string): string {
  return JSON.stringify(str);
}

function formatInlineTomlTable(record: Record<string, string>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) return '{}';
  const pairs = entries.map(([k, v]) => {
    // If valid bare key
    const safeKey = /^[a-zA-Z0-9_-]+$/.test(k) ? k : escapeTomlString(k);
    return `${safeKey} = ${escapeTomlString(v)}`;
  });
  return `{ ${pairs.join(', ')} }`;
}

function formatTomlArray(arr: string[]): string {
  if (arr.length === 0) return '[]';
  return `[${arr.map(escapeTomlString).join(', ')}]`;
}

/**
 * Serializes MCP servers into Codex ~/.codex/config.toml tables.
 * CRITICAL: NEVER emit `type` field! Transport is inferred by presence of `command` or `url`.
 * Uses `http_headers` rather than `headers`.
 */
export function serializeCodexMcp(
  servers: McpServer[],
  options: { maskSecrets?: boolean } = {}
): { tomlString: string; warnings: string[]; serverCount: number } {
  const { maskSecrets = true } = options;
  const warnings: string[] = [];
  const lines: string[] = [];

  const enabledServers = servers.filter((s) => s.toolsEnabled.codex);

  for (let i = 0; i < enabledServers.length; i++) {
    const server = enabledServers[i];

    if (server.transport === 'sse') {
      warnings.push(`Codex does not standardly support SSE transport for "${server.name}" (${server.id}). It will be emitted as HTTP URL, but may fail if SSE is required.`);
    }

    // Codex requires table header: [mcp_servers.<id>]
    // Ensure id is properly quoted if needed
    const safeId = /^[a-zA-Z0-9_-]+$/.test(server.id) ? server.id : escapeTomlString(server.id);
    lines.push(`[mcp_servers.${safeId}]`);

    if (server.transport === 'stdio') {
      if (!server.command) {
        warnings.push(`Server "${server.name}" (${server.id}) has no command specified for Codex.`);
        continue;
      }
      lines.push(`command = ${escapeTomlString(server.command)}`);

      if (server.args && server.args.length > 0) {
        lines.push(`args = ${formatTomlArray(server.args)}`);
      }

      const maskedEnv = maskEnv(server.env, maskSecrets);
      if (maskedEnv && Object.keys(maskedEnv).length > 0) {
        lines.push(`env = ${formatInlineTomlTable(maskedEnv)}`);
      }
    } else {
      // Remote http / sse
      if (!server.url) {
        warnings.push(`Server "${server.name}" (${server.id}) has no URL specified for Codex.`);
        continue;
      }
      lines.push(`url = ${escapeTomlString(server.url)}`);

      const maskedHeaders = maskHeaders(server.headers, maskSecrets);
      if (maskedHeaders && Object.keys(maskedHeaders).length > 0) {
        lines.push(`http_headers = ${formatInlineTomlTable(maskedHeaders)}`);
      }
    }

    if (i < enabledServers.length - 1) {
      lines.push('');
    }
  }

  return {
    tomlString: lines.join('\n'),
    warnings,
    serverCount: enabledServers.length
  };
}

/**
 * Merges newly generated [mcp_servers.*] tables into an existing config.toml,
 * preserving existing non-mcp tables, global keys, and user comments.
 */
export function mergeCodexToml(existingContent: string, newSnippetToml: string): string {
  if (!existingContent.trim()) {
    return newSnippetToml;
  }

  // Parse lines, strip existing [mcp_servers.*] or legacy [mcp.servers.*] blocks
  const existingLines = existingContent.split(/\r?\n/);
  const preservedLines: string[] = [];
  let skippingMcpSection = false;

  for (let i = 0; i < existingLines.length; i++) {
    const line = existingLines[i];
    const trimmed = line.trim();

    // Check if entering an mcp section
    if (
      trimmed.startsWith('[mcp_servers.') ||
      trimmed.startsWith('["mcp_servers.') ||
      trimmed.startsWith('[mcp.servers.') ||
      trimmed.startsWith('["mcp.servers.')
    ) {
      skippingMcpSection = true;
      continue;
    }

    // Check if entering another top-level section like [models], [general], etc.
    if (trimmed.startsWith('[') && !trimmed.startsWith('[[')) {
      if (!trimmed.startsWith('[mcp_servers.') && !trimmed.startsWith('[mcp.servers.')) {
        skippingMcpSection = false;
      }
    }

    if (!skippingMcpSection) {
      preservedLines.push(line);
    }
  }

  // Remove trailing blank lines from preserved content
  while (preservedLines.length > 0 && preservedLines[preservedLines.length - 1].trim() === '') {
    preservedLines.pop();
  }

  return [
    ...preservedLines,
    '',
    '# --- Agent Config Studio: Managed MCP Servers ---',
    newSnippetToml.trim(),
    ''
  ].join('\n');
}

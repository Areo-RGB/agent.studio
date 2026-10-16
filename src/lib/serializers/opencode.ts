import type { McpServer } from '../../types';
import { maskEnv, maskHeaders } from './secretRedactor';

export interface OpenCodeLocalEntry {
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
  enabled: boolean;
}

export interface OpenCodeRemoteEntry {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

export type OpenCodeMcpEntry = OpenCodeLocalEntry | OpenCodeRemoteEntry;

export function serializeOpenCodeMcp(
  servers: McpServer[],
  options: { maskSecrets?: boolean; fullEnvelope?: boolean } = {}
): { jsonString: string; warnings: string[]; serverCount: number } {
  const { maskSecrets = true, fullEnvelope = true } = options;
  const warnings: string[] = [];
  const mcpMap: Record<string, OpenCodeMcpEntry> = {};

  const enabledServers = servers.filter((s) => s.toolsEnabled.opencode);

  for (const server of enabledServers) {
    if (server.transport === 'stdio') {
      if (!server.command) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a command for OpenCode.`);
        continue;
      }
      const combinedCommand = [server.command, ...(server.args || [])];
      const entry: OpenCodeLocalEntry = {
        type: 'local',
        command: combinedCommand,
        environment: maskEnv(server.env, maskSecrets),
        enabled: true
      };
      if (!entry.environment || Object.keys(entry.environment).length === 0) {
        delete entry.environment;
      }
      mcpMap[server.id] = entry;
    } else {
      // http or sse
      if (!server.url) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a URL for OpenCode.`);
        continue;
      }
      const entry: OpenCodeRemoteEntry = {
        type: 'remote',
        url: server.url,
        headers: maskHeaders(server.headers, maskSecrets),
        enabled: true
      };
      if (!entry.headers || Object.keys(entry.headers).length === 0) {
        delete entry.headers;
      }
      mcpMap[server.id] = entry;
    }
  }

  const outputObject = fullEnvelope ? { mcp: mcpMap } : mcpMap;
  return {
    jsonString: JSON.stringify(outputObject, null, 2),
    warnings,
    serverCount: Object.keys(mcpMap).length
  };
}

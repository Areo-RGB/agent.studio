import type { McpServer } from '../../types';
import { maskEnv, maskHeaders } from './secretRedactor';

export interface PiMcpStdio {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface PiMcpRemote {
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

export type PiMcpEntry = PiMcpStdio | PiMcpRemote;

export function serializePiMcp(
  servers: McpServer[],
  options: { maskSecrets?: boolean; fullEnvelope?: boolean } = {}
): { jsonString: string; warnings: string[]; serverCount: number } {
  const { maskSecrets = true, fullEnvelope = true } = options;
  const warnings: string[] = [];
  const mcpServersMap: Record<string, PiMcpEntry> = {};

  const enabledServers = servers.filter((s) => s.toolsEnabled.pi);

  for (const server of enabledServers) {
    if (server.transport === 'sse') {
      warnings.push(`Pi Coding Agent rejects SSE transport for "${server.name}" (${server.id}). Only stdio and streamable HTTP are supported. This server was omitted from the Pi export.`);
      continue;
    }

    if (server.transport === 'stdio') {
      if (!server.command) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a command for Pi.`);
        continue;
      }
      const entry: PiMcpStdio = {
        command: server.command,
        args: server.args && server.args.length > 0 ? server.args : undefined,
        env: maskEnv(server.env, maskSecrets),
        enabled: true
      };
      if (!entry.args) delete entry.args;
      if (!entry.env || Object.keys(entry.env).length === 0) delete entry.env;
      mcpServersMap[server.id] = entry;
    } else if (server.transport === 'http') {
      if (!server.url) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a URL for Pi.`);
        continue;
      }
      const entry: PiMcpRemote = {
        url: server.url,
        headers: maskHeaders(server.headers, maskSecrets),
        enabled: true
      };
      if (!entry.headers || Object.keys(entry.headers).length === 0) delete entry.headers;
      mcpServersMap[server.id] = entry;
    }
  }

  const outputObject = fullEnvelope ? { mcpServers: mcpServersMap } : mcpServersMap;
  return {
    jsonString: JSON.stringify(outputObject, null, 2),
    warnings,
    serverCount: Object.keys(mcpServersMap).length
  };
}

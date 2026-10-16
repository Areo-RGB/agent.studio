import type { McpServer } from '../../types';
import { maskEnv, maskHeaders } from './secretRedactor';

export interface ClaudeMcpServerStdio {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ClaudeMcpServerRemote {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
}

export type ClaudeMcpServerEntry = ClaudeMcpServerStdio | ClaudeMcpServerRemote;

export interface ClaudeConfigShape {
  mcpServers: Record<string, ClaudeMcpServerEntry>;
}

export function serializeClaudeMcp(
  servers: McpServer[],
  options: { maskSecrets?: boolean; fullEnvelope?: boolean } = {}
): { jsonString: string; warnings: string[]; serverCount: number } {
  const { maskSecrets = true, fullEnvelope = true } = options;
  const warnings: string[] = [];
  const mcpServersMap: Record<string, ClaudeMcpServerEntry> = {};

  const enabledServers = servers.filter((s) => s.toolsEnabled.claude);

  for (const server of enabledServers) {
    if (server.transport === 'stdio') {
      if (!server.command) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a command executable.`);
        continue;
      }
      const entry: ClaudeMcpServerStdio = {
        command: server.command,
        args: server.args && server.args.length > 0 ? server.args : undefined,
        env: maskEnv(server.env, maskSecrets)
      };
      // Clean undefined keys
      if (!entry.args) delete entry.args;
      if (!entry.env || Object.keys(entry.env).length === 0) delete entry.env;
      mcpServersMap[server.id] = entry;
    } else {
      // http or sse
      if (!server.url) {
        warnings.push(`Server "${server.name}" (${server.id}) is missing a remote URL.`);
        continue;
      }
      const entry: ClaudeMcpServerRemote = {
        type: server.transport === 'sse' ? 'sse' : 'http',
        url: server.url,
        headers: maskHeaders(server.headers, maskSecrets)
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

import React, { useState, useMemo } from 'react';
import type { McpServer, ToolId, McpTransport } from '../../types';
import { TOOLS } from '../../types';
import { ToolToggles } from '../common/ToolToggles';
import { McpDrawer } from './McpDrawer';
import { McpTemplatesModal } from './McpTemplatesModal';
import { McpImportModal } from './McpImportModal';
import { McpExportDialog } from './McpExportDialog';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';
import {
  Server,
  Plus,
  Upload,
  Download,
  Copy,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  CopyCheck,
  Sparkles,
  CheckCircle,
  XCircle,
  FileCode,
  Globe,
  SlidersHorizontal,
  Undo2
} from 'lucide-react';

interface McpServersViewProps {
  servers: McpServer[];
  maskSecrets: boolean;
  onSaveServer: (server: McpServer) => Promise<void>;
  onBulkSaveServers: (servers: McpServer[]) => Promise<void>;
  onDeleteServer: (id: string) => Promise<void>;
  searchQuery: string;
}

export function McpServersView({
  servers,
  maskSecrets,
  onSaveServer,
  onBulkSaveServers,
  onDeleteServer,
  searchQuery
}: McpServersViewProps) {
  const { addToast } = useToast();

  // Dialog & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [exportToolId, setExportToolId] = useState<ToolId | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  // Filters
  const [filterTransport, setFilterTransport] = useState<string>('all');
  const [filterTool, setFilterTool] = useState<string>('all');

  // Filtered List
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.command && s.command.toLowerCase().includes(q)) ||
        (s.url && s.url.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));

      // Transport filter
      const matchesTransport =
        filterTransport === 'all' || s.transport === filterTransport;

      // Tool filter
      const matchesTool =
        filterTool === 'all'
          ? true
          : filterTool === 'any'
            ? Object.values(s.toolsEnabled).some(Boolean)
            : s.toolsEnabled[filterTool as ToolId];

      return matchesSearch && matchesTransport && matchesTool;
    });
  }, [servers, searchQuery, filterTransport, filterTool]);

  // Bulk Enable / Disable for all tools
  const handleBulkToggle = async (enable: boolean) => {
    const previousState = servers.map((s) => ({ ...s, toolsEnabled: { ...s.toolsEnabled } }));
    const updated = servers.map((s) => ({
      ...s,
      toolsEnabled: {
        claude: enable,
        codex: enable,
        pi: enable && s.transport !== 'sse',
        opencode: enable
      },
      updatedAt: Date.now()
    }));

    await onBulkSaveServers(updated);

    addToast({
      type: 'info',
      message: enable ? 'Enabled all servers for export' : 'Disabled all servers from export',
      undoLabel: 'Undo',
      undoAction: async () => {
        await onBulkSaveServers(previousState);
      }
    });
  };

  // Row Quick Actions
  const handleDuplicate = async (server: McpServer) => {
    const newId = `${server.id}-copy`;
    const newServer: McpServer = {
      ...server,
      id: newId,
      name: `${server.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await onSaveServer(newServer);
    addToast({
      type: 'success',
      message: `Duplicated server as "${newId}"`
    });
  };

  const handleCopyServerJson = async (server: McpServer) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(server, null, 2));
      addToast({
        type: 'success',
        message: 'Server definition copied to clipboard'
      });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleCopyAllMcpJson = async () => {
    try {
      const fullMap: Record<string, unknown> = {};
      for (const s of servers) {
        if (s.transport === 'stdio') {
          fullMap[s.id] = { command: s.command, args: s.args, env: s.env };
        } else {
          fullMap[s.id] = { type: s.transport, url: s.url, headers: s.headers };
        }
      }
      await navigator.clipboard.writeText(JSON.stringify({ mcpServers: fullMap }, null, 2));
      addToast({
        type: 'success',
        message: 'All MCP servers copied to clipboard'
      });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleSingleToolToggle = async (server: McpServer, tool: ToolId, enabled: boolean) => {
    const updated: McpServer = {
      ...server,
      toolsEnabled: {
        ...server.toolsEnabled,
        [tool]: enabled
      },
      updatedAt: Date.now()
    };
    await onSaveServer(updated);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">MCP Servers</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {servers.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Model Context Protocol servers and inclusion per agent.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyAllMcpJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
            title="Copy standard mcpServers JSON map for all servers"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingServer(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Server</span>
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800/80 bg-[#101520] text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Transport Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-mono text-[11px]">Transport:</span>
            <select
              value={filterTransport}
              onChange={(e) => setFilterTransport(e.target.value)}
              className="px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
            >
              <option value="all">All Transports</option>
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </select>
          </div>

          {/* Tool Inclusion Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-mono text-[11px]">Inclusion:</span>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
            >
              <option value="all">All Servers</option>
              <option value="any">Included in any tool</option>
              <option value="claude">Included in Claude</option>
              <option value="codex">Included in Codex</option>
              <option value="pi">Included in Pi</option>
              <option value="opencode">Included in OpenCode</option>
            </select>
          </div>
        </div>

        {/* Bulk Operations */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px]">Bulk:</span>
          <button
            type="button"
            onClick={() => handleBulkToggle(true)}
            className="px-2 py-1 rounded text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 font-medium transition-colors"
          >
            Enable All Everywhere
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggle(false)}
            className="px-2 py-1 rounded text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 font-medium transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0e131d] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#121824] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Server & ID</th>
                <th className="py-3 px-4 font-semibold">Transport / Command</th>
                <th className="py-3 px-4 font-semibold text-center">Included in Export</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Server className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No MCP servers match criteria</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Add a server manually or choose from pre-configured templates.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => (
                  <tr
                    key={server.id}
                    className="hover:bg-slate-800/25 transition-colors group"
                  >
                    {/* Server Identity */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{server.name}</span>
                            <span className="font-mono text-[11px] text-slate-400 select-all">
                              {server.id}
                            </span>
                          </div>
                          {server.description && (
                            <p className="text-xs text-slate-400 mt-0.5 max-w-sm line-clamp-1">
                              {server.description}
                            </p>
                          )}
                          {server.tags && server.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                              {server.tags.map((t, i) => (
                                <React.Fragment key={t}>
                                  <span>{t}</span>
                                  {i < server.tags.length - 1 && <span>·</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Transport & Target */}
                    <td className="py-3.5 px-4 align-top font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                          {server.transport}
                        </span>
                        {server.homepageUrl && (
                          <a
                            href={server.homepageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-indigo-400 transition-colors"
                            title="Documentation"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="mt-1 text-slate-400 truncate max-w-xs" title={server.command ? `${server.command} ${(server.args || []).join(' ')}` : server.url}>
                        {server.transport === 'stdio'
                          ? `${server.command} ${(server.args || []).join(' ')}`
                          : server.url}
                      </div>
                      {server.env && Object.keys(server.env).length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {Object.keys(server.env).length} env variable{Object.keys(server.env).length === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>

                    {/* Per-Tool Inclusions */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex justify-center">
                        <ToolToggles
                          toolsEnabled={server.toolsEnabled}
                          onChange={(tool, en) => handleSingleToolToggle(server, tool, en)}
                          transport={server.transport}
                        />
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServer(server);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          title="Edit server"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(server)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          title="Duplicate server"
                        >
                          <CopyCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyServerJson(server)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          title="Copy raw JSON"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingServerId(server.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Drawer */}
      <McpDrawer
        isOpen={isDrawerOpen}
        server={editingServer}
        existingIds={servers.map((s) => s.id)}
        onSave={async (saved) => {
          await onSaveServer(saved);
          addToast({
            type: 'success',
            message: `Saved server "${saved.name}"`
          });
        }}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingServer(null);
        }}
      />

      {/* Templates Modal */}
      <McpTemplatesModal
        isOpen={isTemplatesOpen}
        existingIds={servers.map((s) => s.id)}
        onAddFromTemplate={async (tmplServer) => {
          await onSaveServer(tmplServer);
          addToast({
            type: 'success',
            message: `Added template "${tmplServer.name}"`
          });
        }}
        onClose={() => setIsTemplatesOpen(false)}
      />

      {/* Import Modal */}
      <McpImportModal
        isOpen={isImportOpen}
        existingServers={servers}
        onImportComplete={async (imported) => {
          for (const s of imported) {
            await onSaveServer(s);
          }
          addToast({
            type: 'success',
            message: `Imported ${imported.length} MCP server(s)`
          });
        }}
        onClose={() => setIsImportOpen(false)}
      />

      {/* Single Export Modal if triggered */}
      {exportToolId && (
        <McpExportDialog
          isOpen={Boolean(exportToolId)}
          toolId={exportToolId}
          servers={servers}
          maskSecrets={maskSecrets}
          onClose={() => setExportToolId(null)}
        />
      )}

      {/* Deletion Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingServerId)}
        title="Delete MCP Server"
        message="Are you sure you want to delete this MCP server from your studio library? This action cannot be undone."
        confirmLabel="Delete Server"
        isDestructive
        onConfirm={async () => {
          if (deletingServerId) {
            await onDeleteServer(deletingServerId);
            addToast({
              type: 'info',
              message: `Deleted server "${deletingServerId}"`
            });
            setDeletingServerId(null);
          }
        }}
        onCancel={() => setDeletingServerId(null)}
      />
    </div>
  );
}

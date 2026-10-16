import React, { useState } from 'react';
import type { McpServer, ToolId } from '../../types';
import { X, Sparkles, Plus, Check } from 'lucide-react';
import { ToolToggles } from '../common/ToolToggles';

interface McpTemplate {
  id: string;
  name: string;
  package: string;
  description: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  tags: string[];
}

const TEMPLATES: McpTemplate[] = [
  {
    id: 'mcp-server-fetch',
    name: 'Fetch MCP Server',
    package: 'mcp-server-fetch (uvx)',
    description: 'Fetch web pages, extract readable markdown, convert HTML to clean text for LLM consumption.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    env: { USER_AGENT: 'AgentConfigStudio/1.0' },
    tags: ['web', 'http', 'scraping']
  },
  {
    id: 'mcp-server-time',
    name: 'Time MCP Server',
    package: 'mcp-server-time (uvx)',
    description: 'Provide time and timezone conversions across UTC and international zones.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-time', '--local-timezone=UTC'],
    tags: ['utility', 'time', 'timezone']
  },
  {
    id: 'server-memory',
    name: 'Memory Graph Server',
    package: '@modelcontextprotocol/server-memory',
    description: 'Persistent knowledge graph memory system for storing entities, observations, and relations across chats.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: { MEMORY_FILE_PATH: '~/.cache/mcp-memory.json' },
    tags: ['memory', 'knowledge-graph', 'context']
  },
  {
    id: 'server-sequential-thinking',
    name: 'Sequential Thinking',
    package: '@modelcontextprotocol/server-sequential-thinking',
    description: 'Structured dynamic problem-solving via hypothesis revision and incremental multi-step thoughts.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    tags: ['reasoning', 'planning', 'problem-solving']
  },
  {
    id: 'context7-mcp',
    name: 'Context7 Remote MCP',
    package: '@upstash/context7-mcp',
    description: 'Remote live context indexing and retrieval server over streamable HTTP.',
    transport: 'http',
    url: 'https://context7.upstash.io/mcp',
    headers: { Authorization: 'Bearer ${UPSTASH_CONTEXT7_API_KEY}' },
    tags: ['remote', 'context', 'http']
  }
];

interface McpTemplatesModalProps {
  isOpen: boolean;
  existingIds: string[];
  onAddFromTemplate: (server: McpServer) => void;
  onClose: () => void;
}

export function McpTemplatesModal({
  isOpen,
  existingIds,
  onAddFromTemplate,
  onClose
}: McpTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<McpTemplate>(TEMPLATES[0]);
  const [customId, setCustomId] = useState(TEMPLATES[0].id);
  const [toolsEnabled, setToolsEnabled] = useState<Record<ToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true
  });

  const handleSelect = (tmpl: McpTemplate) => {
    setSelectedTemplate(tmpl);
    setCustomId(existingIds.includes(tmpl.id) ? `${tmpl.id}-copy` : tmpl.id);
  };

  const handleCreate = () => {
    const now = Date.now();
    const newServer: McpServer = {
      id: customId.trim() || selectedTemplate.id,
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      tags: selectedTemplate.tags,
      transport: selectedTemplate.transport,
      command: selectedTemplate.command,
      args: selectedTemplate.args,
      env: selectedTemplate.env,
      url: selectedTemplate.url,
      headers: selectedTemplate.headers,
      toolsEnabled,
      createdAt: now,
      updatedAt: now
    };
    onAddFromTemplate(newServer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#151b29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">MCP Starter Templates</h3>
              <p className="text-xs text-slate-400">
                Pre-configured starter templates with verified commands and parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 flex-1 overflow-y-auto">
          {/* Template List */}
          <div className="p-4 space-y-2 overflow-y-auto max-h-[480px]">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate.id === tmpl.id;
              const alreadyExists = existingIds.includes(tmpl.id);
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelect(tmpl)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500/50 bg-indigo-600/10 shadow-xs'
                      : 'border-slate-800/80 bg-[#0f141f] hover:border-slate-700 hover:bg-[#121824]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">{tmpl.name}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {tmpl.transport}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="text-indigo-300 truncate max-w-[180px]">{tmpl.package}</span>
                    {alreadyExists && <span className="text-amber-400 text-[10px]">In library</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Customizer */}
          <div className="p-6 space-y-5 bg-[#0f1420] overflow-y-auto max-h-[480px]">
            <div>
              <h4 className="text-sm font-bold text-slate-100">{selectedTemplate.name}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {selectedTemplate.description}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Identifier (Slug)
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {selectedTemplate.transport === 'stdio' ? (
                <div className="space-y-2 rounded-lg p-3 bg-[#0a0d14] border border-slate-800/80 text-xs font-mono">
                  <div className="text-slate-400">
                    <span className="text-slate-500 select-none">Command: </span>
                    <span className="text-sky-300">{selectedTemplate.command}</span>
                  </div>
                  {selectedTemplate.args && (
                    <div className="text-slate-400">
                      <span className="text-slate-500 select-none">Args: </span>
                      <span className="text-emerald-300">{selectedTemplate.args.join(' ')}</span>
                    </div>
                  )}
                  {selectedTemplate.env && (
                    <div className="text-slate-400">
                      <span className="text-slate-500 select-none">Env: </span>
                      <span className="text-amber-300">{JSON.stringify(selectedTemplate.env)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 rounded-lg p-3 bg-[#0a0d14] border border-slate-800/80 text-xs font-mono">
                  <div className="text-slate-400">
                    <span className="text-slate-500 select-none">URL: </span>
                    <span className="text-sky-300">{selectedTemplate.url}</span>
                  </div>
                  {selectedTemplate.headers && (
                    <div className="text-slate-400">
                      <span className="text-slate-500 select-none">Headers: </span>
                      <span className="text-emerald-300">{JSON.stringify(selectedTemplate.headers)}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Tool Inclusions
                </label>
                <ToolToggles
                  toolsEnabled={toolsEnabled}
                  onChange={(tool, en) =>
                    setToolsEnabled((prev) => ({ ...prev, [tool]: en }))
                  }
                  transport={selectedTemplate.transport}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#151b29] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Template to Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import type { McpServer, McpTransport, ToolId } from '../../types';
import { ToolToggles } from '../common/ToolToggles';
import {
  X,
  Server,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  Code2,
  Sliders,
  Check,
  Globe
} from 'lucide-react';

interface McpDrawerProps {
  isOpen: boolean;
  server: McpServer | null;
  existingIds: string[];
  onSave: (server: McpServer) => void;
  onClose: () => void;
}

export function McpDrawer({
  isOpen,
  server,
  existingIds,
  onSave,
  onClose
}: McpDrawerProps) {
  const isEditing = Boolean(server);

  // Form State
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [transport, setTransport] = useState<McpTransport>('stdio');

  // Stdio fields
  const [command, setCommand] = useState('');
  const [argsList, setArgsList] = useState<string[]>([]);
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string; isSecret?: boolean }[]>([]);

  // Remote fields
  const [url, setUrl] = useState('');
  const [headersPairs, setHeadersPairs] = useState<{ key: string; value: string }[]>([]);

  // Tool toggles
  const [toolsEnabled, setToolsEnabled] = useState<Record<ToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true
  });

  // Raw JSON state
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Validation
  const [error, setError] = useState<string | null>(null);

  // Secret reveal state
  const [revealSecrets, setRevealSecrets] = useState(false);

  useEffect(() => {
    if (server) {
      setId(server.id);
      setName(server.name);
      setDescription(server.description || '');
      setTagsInput(server.tags ? server.tags.join(', ') : '');
      setHomepageUrl(server.homepageUrl || '');
      setTransport(server.transport);
      setCommand(server.command || '');
      setArgsList(server.args || []);
      setEnvPairs(
        server.env
          ? Object.entries(server.env).map(([k, v]) => ({ key: k, value: v }))
          : []
      );
      setUrl(server.url || '');
      setHeadersPairs(
        server.headers
          ? Object.entries(server.headers).map(([k, v]) => ({ key: k, value: v }))
          : []
      );
      setToolsEnabled({ ...server.toolsEnabled });
      setRawJson(JSON.stringify(server, null, 2));
    } else {
      // Clean state
      const defaultId = `mcp-${Date.now().toString(36).slice(-4)}`;
      setId(defaultId);
      setName('');
      setDescription('');
      setTagsInput('');
      setHomepageUrl('');
      setTransport('stdio');
      setCommand('');
      setArgsList([]);
      setEnvPairs([]);
      setUrl('');
      setHeadersPairs([]);
      setToolsEnabled({ claude: true, codex: true, pi: true, opencode: true });
      setRawJson('');
    }
    setError(null);
    setJsonError(null);
  }, [server, isOpen]);

  // Sync Form to Raw JSON whenever Form changes and tab switches
  const handleTabSwitch = (newTab: 'form' | 'json') => {
    if (newTab === 'json') {
      const currentObject = assembleServerObject();
      setRawJson(JSON.stringify(currentObject, null, 2));
      setJsonError(null);
    } else {
      // Switching from JSON back to Form
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.id) setId(parsed.id);
        if (parsed.name) setName(parsed.name);
        if (parsed.description) setDescription(parsed.description || '');
        if (Array.isArray(parsed.tags)) setTagsInput(parsed.tags.join(', '));
        if (parsed.homepageUrl) setHomepageUrl(parsed.homepageUrl);
        if (parsed.transport) setTransport(parsed.transport);
        if (parsed.command) setCommand(parsed.command);
        if (Array.isArray(parsed.args)) setArgsList(parsed.args);
        if (parsed.env) {
          setEnvPairs(Object.entries(parsed.env).map(([k, v]) => ({ key: k, value: String(v) })));
        }
        if (parsed.url) setUrl(parsed.url);
        if (parsed.headers) {
          setHeadersPairs(Object.entries(parsed.headers).map(([k, v]) => ({ key: k, value: String(v) })));
        }
        if (parsed.toolsEnabled) setToolsEnabled(parsed.toolsEnabled);
        setJsonError(null);
      } catch (err) {
        setJsonError(`Invalid JSON: ${String(err)}`);
        return; // Don't switch if JSON is broken
      }
    }
    setActiveTab(newTab);
  };

  const assembleServerObject = (): McpServer => {
    const envRecord: Record<string, string> = {};
    for (const pair of envPairs) {
      if (pair.key.trim()) {
        envRecord[pair.key.trim()] = pair.value;
      }
    }

    const headersRecord: Record<string, string> = {};
    for (const pair of headersPairs) {
      if (pair.key.trim()) {
        headersRecord[pair.key.trim()] = pair.value;
      }
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      id: id.trim(),
      name: name.trim() || id.trim(),
      description: description.trim(),
      tags,
      homepageUrl: homepageUrl.trim() || undefined,
      transport,
      command: transport === 'stdio' ? command.trim() : undefined,
      args: transport === 'stdio' && argsList.length > 0 ? argsList : undefined,
      env: transport === 'stdio' && Object.keys(envRecord).length > 0 ? envRecord : undefined,
      url: transport !== 'stdio' ? url.trim() : undefined,
      headers: transport !== 'stdio' && Object.keys(headersRecord).length > 0 ? headersRecord : undefined,
      toolsEnabled,
      createdAt: server ? server.createdAt : Date.now(),
      updatedAt: Date.now()
    };
  };

  const handleSave = () => {
    setError(null);
    const cleanId = id.trim();

    if (!cleanId) {
      setError('Identifier is required.');
      return;
    }

    if (!/^[a-zA-Z0-9_\-.]+$/.test(cleanId)) {
      setError('Identifier must contain only letters, numbers, hyphens, and underscores.');
      return;
    }

    // Check collision if changed ID or new
    if ((!isEditing || server?.id !== cleanId) && existingIds.includes(cleanId)) {
      setError(`A server with identifier "${cleanId}" already exists. Please choose a unique name.`);
      return;
    }

    if (transport === 'stdio' && !command.trim()) {
      setError('Command executable is required for stdio transport.');
      return;
    }

    if (transport !== 'stdio' && !url.trim()) {
      setError('Remote URL is required for HTTP / SSE transport.');
      return;
    }

    let finalServer: McpServer;

    if (activeTab === 'json') {
      try {
        finalServer = JSON.parse(rawJson);
      } catch (err) {
        setError(`Cannot save invalid JSON: ${String(err)}`);
        return;
      }
    } else {
      finalServer = assembleServerObject();
    }

    onSave(finalServer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-[#0f141f] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-150">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#121724]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {isEditing ? `Edit Server: ${server?.name}` : 'Register New MCP Server'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {id || 'unique-identifier'} · {transport.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleTabSwitch('form')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'form'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Form</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('json')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'json'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'json' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Direct JSON editor with live two-way sync.</span>
                {jsonError && <span className="text-rose-400 font-mono">{jsonError}</span>}
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  setJsonError(null);
                }}
                className="w-full h-[500px] p-4 rounded-xl bg-[#090d14] border border-slate-800 text-emerald-300 font-mono text-xs focus:outline-hidden focus:border-indigo-500/80 leading-relaxed"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Identity Section */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  01. Server Identity
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Identifier (Slug) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder="e.g. fetch"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Used as config map key across tools.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Web Fetch Server"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of provided capabilities..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tags</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="web, tools, api"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Docs / Repo URL</label>
                    <input
                      type="url"
                      value={homepageUrl}
                      onChange={(e) => setHomepageUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Transport Section */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    02. Protocol & Transport
                  </div>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    {(['stdio', 'http', 'sse'] as McpTransport[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransport(t)}
                        className={`px-3 py-1 rounded-md font-mono text-xs font-medium uppercase transition-colors ${
                          transport === t
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {transport === 'sse' && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Transport Warning:</strong> Pi Coding Agent rejects SSE servers in mcp.json. This server will be automatically omitted from Pi exports.
                    </div>
                  </div>
                )}

                {/* Stdio Form */}
                {transport === 'stdio' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Command Executable <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="e.g. uvx, npx, node, python"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Args Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Arguments</label>
                        <button
                          type="button"
                          onClick={() => setArgsList([...argsList, ''])}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Arg</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {argsList.map((arg, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-slate-600 font-mono text-[11px] w-5 text-right">
                              {idx}
                            </span>
                            <input
                              type="text"
                              value={arg}
                              onChange={(e) => {
                                const next = [...argsList];
                                next[idx] = e.target.value;
                                setArgsList(next);
                              }}
                              placeholder="--flag or package-name"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = argsList.filter((_, i) => i !== idx);
                                setArgsList(next);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {argsList.length === 0 && (
                          <p className="text-[11px] text-slate-500 italic">No arguments added.</p>
                        )}
                      </div>
                    </div>

                    {/* Environment Variables */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-slate-300">
                            Environment Variables
                          </label>
                          <button
                            type="button"
                            onClick={() => setRevealSecrets((prev) => !prev)}
                            className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono"
                          >
                            {revealSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{revealSecrets ? 'Hide values' : 'Show values'}</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnvPairs([...envPairs, { key: '', value: '' }])}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Key/Value</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {envPairs.map((pair, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={pair.key}
                              onChange={(e) => {
                                const next = [...envPairs];
                                next[idx].key = e.target.value;
                                setEnvPairs(next);
                              }}
                              placeholder="KEY_NAME"
                              className="w-1/3 px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                            />
                            <span className="text-slate-600 font-mono">=</span>
                            <input
                              type={revealSecrets ? 'text' : 'password'}
                              value={pair.value}
                              onChange={(e) => {
                                const next = [...envPairs];
                                next[idx].value = e.target.value;
                                setEnvPairs(next);
                              }}
                              placeholder="value or ${VAR}"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = envPairs.filter((_, i) => i !== idx);
                                setEnvPairs(next);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {envPairs.length === 0 && (
                          <p className="text-[11px] text-slate-500 italic">No environment variables specified.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* HTTP / SSE Remote Form */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Endpoint URL <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/mcp"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Headers Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          Custom Headers (e.g. Authorization)
                        </label>
                        <button
                          type="button"
                          onClick={() => setHeadersPairs([...headersPairs, { key: '', value: '' }])}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Header</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {headersPairs.map((pair, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={pair.key}
                              onChange={(e) => {
                                const next = [...headersPairs];
                                next[idx].key = e.target.value;
                                setHeadersPairs(next);
                              }}
                              placeholder="Authorization"
                              className="w-1/3 px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                            />
                            <span className="text-slate-600 font-mono">:</span>
                            <input
                              type={revealSecrets ? 'text' : 'password'}
                              value={pair.value}
                              onChange={(e) => {
                                const next = [...headersPairs];
                                next[idx].value = e.target.value;
                                setHeadersPairs(next);
                              }}
                              placeholder="Bearer ${TOKEN}"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#121824] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = headersPairs.filter((_, i) => i !== idx);
                                setHeadersPairs(next);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {headersPairs.length === 0 && (
                          <p className="text-[11px] text-slate-500 italic">No custom headers added.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tool Inclusions Section */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  03. Tool Export Inclusion
                </div>
                <p className="text-xs text-slate-400">
                  Select which tools will include this server when generating configs:
                </p>
                <ToolToggles
                  toolsEnabled={toolsEnabled}
                  onChange={(tool, en) =>
                    setToolsEnabled((prev) => ({ ...prev, [tool]: en }))
                  }
                  transport={transport}
                />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121724] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Save Changes' : 'Register Server'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

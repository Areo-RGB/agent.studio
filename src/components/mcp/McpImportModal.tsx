import React, { useState } from 'react';
import type { McpServer, ToolId } from '../../types';
import {
  detectAndParseMcpConfig,
  type ImportedMcpCandidate
} from '../../lib/serializers/importer';
import { ToolToggles } from '../common/ToolToggles';
import {
  X,
  Upload,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface McpImportModalProps {
  isOpen: boolean;
  existingServers: McpServer[];
  onImportComplete: (serversToAddOrUpdate: McpServer[]) => void;
  onClose: () => void;
}

export function McpImportModal({
  isOpen,
  existingServers,
  onImportComplete,
  onClose
}: McpImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [candidates, setCandidates] = useState<ImportedMcpCandidate[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasParsed, setHasParsed] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
      runDetection(text);
    };
    reader.readAsText(file);
  };

  const runDetection = (text: string) => {
    setParseError(null);
    const { detectedFormat, candidates, parseError } = detectAndParseMcpConfig(
      text,
      existingServers
    );
    setDetectedFormat(detectedFormat);
    setCandidates(candidates);
    setParseError(parseError || null);
    setHasParsed(true);
  };

  const handleActionChange = (
    index: number,
    action: 'replace' | 'rename' | 'skip',
    newId?: string
  ) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index].selectedAction = action;
      if (newId !== undefined) {
        next[index].newId = newId;
      }
      return next;
    });
  };

  const handleToolToggle = (index: number, tool: ToolId, enabled: boolean) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index].toolsEnabled[tool] = enabled;
      return next;
    });
  };

  const handleFinishImport = () => {
    const toImport: McpServer[] = [];
    const now = Date.now();

    for (const cand of candidates) {
      if (cand.selectedAction === 'skip') continue;
      if (!cand.isValid) continue;

      const targetId =
        cand.selectedAction === 'rename' && cand.newId?.trim()
          ? cand.newId.trim()
          : cand.id;

      toImport.push({
        id: targetId,
        name: cand.name,
        description: cand.description,
        tags: ['imported', cand.detectedSource],
        transport: cand.transport,
        command: cand.command,
        args: cand.args,
        env: cand.env,
        url: cand.url,
        headers: cand.headers,
        toolsEnabled: cand.toolsEnabled,
        createdAt: now,
        updatedAt: now
      });
    }

    onImportComplete(toImport);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#151b29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Import MCP Configuration</h3>
              <p className="text-xs text-slate-400">
                Paste JSON or TOML configs from Claude Code, Codex, Pi, or OpenCode.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!hasParsed ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Paste configuration (JSON or TOML)
                </span>
                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Upload .json or .toml</span>
                  <input
                    type="file"
                    accept=".json,.toml,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Paste your existing config here, for example:\n\n{ "mcpServers": { "fetch": { "command": "uvx", "args": ["mcp-server-fetch"] } } }\n\nOR Codex TOML:\n\n[mcp_servers.fetch]\ncommand = "uvx"\nargs = ["mcp-server-fetch"]`}
                className="w-full p-3.5 rounded-xl bg-[#090d14] border border-slate-800 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                spellCheck={false}
              />

              {parseError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <button
                type="button"
                disabled={!inputText.trim()}
                onClick={() => runDetection(inputText)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <span>Analyze & Preview Servers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Analysis & Conflict Resolution Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c1018] border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Detected Dialect:</span>
                  <span className="font-mono uppercase font-bold text-indigo-400">
                    {detectedFormat}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-300 font-medium">
                    {candidates.length} server{candidates.length === 1 ? '' : 's'} identified
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasParsed(false)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Edit Input
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No MCP server definitions found in input text.
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((cand, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        cand.selectedAction === 'skip'
                          ? 'border-slate-800/60 bg-[#0c1017]/60 opacity-60'
                          : 'border-slate-800 bg-[#0f1420]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-100">
                              {cand.id}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {cand.transport}
                            </span>
                            {cand.existsInDb && (
                              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Collision</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{cand.description}</p>
                          <div className="text-[11px] font-mono text-slate-500 mt-1">
                            {cand.transport === 'stdio'
                              ? `Command: ${cand.command} ${(cand.args || []).join(' ')}`
                              : `URL: ${cand.url}`}
                          </div>
                        </div>

                        {/* Conflict Resolution Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {cand.existsInDb ? (
                            <div className="flex items-center gap-1 text-xs">
                              <select
                                value={cand.selectedAction}
                                onChange={(e) =>
                                  handleActionChange(
                                    idx,
                                    e.target.value as 'replace' | 'rename' | 'skip',
                                    cand.newId
                                  )
                                }
                                className="px-2 py-1 rounded bg-[#151c2c] border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
                              >
                                <option value="rename">Rename (Safe)</option>
                                <option value="replace">Overwrite Existing</option>
                                <option value="skip">Skip</option>
                              </select>

                              {cand.selectedAction === 'rename' && (
                                <input
                                  type="text"
                                  value={cand.newId || ''}
                                  onChange={(e) =>
                                    handleActionChange(idx, 'rename', e.target.value)
                                  }
                                  placeholder="new-id"
                                  className="w-28 px-2 py-1 rounded bg-[#151c2c] border border-slate-700 text-slate-200 font-mono text-xs"
                                />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleActionChange(
                                  idx,
                                  cand.selectedAction === 'skip' ? 'replace' : 'skip'
                                )
                              }
                              className={`px-2.5 py-1 rounded text-xs font-medium border ${
                                cand.selectedAction === 'skip'
                                  ? 'border-slate-700 text-slate-500 hover:text-slate-300'
                                  : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                              }`}
                            >
                              {cand.selectedAction === 'skip' ? 'Skipped' : 'Include'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tool toggles per candidate */}
                      {cand.selectedAction !== 'skip' && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">Include in export for:</span>
                          <ToolToggles
                            toolsEnabled={cand.toolsEnabled}
                            onChange={(tool, en) => handleToolToggle(idx, tool, en)}
                            transport={cand.transport}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#151b29] flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {hasParsed && (
              <span>
                {candidates.filter((c) => c.selectedAction !== 'skip').length} server(s) ready to import
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            {hasParsed && (
              <button
                type="button"
                onClick={handleFinishImport}
                disabled={candidates.filter((c) => c.selectedAction !== 'skip').length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Selected Servers</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

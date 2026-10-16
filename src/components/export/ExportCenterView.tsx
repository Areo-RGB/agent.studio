import React, { useState, useMemo } from 'react';
import type { McpServer, Skill, PromptPreset, ToolId } from '../../types';
import { TOOLS } from '../../types';
import { buildWorkspaceZip } from '../../lib/zip/exportZip';
import { serializeClaudeMcp } from '../../lib/serializers/claude';
import { serializeCodexMcp } from '../../lib/serializers/codex';
import { serializePiMcp } from '../../lib/serializers/pi';
import { serializeOpenCodeMcp } from '../../lib/serializers/opencode';
import { CodeViewer } from '../common/CodeViewer';
import { useToast } from '../common/ToastProvider';
import {
  DownloadCloud,
  FolderArchive,
  FileCode,
  Server,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  FileText,
  Copy,
  Download,
  ShieldCheck,
  ChevronRight,
  Eye,
  Sliders
} from 'lucide-react';

interface ExportCenterViewProps {
  servers: McpServer[];
  skills: Skill[];
  prompts: PromptPreset[];
  maskSecrets: boolean;
  onToggleMaskSecrets: () => void;
}

interface VirtualExportFile {
  path: string;
  name: string;
  tool?: ToolId;
  type: 'json' | 'toml' | 'markdown' | 'other';
  content: string;
  sizeBytes: number;
}

export function ExportCenterView({
  servers,
  skills,
  prompts,
  maskSecrets,
  onToggleMaskSecrets
}: ExportCenterViewProps) {
  const { addToast } = useToast();

  const [selectedTools, setSelectedTools] = useState<Record<ToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [selectedPreviewPath, setSelectedPreviewPath] = useState<string>('export/README.md');

  // Generate the full virtual file tree according to §6
  const virtualFiles = useMemo(() => {
    const list: VirtualExportFile[] = [];

    // 1. README
    const toolsIncluded = (Object.keys(selectedTools) as ToolId[]).filter((t) => selectedTools[t]);
    const readmeContent = `# Agent Config Studio — Export Package\n\nGenerated directly in your browser. Configurations in this package are export artifacts. Nothing has been automatically written, synced, or executed on your computer.\n\n---\n\n## Included Agents\n${toolsIncluded
      .map((t) => `- **${TOOLS[t].name}**: Config -> \`${TOOLS[t].configPathDisplay}\`, Prompts -> \`${TOOLS[t].promptPathDisplay}\`, Skills -> \`${TOOLS[t].skillsPathDisplay}\``)
      .join('\n')}\n\n## Instructions\nCopy snippets or files to their corresponding paths. Always retain backups before replacing configurations.\n`;

    list.push({
      path: 'export/README.md',
      name: 'README.md',
      type: 'markdown',
      content: readmeContent,
      sizeBytes: new Blob([readmeContent]).size
    });

    // 2. Per-tool artifacts
    for (const toolId of toolsIncluded) {
      // MCP snippet
      if (toolId === 'claude') {
        const { jsonString } = serializeClaudeMcp(servers, { maskSecrets, fullEnvelope: true });
        list.push({
          path: 'export/claude/mcp-config-snippet.json',
          name: 'mcp-config-snippet.json',
          tool: 'claude',
          type: 'json',
          content: jsonString,
          sizeBytes: new Blob([jsonString]).size
        });
      } else if (toolId === 'codex') {
        const { tomlString } = serializeCodexMcp(servers, { maskSecrets });
        list.push({
          path: 'export/codex/mcp-config-snippet.toml',
          name: 'mcp-config-snippet.toml',
          tool: 'codex',
          type: 'toml',
          content: tomlString,
          sizeBytes: new Blob([tomlString]).size
        });
      } else if (toolId === 'pi') {
        const { jsonString } = serializePiMcp(servers, { maskSecrets, fullEnvelope: true });
        list.push({
          path: 'export/pi/mcp.json',
          name: 'mcp.json',
          tool: 'pi',
          type: 'json',
          content: jsonString,
          sizeBytes: new Blob([jsonString]).size
        });
      } else if (toolId === 'opencode') {
        const { jsonString } = serializeOpenCodeMcp(servers, { maskSecrets, fullEnvelope: true });
        list.push({
          path: 'export/opencode/opencode-snippet.json',
          name: 'opencode-snippet.json',
          tool: 'opencode',
          type: 'json',
          content: jsonString,
          sizeBytes: new Blob([jsonString]).size
        });
      }

      // Prompts
      const activePrompt = prompts.find((p) => p.tool === toolId && p.isActive && p.type === 'system');
      if (activePrompt) {
        const promptFileName = toolId === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
        list.push({
          path: `export/${toolId}/${promptFileName}`,
          name: promptFileName,
          tool: toolId,
          type: 'markdown',
          content: activePrompt.content,
          sizeBytes: new Blob([activePrompt.content]).size
        });
      }

      // Pi extras
      if (toolId === 'pi') {
        const appendPrompt = prompts.find((p) => p.tool === 'pi' && p.type === 'append_system' && p.isActive);
        if (appendPrompt) {
          list.push({
            path: 'export/pi/APPEND_SYSTEM.md',
            name: 'APPEND_SYSTEM.md',
            tool: 'pi',
            type: 'markdown',
            content: appendPrompt.content,
            sizeBytes: new Blob([appendPrompt.content]).size
          });
        }
      }

      // Skills
      const enabledSkills = skills.filter((s) => s.toolsEnabled[toolId]);
      for (const skill of enabledSkills) {
        for (const file of skill.files) {
          list.push({
            path: `export/${toolId}/skills/${skill.slug}/${file.path}`,
            name: file.path,
            tool: toolId,
            type: file.path.endsWith('.md') ? 'markdown' : file.path.endsWith('.json') ? 'json' : 'other',
            content: file.content,
            sizeBytes: new Blob([file.content]).size
          });
        }
      }
    }

    return list;
  }, [servers, skills, prompts, selectedTools, maskSecrets]);

  const activeFile = virtualFiles.find((f) => f.path === selectedPreviewPath) || virtualFiles[0];

  const totalBundleBytes = useMemo(() => {
    return virtualFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
  }, [virtualFiles]);

  const handleDownloadWorkspaceZip = async () => {
    setIsExporting(true);
    try {
      const activeToolList = (Object.keys(selectedTools) as ToolId[]).filter((t) => selectedTools[t]);
      const blob = await buildWorkspaceZip({
        servers,
        skills,
        prompts,
        selectedTools: activeToolList,
        maskSecrets
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-config-studio-workspace-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        message: 'Workspace bundle exported successfully',
        detail: a.download
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to build workspace ZIP',
        detail: String(err)
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSingleFile = (file: VirtualExportFile) => {
    const mime =
      file.type === 'json'
        ? 'application/json'
        : file.type === 'toml'
          ? 'text/plain'
          : 'text/markdown';
    const blob = new Blob([file.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.split('/').pop() || 'config';
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      message: `Downloaded ${a.download}`
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Export Center & Bundler</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Workspace ZIP
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Preview, inspect, and download complete multi-tool configuration packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMaskSecrets}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              maskSecrets
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span>{maskSecrets ? 'Secrets Masked (${KEY})' : 'Raw Secrets (Export as-is)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWorkspaceZip}
            disabled={isExporting || virtualFiles.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all hover:shadow-indigo-500/20"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{isExporting ? 'Packaging...' : 'Download Complete Workspace ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Tool Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['claude', 'codex', 'pi', 'opencode'] as ToolId[]).map((toolId) => {
          const tool = TOOLS[toolId];
          const isIncluded = selectedTools[toolId];
          const enabledMcp = servers.filter((s) => s.toolsEnabled[toolId]).length;
          const enabledSkills = skills.filter((s) => s.toolsEnabled[toolId]).length;
          const activePrompt = prompts.find((p) => p.tool === toolId && p.isActive && p.type === 'system');

          return (
            <div
              key={toolId}
              onClick={() => setSelectedTools((prev) => ({ ...prev, [toolId]: !prev[toolId] }))}
              className={`p-4 rounded-xl border cursor-pointer select-none transition-all ${
                isIncluded
                  ? 'border-indigo-500/50 bg-[#111726] shadow-sm'
                  : 'border-slate-800 bg-[#0c1017] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-100">{tool.name}</span>
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={() => {}}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 pointer-events-none"
                />
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-slate-400 font-mono">
                <div>MCP Servers: <strong className="text-slate-200">{enabledMcp}</strong></div>
                <div>Skills: <strong className="text-slate-200">{enabledSkills}</strong></div>
                <div className="truncate">Prompt: <strong className="text-slate-200">{activePrompt ? activePrompt.name : 'None'}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Bundle Inspector & File Tree Preview */}
      <div className="rounded-xl border border-slate-800 bg-[#0d111a] overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-[300px_1fr] divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Left: Virtual File Tree */}
        <div className="flex flex-col h-[560px] bg-[#0c1018]">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Archive Layout ({virtualFiles.length})</span>
            </span>
            <span className="text-slate-500 font-mono text-[10px] tabular-nums">
              ~{(totalBundleBytes / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono">
            {virtualFiles.map((file) => {
              const isSelected = selectedPreviewPath === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedPreviewPath(file.path)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate" title={file.path}>
                      {file.path.replace('export/', '')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
                    {file.sizeBytes} B
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Preview & Inspection */}
        <div className="flex flex-col h-[560px] bg-[#0a0d14]">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-[#111622]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400 font-semibold">{activeFile?.path}</span>
            </div>

            {activeFile && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile(activeFile)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download This File</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeFile ? (
              <CodeViewer
                code={activeFile.content}
                language={activeFile.type === 'other' ? 'json' : activeFile.type}
                fileName={activeFile.name}
                maxHeight="460px"
              />
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select a file from the archive tree to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mental Model Guarantee Callout */}
      <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-3.5 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-100">Zero Execution & Export Mental Model</h4>
          <p className="text-slate-400 leading-relaxed">
            All files generated by this export utility are packaged completely inside your browser memory using the JSZip engine. No files have been written directly to your computer's filesystem. Refer to the bundled <code className="font-mono text-indigo-300">README.md</code> for manual installation steps into each tool's standard directory.
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import type { McpServer, ToolId } from '../../types';
import { TOOLS } from '../../types';
import { serializeClaudeMcp } from '../../lib/serializers/claude';
import { serializeCodexMcp, mergeCodexToml } from '../../lib/serializers/codex';
import { serializePiMcp } from '../../lib/serializers/pi';
import { serializeOpenCodeMcp } from '../../lib/serializers/opencode';
import { CodeViewer } from '../common/CodeViewer';
import {
  X,
  Download,
  AlertTriangle,
  Info,
  GitMerge,
  FileCode,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '../common/ToastProvider';

interface McpExportDialogProps {
  isOpen: boolean;
  toolId: ToolId;
  servers: McpServer[];
  maskSecrets: boolean;
  onClose: () => void;
}

export function McpExportDialog({
  isOpen,
  toolId,
  servers,
  maskSecrets,
  onClose
}: McpExportDialogProps) {
  const tool = TOOLS[toolId];
  const { addToast } = useToast();

  const [existingUserFileContent, setExistingUserFileContent] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Generate serialized config
  let outputCode = '';
  let warnings: string[] = [];
  let count = 0;

  if (toolId === 'claude') {
    const res = serializeClaudeMcp(servers, { maskSecrets, fullEnvelope: true });
    outputCode = res.jsonString;
    warnings = res.warnings;
    count = res.serverCount;
  } else if (toolId === 'codex') {
    const res = serializeCodexMcp(servers, { maskSecrets });
    outputCode = isMerging && existingUserFileContent
      ? mergeCodexToml(existingUserFileContent, res.tomlString)
      : res.tomlString;
    warnings = res.warnings;
    count = res.serverCount;
  } else if (toolId === 'pi') {
    const res = serializePiMcp(servers, { maskSecrets, fullEnvelope: true });
    outputCode = res.jsonString;
    warnings = res.warnings;
    count = res.serverCount;
  } else if (toolId === 'opencode') {
    const res = serializeOpenCodeMcp(servers, { maskSecrets, fullEnvelope: true });
    outputCode = res.jsonString;
    warnings = res.warnings;
    count = res.serverCount;
  }

  const handleMergeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setExistingUserFileContent(text);
      setIsMerging(true);
      addToast({
        type: 'info',
        message: 'Existing configuration loaded',
        detail: 'Merged snippet with preserved user keys & comments'
      });
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#151b29]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  Export MCP for {tool.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                  {tool.format}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Target file: {tool.configPathDisplay}
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
          {/* Warnings Banner */}
          {warnings.length > 0 && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Format Compatibility Warnings:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Merge Assistant */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0f141f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                <span>Preserve Unrelated Configuration & Comments</span>
              </span>
              <p className="text-slate-400">
                Upload your current {tool.configFileName} to splice in managed servers without overwriting personal settings.
              </p>
            </div>

            <label className="cursor-pointer shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors text-center">
              <span>{isMerging ? 'Replace File' : 'Upload Current File'}</span>
              <input
                type="file"
                accept={tool.format === 'toml' ? '.toml,.txt' : '.json,.txt'}
                onChange={handleMergeUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Code Output Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Generated config for <strong className="text-slate-200">{count}</strong> enabled server(s)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Secrets: {maskSecrets ? 'Masked' : 'Raw'}
              </span>
            </div>
            <CodeViewer
              code={outputCode}
              language={tool.format}
              fileName={tool.configFileName}
              maxHeight="320px"
            />
          </div>

          {/* Manual Install Instructions */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1017] text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Step-by-Step Manual Setup Instructions</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
              <li>
                <strong className="text-slate-300">Create a backup:</strong> Make a copy of your existing <code className="font-mono text-indigo-300 bg-slate-900 px-1 rounded">{tool.configPathDisplay}</code>.
              </li>
              <li>
                <strong className="text-slate-300">Copy or Download:</strong> Use the buttons above to copy the formatted snippet or download <code className="font-mono text-indigo-300 bg-slate-900 px-1 rounded">{tool.configFileName}</code>.
              </li>
              <li>
                <strong className="text-slate-300">Apply to disk:</strong> Open your local file and paste the snippet into the appropriate configuration section.
              </li>
              <li>
                <strong className="text-slate-300">Restart Agent:</strong> Restart your {tool.name} process or terminal session to reload configurations.
              </li>
            </ol>
          </div>

          {/* Backup warning */}
          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Never overwrite your config files without keeping a local backup copy.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#151b29] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

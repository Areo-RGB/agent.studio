import React from 'react';
import type { ToolId, McpTransport } from '../../types';
import { TOOLS } from '../../types';
import { AlertCircle } from 'lucide-react';

interface ToolTogglesProps {
  toolsEnabled: Record<ToolId, boolean>;
  onChange: (tool: ToolId, enabled: boolean) => void;
  transport?: McpTransport;
  compact?: boolean;
}

export function ToolToggles({
  toolsEnabled,
  onChange,
  transport,
  compact = false
}: ToolTogglesProps) {
  const toolIds: ToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'} flex-wrap`}>
      {toolIds.map((id) => {
        const isEnabled = toolsEnabled[id];
        const isPiSseInvalid = id === 'pi' && transport === 'sse';
        const isCodexSseWarning = id === 'codex' && transport === 'sse';

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id, !isEnabled)}
            title={
              isPiSseInvalid
                ? 'Pi rejects SSE transport. Server will be omitted from Pi export.'
                : isCodexSseWarning
                  ? 'Codex does not natively support SSE. Transport will be treated as standard HTTP.'
                  : `${TOOLS[id].name}: ${isEnabled ? 'Included in export' : 'Excluded from export'}`
            }
            className={`group relative flex items-center gap-1.5 font-mono text-[11px] font-medium transition-all rounded-md px-2 py-1 select-none border ${
              isEnabled
                ? 'bg-slate-800 text-slate-100 border-indigo-500/40 shadow-xs'
                : 'bg-transparent text-slate-500 border-slate-800/80 hover:text-slate-400 hover:border-slate-700'
            }`}
          >
            {/* Small status indicator box */}
            <span
              className={`w-2 h-2 rounded-xs transition-colors ${
                isEnabled
                  ? isPiSseInvalid
                    ? 'bg-rose-500'
                    : isCodexSseWarning
                      ? 'bg-amber-400'
                      : 'bg-indigo-400'
                  : 'bg-slate-700'
              }`}
            />
            <span>{TOOLS[id].shortName}</span>

            {isEnabled && isPiSseInvalid && (
              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
            )}
            {isEnabled && isCodexSseWarning && (
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

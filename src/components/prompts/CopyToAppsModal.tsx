import React, { useState } from 'react';
import type { PromptPreset, ToolId } from '../../types';
import { TOOLS } from '../../types';
import { X, Copy, Check } from 'lucide-react';

interface CopyToAppsModalProps {
  isOpen: boolean;
  prompt: PromptPreset | null;
  onCopyComplete: (newPrompts: PromptPreset[]) => void;
  onClose: () => void;
}

export function CopyToAppsModal({
  isOpen,
  prompt,
  onCopyComplete,
  onClose
}: CopyToAppsModalProps) {
  const [selectedTools, setSelectedTools] = useState<Record<ToolId, boolean>>({
    claude: false,
    codex: false,
    pi: false,
    opencode: false
  });

  if (!isOpen || !prompt) return null;

  const handleToolToggle = (toolId: ToolId) => {
    setSelectedTools((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleConfirm = () => {
    const toCreate: PromptPreset[] = [];
    const now = Date.now();

    for (const [toolId, isSelected] of Object.entries(selectedTools)) {
      if (isSelected && toolId !== prompt.tool) {
        toCreate.push({
          id: `${toolId}-${prompt.type}-${Math.random().toString(36).slice(2, 7)}`,
          tool: toolId as ToolId,
          type: prompt.type,
          name: `${prompt.name} (from ${TOOLS[prompt.tool].shortName})`,
          description: prompt.description,
          content: prompt.content,
          tags: [...prompt.tags],
          isActive: false, // NOT auto-activated per single-active rule
          createdAt: now,
          updatedAt: now
        });
      }
    }

    onCopyComplete(toCreate);
    onClose();
  };

  const otherTools = (['claude', 'codex', 'pi', 'opencode'] as ToolId[]).filter(
    (t) => t !== prompt.tool
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Copy className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Copy Preset to Other Tools</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 my-4 leading-relaxed">
          Clone <strong className="text-slate-200">"{prompt.name}"</strong> to other agents. Independent copies are created and will <em>not</em> be auto-activated, preventing accidental override of active directives.
        </p>

        <div className="space-y-2 mb-6">
          {otherTools.map((t) => (
            <label
              key={t}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedTools[t]
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                  : 'border-slate-800 bg-[#0f141f] text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTools[t]}
                  onChange={() => handleToolToggle(t)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs font-semibold">{TOOLS[t].name}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {TOOLS[t].promptPathDisplay}
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!Object.values(selectedTools).some(Boolean)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Create Independent Copies</span>
          </button>
        </div>
      </div>
    </div>
  );
}

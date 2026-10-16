import React, { useState, useMemo } from 'react';
import type { PromptPreset, ToolId } from '../../types';
import { TOOLS } from '../../types';
import { PromptDrawer } from './PromptDrawer';
import { CopyToAppsModal } from './CopyToAppsModal';
import { PiExtrasModal } from './PiExtrasModal';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';
import {
  FileCode,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  Share2,
  Sparkles,
  Upload,
  AlertCircle
} from 'lucide-react';

interface PromptsViewProps {
  prompts: PromptPreset[];
  onSavePrompt: (prompt: PromptPreset) => Promise<void>;
  onBulkSavePrompts: (prompts: PromptPreset[]) => Promise<void>;
  onDeletePrompt: (id: string) => Promise<void>;
  searchQuery: string;
}

export function PromptsView({
  prompts,
  onSavePrompt,
  onBulkSavePrompts,
  onDeletePrompt,
  searchQuery
}: PromptsViewProps) {
  const { addToast } = useToast();

  const [selectedTool, setSelectedTool] = useState<ToolId>('claude');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptPreset | null>(null);
  const [copyingPrompt, setCopyingPrompt] = useState<PromptPreset | null>(null);
  const [isPiExtrasOpen, setIsPiExtrasOpen] = useState(false);
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);

  const activeToolDef = TOOLS[selectedTool];

  // Tool-specific presets
  const toolPrompts = useMemo(() => {
    return prompts.filter((p) => p.tool === selectedTool && p.type === 'system');
  }, [prompts, selectedTool]);

  const filteredToolPrompts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return toolPrompts;
    return toolPrompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [toolPrompts, searchQuery]);

  // Single active prompt for current tool
  const activePrompt = useMemo(() => {
    return toolPrompts.find((p) => p.isActive);
  }, [toolPrompts]);

  // Enforce Single-Active Rule per tool:
  // Activating one deactivates previous for that tool only.
  const handleToggleActive = async (targetPrompt: PromptPreset) => {
    const nextIsActive = !targetPrompt.isActive;

    const updatedList = toolPrompts.map((p) => {
      if (p.id === targetPrompt.id) {
        return { ...p, isActive: nextIsActive, updatedAt: Date.now() };
      }
      // If activating target, deactivate all other presets for this tool
      if (nextIsActive) {
        return { ...p, isActive: false, updatedAt: Date.now() };
      }
      return p;
    });

    await onBulkSavePrompts(updatedList);

    addToast({
      type: nextIsActive ? 'success' : 'info',
      message: nextIsActive
        ? `Activated "${targetPrompt.name}" for ${activeToolDef.name}`
        : `Deactivated "${targetPrompt.name}" (none selected for export)`
    });
  };

  const handleDuplicate = async (p: PromptPreset) => {
    const newPreset: PromptPreset = {
      ...p,
      id: `${p.tool}-${p.type}-${Date.now().toString(36)}`,
      name: `${p.name} (Copy)`,
      isActive: false, // Do not auto-activate duplicate
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await onSavePrompt(newPreset);
    addToast({
      type: 'success',
      message: `Duplicated preset as "${newPreset.name}"`
    });
  };

  const handleCopyText = async (p: PromptPreset) => {
    try {
      await navigator.clipboard.writeText(p.content);
      addToast({ type: 'success', message: 'Copied prompt markdown to clipboard' });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleDownloadFile = (p: PromptPreset) => {
    const filename = activeToolDef.id === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
    const blob = new Blob([p.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      message: `Downloaded ${filename}`
    });
  };

  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const newPreset: PromptPreset = {
        id: `${selectedTool}-system-${Date.now().toString(36)}`,
        tool: selectedTool,
        type: 'system',
        name: baseName || `${activeToolDef.shortName} Imported Preset`,
        description: `Imported from ${file.name}`,
        content,
        tags: ['imported'],
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await onSavePrompt(newPreset);
      addToast({
        type: 'success',
        message: `Imported preset "${newPreset.name}"`
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">System Prompts</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {prompts.length} Presets
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure system prompts per tool. Exactly one preset can be active for export per tool.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* File Import button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import .md</span>
            <input
              type="file"
              accept=".md,.txt"
              onChange={handleImportMarkdown}
              className="hidden"
            />
          </label>

          {/* Pi Extras shortcut */}
          {selectedTool === 'pi' && (
            <button
              type="button"
              onClick={() => setIsPiExtrasOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium border border-cyan-500/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pi Extras (APPEND_SYSTEM)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingPrompt(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Preset</span>
          </button>
        </div>
      </div>

      {/* Tool Selector Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['claude', 'codex', 'pi', 'opencode'] as ToolId[]).map((toolId) => {
          const t = TOOLS[toolId];
          const isSelected = selectedTool === toolId;
          const activeForTool = prompts.find((p) => p.tool === toolId && p.isActive && p.type === 'system');

          return (
            <button
              key={toolId}
              type="button"
              onClick={() => setSelectedTool(toolId)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-indigo-500/60 bg-indigo-600/10 shadow-xs'
                  : 'border-slate-800/80 bg-[#101520] hover:border-slate-700 hover:bg-[#121824]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {t.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500">{t.promptPathDisplay.split('/').pop()}</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 truncate">
                Active: <strong className="text-slate-300 font-mono">{activeForTool ? activeForTool.name : 'None selected'}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* Target File Info Callout */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0c1017] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-400">Target export file for {activeToolDef.name}:</span>
          <code className="font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {activeToolDef.promptPathDisplay}
          </code>
        </div>
        <div className="text-slate-500 text-[11px]">
          Single-active rule: activating a preset automatically deactivates previous for this tool.
        </div>
      </div>

      {/* Presets List */}
      <div className="space-y-4">
        {filteredToolPrompts.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-[#0e131d] text-slate-500 text-xs">
            <FileCode className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-400">No prompt presets for {activeToolDef.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              Create a new preset or clone an existing preset from another agent.
            </p>
          </div>
        ) : (
          filteredToolPrompts.map((preset) => (
            <div
              key={preset.id}
              className={`p-5 rounded-xl border transition-all ${
                preset.isActive
                  ? 'border-indigo-500/50 bg-[#121828] shadow-md ring-1 ring-indigo-500/30'
                  : 'border-slate-800 bg-[#0f1420] hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(preset)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        preset.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{preset.isActive ? 'Active for Export' : 'Inactive (Click to Activate)'}</span>
                    </button>

                    <h3 className="text-sm font-bold text-slate-100">{preset.name}</h3>
                  </div>

                  {preset.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>
                  )}

                  {preset.tags && preset.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pt-1">
                      {preset.tags.map((t, idx) => (
                        <React.Fragment key={t}>
                          <span>{t}</span>
                          {idx < preset.tags.length - 1 && <span>·</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrompt(preset);
                      setIsDrawerOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    title="Edit Markdown"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(preset)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    title="Duplicate preset"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyingPrompt(preset)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                    title="Copy to other tools"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(preset)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    title="Download .md file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPromptId(preset.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Snippet */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 max-h-40 overflow-hidden relative">
                <div className="pointer-events-none opacity-85">
                  <MarkdownPreview content={preset.content} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-[#0f1420] to-transparent pointer-events-none" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Prompt Drawer */}
      <PromptDrawer
        isOpen={isDrawerOpen}
        prompt={editingPrompt}
        defaultTool={selectedTool}
        onSave={async (saved) => {
          // If active, deactivate others
          if (saved.isActive) {
            const othersDeactivated = toolPrompts
              .filter((p) => p.id !== saved.id)
              .map((p) => ({ ...p, isActive: false, updatedAt: Date.now() }));
            await onBulkSavePrompts([...othersDeactivated, saved]);
          } else {
            await onSavePrompt(saved);
          }
          addToast({
            type: 'success',
            message: `Saved preset "${saved.name}"`
          });
        }}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingPrompt(null);
        }}
      />

      {/* Copy to Other Apps Modal */}
      <CopyToAppsModal
        isOpen={Boolean(copyingPrompt)}
        prompt={copyingPrompt}
        onCopyComplete={async (createdList) => {
          for (const p of createdList) {
            await onSavePrompt(p);
          }
          addToast({
            type: 'success',
            message: `Created independent copies in ${createdList.length} other tools`
          });
        }}
        onClose={() => setCopyingPrompt(null)}
      />

      {/* Pi Extras Modal */}
      <PiExtrasModal
        isOpen={isPiExtrasOpen}
        prompts={prompts}
        onSavePrompt={onSavePrompt}
        onClose={() => setIsPiExtrasOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingPromptId)}
        title="Delete Prompt Preset"
        message="Are you sure you want to delete this prompt preset? This action cannot be undone."
        confirmLabel="Delete Preset"
        isDestructive
        onConfirm={async () => {
          if (deletingPromptId) {
            await onDeletePrompt(deletingPromptId);
            addToast({
              type: 'info',
              message: 'Deleted prompt preset'
            });
            setDeletingPromptId(null);
          }
        }}
        onCancel={() => setDeletingPromptId(null)}
      />
    </div>
  );
}

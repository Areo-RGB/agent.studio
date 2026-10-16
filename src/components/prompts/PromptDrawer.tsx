import React, { useState, useEffect } from 'react';
import type { PromptPreset, ToolId, PromptType } from '../../types';
import { TOOLS } from '../../types';
import { MarkdownPreview } from '../common/MarkdownPreview';
import {
  X,
  FileCode,
  Edit3,
  Eye,
  Columns,
  Check,
  AlertCircle,
  Copy,
  Download
} from 'lucide-react';
import { useToast } from '../common/ToastProvider';

interface PromptDrawerProps {
  isOpen: boolean;
  prompt: PromptPreset | null;
  defaultTool: ToolId;
  defaultType?: PromptType;
  onSave: (prompt: PromptPreset) => void;
  onClose: () => void;
}

export function PromptDrawer({
  isOpen,
  prompt,
  defaultTool,
  defaultType = 'system',
  onSave,
  onClose
}: PromptDrawerProps) {
  const { addToast } = useToast();
  const isEditing = Boolean(prompt);

  // Fields
  const [tool, setTool] = useState<ToolId>(defaultTool);
  const [type, setType] = useState<PromptType>(defaultType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(false);

  // View mode: edit, split, preview
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prompt) {
      setTool(prompt.tool);
      setType(prompt.type);
      setName(prompt.name);
      setDescription(prompt.description);
      setTagsInput(prompt.tags ? prompt.tags.join(', ') : '');
      setContent(prompt.content);
      setIsActive(prompt.isActive);
    } else {
      setTool(defaultTool);
      setType(defaultType);
      setName('');
      setDescription('');
      setTagsInput('');
      setContent('# Agent Instructions\n\n- Write clean, type-safe, maintainable code.\n- Verify all edge cases.\n');
      setIsActive(false);
    }
    setError(null);
  }, [prompt, defaultTool, defaultType, isOpen]);

  // Word & character stats
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      addToast({ type: 'success', message: 'Prompt content copied to clipboard' });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleDownload = () => {
    const filename =
      tool === 'claude'
        ? 'CLAUDE.md'
        : type === 'append_system'
          ? 'APPEND_SYSTEM.md'
          : 'AGENTS.md';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-') || filename}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: `Downloaded ${a.download}` });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Preset name is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const savedPrompt: PromptPreset = {
      id: prompt ? prompt.id : `${tool}-${type}-${Date.now().toString(36)}`,
      tool,
      type,
      name: name.trim(),
      description: description.trim(),
      content,
      tags,
      isActive,
      createdAt: prompt ? prompt.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    onSave(savedPrompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-4xl bg-[#0f141f] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#121724]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {isEditing ? `Edit Prompt: ${prompt?.name}` : 'New System Prompt Preset'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Target: {TOOLS[tool].promptPathDisplay}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Copy prompt text"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Download .md file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Metadata Bar */}
          <div className="p-5 border-b border-slate-800 bg-[#0d121c] space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Preset Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senior Architecture Specialist"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Agent Tool</label>
                <select
                  value={tool}
                  onChange={(e) => setTool(e.target.value as ToolId)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden"
                >
                  {(['claude', 'codex', 'pi', 'opencode'] as ToolId[]).map((id) => (
                    <option key={id} value={id}>
                      {TOOLS[id].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="architecture, tdd, review"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-level purpose of this prompt directive..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Editor Sub-header with view toggles & metrics */}
          <div className="px-5 py-2 border-b border-slate-800 bg-[#111724] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
              <span>
                <strong className="text-slate-200 tabular-nums">{wordCount}</strong> words
              </span>
              <span>·</span>
              <span>
                <strong className="text-slate-200 tabular-nums">{charCount}</strong> chars
              </span>
              <span>·</span>
              <span>
                <strong className="text-slate-200 tabular-nums">{lineCount}</strong> lines
              </span>
            </div>

            {/* View Mode */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-[#0a0d14]">
            {/* Editor Canvas */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={`p-5 overflow-y-auto ${viewMode === 'edit' ? 'col-span-2' : ''}`}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter system prompt instructions in Markdown..."
                  className="w-full h-full min-h-[350px] bg-transparent text-slate-100 font-mono text-xs focus:outline-hidden resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Markdown Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`p-5 overflow-y-auto bg-[#0d111a] ${viewMode === 'preview' ? 'col-span-2' : ''}`}>
                <MarkdownPreview content={content} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121724] flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <span>Set as active prompt for {TOOLS[tool].name} (Single-Active Rule)</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Preset' : 'Create Preset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

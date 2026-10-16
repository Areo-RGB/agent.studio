import React, { useState } from 'react';
import type { PromptPreset } from '../../types';
import { X, Sparkles, FileText, Check, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '../common/ToastProvider';

interface PiExtrasModalProps {
  isOpen: boolean;
  prompts: PromptPreset[];
  onSavePrompt: (prompt: PromptPreset) => Promise<void>;
  onClose: () => void;
}

export function PiExtrasModal({
  isOpen,
  prompts,
  onSavePrompt,
  onClose
}: PiExtrasModalProps) {
  const { addToast } = useToast();

  const piPrompts = prompts.filter((p) => p.tool === 'pi');
  const appendSystem = piPrompts.find((p) => p.type === 'append_system');

  const [activeTab, setActiveTab] = useState<'append_system' | 'templates'>('append_system');
  const [appendContent, setAppendContent] = useState(
    appendSystem?.content ||
      '## Team Directives (APPEND_SYSTEM)\n\n- Write unit tests for all public methods.\n- Follow camelCase naming conventions for functions.\n'
  );
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  if (!isOpen) return null;

  const handleSaveAppend = async () => {
    const now = Date.now();
    const updated: PromptPreset = {
      id: appendSystem?.id || `pi-append-system-${now}`,
      tool: 'pi',
      type: 'append_system',
      name: appendSystem?.name || 'Pi Append Directives',
      description: 'Appended to base system prompt without replacing it.',
      tags: ['pi', 'append_system'],
      isActive: true,
      content: appendContent,
      createdAt: appendSystem?.createdAt || now,
      updatedAt: now
    };
    await onSavePrompt(updated);
    addToast({
      type: 'success',
      message: 'Saved Pi APPEND_SYSTEM.md'
    });
  };

  const handleDownloadAppend = () => {
    const blob = new Blob([appendContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'APPEND_SYSTEM.md';
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Downloaded APPEND_SYSTEM.md' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#151b29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Pi Coding Agent Extras
              </h3>
              <p className="text-xs text-slate-400">
                Configure <code className="font-mono text-cyan-300">APPEND_SYSTEM.md</code> and prompt templates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Behavioral Explanation Notice */}
        <div className="p-4 mx-6 mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Replace vs. Append Implications in Pi</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            In Pi, configuring <strong>AGENTS.md</strong> defines agent personality, while <strong>APPEND_SYSTEM.md</strong> appends project constraints without wiping default agent capabilities. Use <em>APPEND_SYSTEM.md</em> when you want team style rules added on top of Pi's built-in reasoning engine.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200">
                APPEND_SYSTEM.md Contents
              </label>
              <button
                type="button"
                onClick={handleDownloadAppend}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Download APPEND_SYSTEM.md</span>
              </button>
            </div>
            <textarea
              rows={10}
              value={appendContent}
              onChange={(e) => setAppendContent(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#090d14] border border-slate-800 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-cyan-500 leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#151b29] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
          <button
            type="button"
            onClick={async () => {
              await handleSaveAppend();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Save APPEND_SYSTEM.md</span>
          </button>
        </div>
      </div>
    </div>
  );
}

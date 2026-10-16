import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Sun,
  Moon,
  DownloadCloud,
  Server,
  Sparkles,
  FileCode
} from 'lucide-react';
import type { NavSection } from './Sidebar';

interface TopBarProps {
  currentSection: NavSection;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  maskSecrets: boolean;
  onToggleMaskSecrets: () => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
  onQuickAdd: (type: 'mcp' | 'skill' | 'prompt') => void;
  onNavigateToExport: () => void;
}

export function TopBar({
  currentSection,
  searchQuery,
  onSearchChange,
  maskSecrets,
  onToggleMaskSecrets,
  theme,
  onToggleTheme,
  onQuickAdd,
  onNavigateToExport
}: TopBarProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Cmd/Ctrl+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setIsQuickAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sectionTitles: Record<NavSection, string> = {
    overview: 'Workspace Overview',
    mcp: 'MCP Servers Registry',
    skills: 'Agent Skills Library',
    prompts: 'System Prompts Studio',
    export: 'Export Center & Bundler',
    settings: 'Studio Settings'
  };

  return (
    <header className="h-14 sticky top-0 z-30 border-b border-slate-800 bg-[#0d111a]/95 backdrop-blur-md px-6 flex items-center justify-between gap-6">
      {/* Zone 1: Section Title Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Agent Config
        </span>
        <span className="text-slate-600">/</span>
        <h2 className="text-sm font-semibold text-slate-200 tracking-tight whitespace-nowrap">
          {sectionTitles[currentSection]}
        </h2>
      </div>

      {/* Zone 2: Global Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter servers, skills, prompts... (⌘K)"
          className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#121724] border border-slate-700/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500/80 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 font-mono"
          >
            ESC
          </button>
        )}
      </div>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Redact Secrets Toggle */}
        <button
          type="button"
          onClick={onToggleMaskSecrets}
          title={
            maskSecrets
              ? 'Secrets are masked with ${YOUR_KEY} placeholders in export'
              : 'Warning: Real secrets will be included in exports'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            maskSecrets
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {maskSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{maskSecrets ? 'Mask Secrets' : 'Raw Secrets'}</span>
        </button>

        {/* Quick Add Dropdown */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            onClick={() => setIsQuickAddOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add</span>
          </button>

          {isQuickAddOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700/80 bg-[#121824] shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  onQuickAdd('mcp');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Add MCP Server</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  onQuickAdd('skill');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Create Skill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  onQuickAdd('prompt');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>Add System Prompt</span>
              </button>
            </div>
          )}
        </div>

        {/* Export Shortcut */}
        <button
          type="button"
          onClick={onNavigateToExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
          title="Open Export Center"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          title={`Switch Theme (Current: ${theme})`}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

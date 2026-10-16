import React from 'react';
import {
  LayoutDashboard,
  Server,
  Sparkles,
  FileCode,
  DownloadCloud,
  Settings,
  Info,
  Layers
} from 'lucide-react';
import type { ToolId } from '../../types';

export type NavSection = 'overview' | 'mcp' | 'skills' | 'prompts' | 'export' | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  counts: {
    mcp: number;
    skills: number;
    prompts: number;
    enabledPerTool: Record<ToolId, { mcp: number; skills: number }>;
  };
}

export function Sidebar({ currentSection, onSelectSection, counts }: SidebarProps) {
  const navItems: { id: NavSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'mcp',
      label: 'MCP Servers',
      icon: <Server className="w-4 h-4" />,
      badge: counts.mcp
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: <Sparkles className="w-4 h-4" />,
      badge: counts.skills
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: <FileCode className="w-4 h-4" />,
      badge: counts.prompts
    },
    {
      id: 'export',
      label: 'Export Center',
      icon: <DownloadCloud className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-slate-800 bg-[#0c1017] select-none z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/80">
        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Layers className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-100 tracking-tight truncate">
            Agent Config Studio
          </h1>
          <p className="text-[11px] text-slate-500 truncate font-mono">Claude · Codex · Pi · OpenCode</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mental Model Clarification Box */}
      <div className="p-3 mx-3 mb-4 rounded-lg border border-slate-800/90 bg-[#101520] text-slate-400 text-[11px] leading-relaxed">
        <div className="flex items-center gap-1.5 text-indigo-300 font-medium mb-1">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Export Mental Model</span>
        </div>
        <p className="text-slate-400 text-[11px]">
          Toggling an item marks it as <strong className="text-slate-200">Included in export</strong>. Nothing is executed, installed, or synced to your local disk.
        </p>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Offline IndexedDB</span>
        <span className="font-mono text-[10px] text-slate-600">v1.0.0</span>
      </div>
    </aside>
  );
}

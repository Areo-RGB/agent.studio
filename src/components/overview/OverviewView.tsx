import React from 'react';
import type { McpServer, Skill, PromptPreset, ToolId } from '../../types';
import { TOOLS } from '../../types';
import {
  Server,
  Sparkles,
  FileCode,
  DownloadCloud,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Terminal,
  FileText
} from 'lucide-react';
import type { NavSection } from '../layout/Sidebar';

interface OverviewViewProps {
  servers: McpServer[];
  skills: Skill[];
  prompts: PromptPreset[];
  onNavigate: (section: NavSection) => void;
  onOpenQuickExport: (toolId: ToolId) => void;
}

export function OverviewView({
  servers,
  skills,
  prompts,
  onNavigate,
  onOpenQuickExport
}: OverviewViewProps) {
  const toolIds: ToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-linear-to-r from-[#111726] to-[#0c1017] shadow-lg">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
            Developer Studio
          </span>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
            Agent Config Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage, serialize, and package MCP servers, modular skills, and system prompt presets for{' '}
            <strong className="text-slate-200">Claude Code</strong>,{' '}
            <strong className="text-slate-200">Codex</strong>,{' '}
            <strong className="text-slate-200">Pi Coding Agent</strong>, and{' '}
            <strong className="text-slate-200">OpenCode</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('export')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all hover:shadow-indigo-500/20"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Open Export Center</span>
          </button>
        </div>
      </div>

      {/* Core Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MCP Servers */}
        <div
          onClick={() => onNavigate('mcp')}
          className="group cursor-pointer p-5 rounded-xl border border-slate-800 bg-[#101520] hover:border-indigo-500/50 hover:bg-[#121826] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">MCP Servers</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100 tabular-nums">
              {servers.length}
            </span>
            <span className="text-xs text-slate-500">registered</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
            <span>Manage servers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Skills */}
        <div
          onClick={() => onNavigate('skills')}
          className="group cursor-pointer p-5 rounded-xl border border-slate-800 bg-[#101520] hover:border-indigo-500/50 hover:bg-[#121826] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Skills Library</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100 tabular-nums">
              {skills.length}
            </span>
            <span className="text-xs text-slate-500">skills with SKILL.md</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
            <span>Explore library & discover</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Prompts */}
        <div
          onClick={() => onNavigate('prompts')}
          className="group cursor-pointer p-5 rounded-xl border border-slate-800 bg-[#101520] hover:border-indigo-500/50 hover:bg-[#121826] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">System Prompts</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100 tabular-nums">
              {prompts.length}
            </span>
            <span className="text-xs text-slate-500">presets (1 active per tool)</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
            <span>Edit prompts & Pi extras</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 4 Tool Matrix Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Tool Inclusion Matrix</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Items marked <span className="text-emerald-400 font-medium">Included in export</span> will be packaged into each tool's generated config files.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('export')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View bundle preview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {toolIds.map((toolId) => {
            const tool = TOOLS[toolId];
            const enabledMcpCount = servers.filter((s) => s.toolsEnabled[toolId]).length;
            const enabledSkillCount = skills.filter((s) => s.toolsEnabled[toolId]).length;
            const activePrompt = prompts.find((p) => p.tool === toolId && p.isActive && p.type === 'system');

            return (
              <div
                key={toolId}
                className="p-5 rounded-xl border border-slate-800 bg-[#101522] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100">{tool.name}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-400">
                      {tool.format.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 mt-1 truncate" title={tool.configPathDisplay}>
                    {tool.configPathDisplay}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Server className="w-3.5 h-3.5 text-slate-500" />
                        <span>MCP Servers</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-100 tabular-nums">
                        {enabledMcpCount} / {servers.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                        <span>Skills</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-100 tabular-nums">
                        {enabledSkillCount} / {skills.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400 truncate">
                        <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">Active Prompt</span>
                      </span>
                      <span className="font-mono text-[11px] text-indigo-300 truncate max-w-[90px]" title={activePrompt?.name || 'None'}>
                        {activePrompt ? activePrompt.name : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onOpenQuickExport(toolId)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Export {tool.shortName}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mental Model Guarantee Callout */}
      <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-4 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-100">Client-Side Architecture & Privacy Guarantee</h4>
          <p className="text-slate-400 leading-relaxed">
            All data is saved locally inside your browser's IndexedDB storage. Agent Config Studio never executes terminal commands or background daemons. Use the Export Center to download verified config files or snippet files with step-by-step manual setup instructions.
          </p>
        </div>
      </div>
    </div>
  );
}

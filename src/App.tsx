import React, { useState, useEffect, useCallback } from 'react';
import type { McpServer, Skill, PromptPreset, UserSettings, ToolId } from './types';
import { db, getSettings, saveSettings, seedInitialDataIfEmpty } from './db';
import { ToastProvider } from './components/common/ToastProvider';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/overview/OverviewView';
import { McpServersView } from './components/mcp/McpServersView';
import { SkillsView } from './components/skills/SkillsView';
import { PromptsView } from './components/prompts/PromptsView';
import { ExportCenterView } from './components/export/ExportCenterView';
import { SettingsView } from './components/settings/SettingsView';
import { McpExportDialog } from './components/mcp/McpExportDialog';

export default function App() {
  return (
    <ToastProvider>
      <MainDashboard />
    </ToastProvider>
  );
}

function MainDashboard() {
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Database Data
  const [servers, setServers] = useState<McpServer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prompts, setPrompts] = useState<PromptPreset[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>({
    theme: 'dark',
    maskSecretsInExport: true,
    customRepos: ['anthropics/skills', 'ComposioHQ/awesome-claude-skills']
  });

  // Quick export dialog
  const [quickExportTool, setQuickExportTool] = useState<ToolId | null>(null);

  // Load initial data and seed if empty
  const loadAllData = useCallback(async () => {
    try {
      await seedInitialDataIfEmpty();
      const [allServers, allSkills, allPrompts, currentSettings] = await Promise.all([
        db.mcp_servers.toArray(),
        db.skills.toArray(),
        db.prompts.toArray(),
        getSettings()
      ]);

      setServers(allServers);
      setSkills(allSkills);
      setPrompts(allPrompts);
      setSettingsState(currentSettings);
    } catch (err) {
      console.error('Failed to initialize database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (settings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // System
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Settings update handler
  const handleUpdateSettings = async (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettingsState(updated);
    await saveSettings(updated);
  };

  // Theme toggle helper
  const handleToggleTheme = async () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await handleUpdateSettings({ theme: nextTheme });
  };

  // Secret Mask toggle helper
  const handleToggleMaskSecrets = async () => {
    await handleUpdateSettings({
      maskSecretsInExport: !settings.maskSecretsInExport
    });
  };

  // Database mutations for MCP Servers
  const handleSaveServer = async (server: McpServer) => {
    await db.mcp_servers.put(server);
    setServers((prev) => {
      const idx = prev.findIndex((s) => s.id === server.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = server;
        return next;
      }
      return [...prev, server];
    });
  };

  const handleBulkSaveServers = async (serversToSave: McpServer[]) => {
    await db.mcp_servers.bulkPut(serversToSave);
    const updated = await db.mcp_servers.toArray();
    setServers(updated);
  };

  const handleDeleteServer = async (id: string) => {
    await db.mcp_servers.delete(id);
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  // Database mutations for Skills
  const handleSaveSkill = async (skill: Skill) => {
    await db.skills.put(skill);
    setSkills((prev) => {
      const idx = prev.findIndex((s) => s.slug === skill.slug);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = skill;
        return next;
      }
      return [...prev, skill];
    });
  };

  const handleBulkSaveSkills = async (skillsToSave: Skill[]) => {
    await db.skills.bulkPut(skillsToSave);
    const updated = await db.skills.toArray();
    setSkills(updated);
  };

  const handleDeleteSkill = async (slug: string) => {
    await db.skills.delete(slug);
    setSkills((prev) => prev.filter((s) => s.slug !== slug));
  };

  // Database mutations for Prompts
  const handleSavePrompt = async (prompt: PromptPreset) => {
    await db.prompts.put(prompt);
    setPrompts((prev) => {
      const idx = prev.findIndex((p) => p.id === prompt.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = prompt;
        return next;
      }
      return [...prev, prompt];
    });
  };

  const handleBulkSavePrompts = async (promptsToSave: PromptPreset[]) => {
    await db.prompts.bulkPut(promptsToSave);
    const updated = await db.prompts.toArray();
    setPrompts(updated);
  };

  const handleDeletePrompt = async (id: string) => {
    await db.prompts.delete(id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  // Sidebar count calculations
  const counts = {
    mcp: servers.length,
    skills: skills.length,
    prompts: prompts.length,
    enabledPerTool: {
      claude: {
        mcp: servers.filter((s) => s.toolsEnabled.claude).length,
        skills: skills.filter((s) => s.toolsEnabled.claude).length
      },
      codex: {
        mcp: servers.filter((s) => s.toolsEnabled.codex).length,
        skills: skills.filter((s) => s.toolsEnabled.codex).length
      },
      pi: {
        mcp: servers.filter((s) => s.toolsEnabled.pi).length,
        skills: skills.filter((s) => s.toolsEnabled.pi).length
      },
      opencode: {
        mcp: servers.filter((s) => s.toolsEnabled.opencode).length,
        skills: skills.filter((s) => s.toolsEnabled.opencode).length
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0d14] text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Agent Config Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        counts={counts}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar
          currentSection={currentSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          maskSecrets={settings.maskSecretsInExport}
          onToggleMaskSecrets={handleToggleMaskSecrets}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onQuickAdd={(type) => {
            if (type === 'mcp') setCurrentSection('mcp');
            else if (type === 'skill') setCurrentSection('skills');
            else if (type === 'prompt') setCurrentSection('prompts');
          }}
          onNavigateToExport={() => setCurrentSection('export')}
        />

        {/* Dynamic Section Content */}
        <main className="flex-1 overflow-y-auto">
          {currentSection === 'overview' && (
            <OverviewView
              servers={servers}
              skills={skills}
              prompts={prompts}
              onNavigate={setCurrentSection}
              onOpenQuickExport={(tId) => setQuickExportTool(tId)}
            />
          )}

          {currentSection === 'mcp' && (
            <McpServersView
              servers={servers}
              maskSecrets={settings.maskSecretsInExport}
              onSaveServer={handleSaveServer}
              onBulkSaveServers={handleBulkSaveServers}
              onDeleteServer={handleDeleteServer}
              searchQuery={searchQuery}
            />
          )}

          {currentSection === 'skills' && (
            <SkillsView
              skills={skills}
              onSaveSkill={handleSaveSkill}
              onBulkSaveSkills={handleBulkSaveSkills}
              onDeleteSkill={handleDeleteSkill}
              searchQuery={searchQuery}
            />
          )}

          {currentSection === 'prompts' && (
            <PromptsView
              prompts={prompts}
              onSavePrompt={handleSavePrompt}
              onBulkSavePrompts={handleBulkSavePrompts}
              onDeletePrompt={handleDeletePrompt}
              searchQuery={searchQuery}
            />
          )}

          {currentSection === 'export' && (
            <ExportCenterView
              servers={servers}
              skills={skills}
              prompts={prompts}
              maskSecrets={settings.maskSecretsInExport}
              onToggleMaskSecrets={handleToggleMaskSecrets}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              servers={servers}
              skills={skills}
              prompts={prompts}
              onReloadAllData={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Quick Export Dialog */}
      {quickExportTool && (
        <McpExportDialog
          isOpen={Boolean(quickExportTool)}
          toolId={quickExportTool}
          servers={servers}
          maskSecrets={settings.maskSecretsInExport}
          onClose={() => setQuickExportTool(null)}
        />
      )}
    </div>
  );
}

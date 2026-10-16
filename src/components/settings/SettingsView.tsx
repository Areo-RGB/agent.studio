import React, { useState, useEffect } from 'react';
import type { UserSettings, McpServer, Skill, PromptPreset } from '../../types';
import { db } from '../../db';
import { useToast } from '../common/ToastProvider';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  Trash2,
  HardDrive,
  Shield,
  AlertTriangle,
  RefreshCcw,
  Check
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  servers: McpServer[];
  skills: Skill[];
  prompts: PromptPreset[];
  onReloadAllData: () => Promise<void>;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  servers,
  skills,
  prompts,
  onReloadAllData
}: SettingsViewProps) {
  const { addToast } = useToast();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Storage usage estimation
  const storageEstimates = {
    serversJson: new Blob([JSON.stringify(servers)]).size,
    skillsJson: new Blob([JSON.stringify(skills)]).size,
    promptsJson: new Blob([JSON.stringify(prompts)]).size
  };
  const totalBytes =
    storageEstimates.serversJson +
    storageEstimates.skillsJson +
    storageEstimates.promptsJson;

  const handleExportFullBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      agentConfigStudio: true,
      servers,
      skills,
      prompts,
      settings
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-config-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      message: 'Full workspace backup downloaded',
      detail: a.download
    });
  };

  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.agentConfigStudio && !parsed.servers && !parsed.skills) {
          throw new Error('Unrecognized backup format.');
        }

        if (Array.isArray(parsed.servers)) {
          await db.mcp_servers.clear();
          await db.mcp_servers.bulkAdd(parsed.servers);
        }

        if (Array.isArray(parsed.skills)) {
          await db.skills.clear();
          await db.skills.bulkAdd(parsed.skills);
        }

        if (Array.isArray(parsed.prompts)) {
          await db.prompts.clear();
          await db.prompts.bulkAdd(parsed.prompts);
        }

        if (parsed.settings) {
          await onUpdateSettings(parsed.settings);
        }

        await onReloadAllData();

        addToast({
          type: 'success',
          message: 'Workspace restored from backup file'
        });
      } catch (err) {
        addToast({
          type: 'error',
          message: 'Failed to restore backup',
          detail: String(err)
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetToStarterPack = async () => {
    await db.mcp_servers.clear();
    await db.skills.clear();
    await db.prompts.clear();
    await db.settings.clear();
    // Force reseed
    const { seedInitialDataIfEmpty } = await import('../../db');
    await seedInitialDataIfEmpty();
    await onReloadAllData();

    addToast({
      type: 'success',
      message: 'Restored realistic starter pack'
    });
  };

  const handleClearAll = async () => {
    await db.mcp_servers.clear();
    await db.skills.clear();
    await db.prompts.clear();
    await onReloadAllData();

    addToast({
      type: 'info',
      message: 'All servers, skills, and prompts cleared'
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Studio Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Workspace preferences, secret masking, and IndexedDB backup & restore.
        </p>
      </div>

      {/* Theme Posture */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#101520] space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Visual Theme</h3>
        <p className="text-xs text-slate-400">
          Select your preferred visual density and contrast profile.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-2">
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onUpdateSettings({ theme: mode })}
              className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 capitalize transition-all ${
                settings.theme === mode
                  ? 'border-indigo-500/60 bg-indigo-600/10 text-indigo-300 shadow-xs'
                  : 'border-slate-800 bg-[#0d111a] text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'dark' && <Moon className="w-4 h-4" />}
              {mode === 'light' && <Sun className="w-4 h-4" />}
              {mode === 'system' && <Laptop className="w-4 h-4" />}
              <span>{mode} Mode</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secret Redaction Default */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#101520] space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-200">
              Redact Secrets in Shared Exports by Default
            </h3>
            <p className="text-xs text-slate-400">
              When enabled, environment variables and authorization headers are replaced with <code className="text-indigo-300 font-mono">${'{YOUR_API_KEY}'}</code> placeholders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ maskSecretsInExport: !settings.maskSecretsInExport })}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              settings.maskSecretsInExport ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.maskSecretsInExport ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Storage & Privacy Info */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#101520] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Browser Storage Utilization</span>
            </h3>
            <p className="text-xs text-slate-400">
              Data is saved in your browser's IndexedDB (<code className="font-mono text-indigo-300">AgentConfigStudioDB</code>).
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
            {(totalBytes / 1024).toFixed(1)} KB stored
          </span>
        </div>

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>Important Storage Notice:</strong> Clearing your browser cookies or site data will erase this local IndexedDB workspace. We recommend downloading a JSON backup regularly.
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#101520] space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Library Backup & Restore</h3>
        <p className="text-xs text-slate-400">
          Save your complete studio database as a single JSON file, or restore a previously saved workspace.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Workspace JSON Backup</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Restore from JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFullBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-4">
        <h3 className="text-sm font-semibold text-rose-300">Danger Zone</h3>
        <p className="text-xs text-slate-400">
          Manage factory state and library cleanup.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset to Default Starter Pack</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearAllConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Entire Workspace</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset to Starter Pack"
        message="This will replace current servers, skills, and prompts with the default starter configuration. Are you sure?"
        confirmLabel="Reset Workspace"
        onConfirm={handleResetToStarterPack}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Clear Entire Workspace"
        message="Are you sure you want to delete all MCP servers, skills, and prompts from this browser? This action cannot be reversed."
        confirmLabel="Delete Everything"
        isDestructive
        onConfirm={handleClearAll}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />
    </div>
  );
}

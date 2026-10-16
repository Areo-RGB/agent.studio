import React, { useState, useMemo } from 'react';
import type { Skill, ToolId } from '../../types';
import { TOOLS } from '../../types';
import { ToolToggles } from '../common/ToolToggles';
import { SkillDrawer } from './SkillDrawer';
import { SkillImportModal } from './SkillImportModal';
import { SkillDiscoverTab } from './SkillDiscoverTab';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';
import {
  buildSkillZip,
  buildPerToolSkillZip,
  buildWorkspaceZip
} from '../../lib/zip/exportZip';
import {
  Sparkles,
  Plus,
  Upload,
  Download,
  Copy,
  Edit2,
  Trash2,
  CopyCheck,
  FolderArchive,
  FileText,
  Compass,
  FolderTree,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { computeContentHash, fetchRemoteSkillContent } from '../../lib/github/discover';

interface SkillsViewProps {
  skills: Skill[];
  onSaveSkill: (skill: Skill) => Promise<void>;
  onBulkSaveSkills: (skills: Skill[]) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
  searchQuery: string;
}

export function SkillsView({
  skills,
  onSaveSkill,
  onBulkSaveSkills,
  onDeleteSkill,
  searchQuery
}: SkillsViewProps) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'library' | 'discover'>('library');

  // Drawer / Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deletingSkillSlug, setDeletingSkillSlug] = useState<string | null>(null);

  // File tree preview modal
  const [previewSkillFiles, setPreviewSkillFiles] = useState<Skill | null>(null);

  // Filters
  const [filterRepo, setFilterRepo] = useState<string>('all');
  const [filterTool, setFilterTool] = useState<string>('all');

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesRepo =
        filterRepo === 'all' || s.sourceRepo === filterRepo;

      const matchesTool =
        filterTool === 'all'
          ? true
          : filterTool === 'any'
            ? Object.values(s.toolsEnabled).some(Boolean)
            : s.toolsEnabled[filterTool as ToolId];

      return matchesSearch && matchesRepo && matchesTool;
    });
  }, [skills, searchQuery, filterRepo, filterTool]);

  // Bulk toggles
  const handleBulkToggle = async (enable: boolean) => {
    const previous = skills.map((s) => ({ ...s, toolsEnabled: { ...s.toolsEnabled } }));
    const updated = skills.map((s) => ({
      ...s,
      toolsEnabled: {
        claude: enable,
        codex: enable,
        pi: enable,
        opencode: enable
      },
      updatedAt: Date.now()
    }));

    await onBulkSaveSkills(updated);

    addToast({
      type: 'info',
      message: enable ? 'Included all skills for export' : 'Disabled all skills from export',
      undoLabel: 'Undo',
      undoAction: async () => {
        await onBulkSaveSkills(previous);
      }
    });
  };

  // Row Quick Actions
  const handleDuplicate = async (skill: Skill) => {
    const newSlug = `${skill.slug}-copy`;
    const newSkill: Skill = {
      ...skill,
      id: newSlug,
      slug: newSlug,
      name: `${skill.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await onSaveSkill(newSkill);
    addToast({
      type: 'success',
      message: `Duplicated skill as "${newSlug}"`
    });
  };

  const handleDownloadSkillMd = (skill: Skill) => {
    const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
    if (!skillMd) {
      addToast({ type: 'error', message: 'No SKILL.md file found in this skill.' });
      return;
    }
    const blob = new Blob([skillMd.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.slug}-SKILL.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Downloaded SKILL.md' });
  };

  const handleDownloadSkillZip = async (skill: Skill) => {
    try {
      const blob = await buildSkillZip(skill);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${skill.slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        message: `Downloaded ${skill.slug}.zip with all sibling files`
      });
    } catch (err) {
      addToast({ type: 'error', message: `Failed to create ZIP: ${String(err)}` });
    }
  };

  const handleDownloadPerToolZip = async (skill: Skill, toolId: ToolId) => {
    try {
      const blob = await buildPerToolSkillZip(skill, toolId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${skill.slug}-${toolId}-skill.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        message: `Downloaded skill formatted for ${TOOLS[toolId].name}`
      });
    } catch (err) {
      addToast({ type: 'error', message: `Failed creating ZIP: ${String(err)}` });
    }
  };

  const handleCopyMarkdown = async (skill: Skill) => {
    const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
    if (!skillMd) return;
    try {
      await navigator.clipboard.writeText(skillMd.content);
      addToast({ type: 'success', message: 'Copied SKILL.md Markdown to clipboard' });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleSingleToolToggle = async (skill: Skill, tool: ToolId, enabled: boolean) => {
    const updated: Skill = {
      ...skill,
      toolsEnabled: {
        ...skill.toolsEnabled,
        [tool]: enabled
      },
      updatedAt: Date.now()
    };
    await onSaveSkill(updated);
  };

  const handleCheckUpdate = async (skill: Skill) => {
    if (!skill.sourceUrl) {
      addToast({
        type: 'info',
        message: 'Update status unknown',
        detail: 'Skill was authored locally without a remote GitHub source URL.'
      });
      return;
    }

    try {
      const remoteText = await fetchRemoteSkillContent(skill.sourceUrl);
      const remoteHash = computeContentHash(remoteText);
      const localHash = skill.contentHash || computeContentHash(skill.files.find((f) => f.path === 'SKILL.md')?.content || '');

      if (remoteHash !== localHash) {
        const updated: Skill = {
          ...skill,
          hasUpdate: true
        };
        await onSaveSkill(updated);
        addToast({
          type: 'warning',
          message: `Update available for "${skill.name}"`,
          detail: 'Remote content has changed.'
        });
      } else {
        addToast({
          type: 'success',
          message: `"${skill.name}" is up to date`
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Could not fetch remote version',
        detail: String(err)
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Agent Skills</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {skills.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Directory bundles with <code className="font-mono text-indigo-300">SKILL.md</code> and supporting references.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Installed Library ({skills.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'discover'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Discover Skills</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSkill(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Skill</span>
          </button>
        </div>
      </div>

      {activeTab === 'discover' ? (
        <SkillDiscoverTab
          existingSkills={skills}
          onImportSkill={async (s) => {
            await onSaveSkill(s);
          }}
        />
      ) : (
        /* Library View */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800/80 bg-[#101520] text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono text-[11px]">Source:</span>
                <select
                  value={filterRepo}
                  onChange={(e) => setFilterRepo(e.target.value)}
                  className="px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="all">All Sources</option>
                  <option value="Local">Local</option>
                  <option value="anthropics/skills">anthropics/skills</option>
                  <option value="ComposioHQ/awesome-claude-skills">ComposioHQ</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono text-[11px]">Inclusion:</span>
                <select
                  value={filterTool}
                  onChange={(e) => setFilterTool(e.target.value)}
                  className="px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="all">All Skills</option>
                  <option value="any">Included in any tool</option>
                  <option value="claude">Included in Claude</option>
                  <option value="codex">Included in Codex</option>
                  <option value="pi">Included in Pi</option>
                  <option value="opencode">Included in OpenCode</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono text-[11px]">Bulk:</span>
              <button
                type="button"
                onClick={() => handleBulkToggle(true)}
                className="px-2 py-1 rounded text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 font-medium transition-colors"
              >
                Enable All Everywhere
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggle(false)}
                className="px-2 py-1 rounded text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 font-medium transition-colors"
              >
                Disable All
              </button>
            </div>
          </div>

          {/* Library Table */}
          <div className="rounded-xl border border-slate-800 bg-[#0e131d] overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#121824] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Skill & Directory</th>
                    <th className="py-3 px-4 font-semibold">Source & Files</th>
                    <th className="py-3 px-4 font-semibold text-center">Included in Export</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredSkills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        <Sparkles className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        <p className="text-sm font-medium text-slate-400">No skills in library match filter</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Create a custom skill or discover pre-built skills in the Discover tab.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSkills.map((skill) => (
                      <tr
                        key={skill.slug}
                        className="hover:bg-slate-800/25 transition-colors group"
                      >
                        {/* Name and slug */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-100">{skill.name}</span>
                                <span className="font-mono text-[11px] text-slate-400 select-all">
                                  {skill.slug}
                                </span>
                                {skill.hasUpdate && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Update Available
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 max-w-sm line-clamp-1">
                                {skill.description}
                              </p>
                              {skill.tags && skill.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                                  {skill.tags.map((t, i) => (
                                    <React.Fragment key={t}>
                                      <span>{t}</span>
                                      {i < skill.tags.length - 1 && <span>·</span>}
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Source & Files */}
                        <td className="py-3.5 px-4 align-top text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300 text-[11px]">
                              {skill.sourceRepo || 'Local'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewSkillFiles(skill)}
                            className="mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <FolderTree className="w-3 h-3" />
                            <span>{skill.files.length} file(s) in bundle</span>
                          </button>
                        </td>

                        {/* Tool Inclusions */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex justify-center">
                            <ToolToggles
                              toolsEnabled={skill.toolsEnabled}
                              onChange={(tool, en) =>
                                handleSingleToolToggle(skill, tool, en)
                              }
                            />
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSkill(skill);
                                setIsDrawerOpen(true);
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="Edit SKILL.md and files"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(skill)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="Duplicate skill"
                            >
                              <CopyCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSkillMd(skill)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="Download standalone SKILL.md"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSkillZip(skill)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="Download Skill ZIP (preserves all assets)"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyMarkdown(skill)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="Copy SKILL.md markdown"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {skill.sourceUrl && (
                              <button
                                type="button"
                                onClick={() => handleCheckUpdate(skill)}
                                className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                title="Check for remote updates"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeletingSkillSlug(skill.slug)}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete skill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      <SkillDrawer
        isOpen={isDrawerOpen}
        skill={editingSkill}
        existingSlugs={skills.map((s) => s.slug)}
        onSave={async (saved) => {
          await onSaveSkill(saved);
          addToast({
            type: 'success',
            message: `Saved skill "${saved.name}"`
          });
        }}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingSkill(null);
        }}
      />

      {/* Import Modal */}
      <SkillImportModal
        isOpen={isImportOpen}
        existingSkills={skills}
        onImportComplete={async (imported) => {
          for (const s of imported) {
            await onSaveSkill(s);
          }
          addToast({
            type: 'success',
            message: `Imported ${imported.length} skill(s) into library`
          });
        }}
        onClose={() => setIsImportOpen(false)}
      />

      {/* File Tree Inspector Modal */}
      {previewSkillFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-xl border border-slate-700/80 bg-[#121824] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {previewSkillFiles.name} — File Structure
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  skills/{previewSkillFiles.slug}/
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSkillFiles(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-60 overflow-y-auto space-y-2 text-xs font-mono">
              {previewSkillFiles.files.map((f) => (
                <div
                  key={f.path}
                  className="p-2 rounded bg-[#090d14] border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-slate-200">{f.path}</span>
                  <span className="text-slate-500 tabular-nums">
                    {f.content.length} bytes
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDownloadSkillZip(previewSkillFiles)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewSkillFiles(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingSkillSlug)}
        title="Delete Agent Skill"
        message="Are you sure you want to delete this skill and all associated files from your browser library? This cannot be undone."
        confirmLabel="Delete Skill"
        isDestructive
        onConfirm={async () => {
          if (deletingSkillSlug) {
            await onDeleteSkill(deletingSkillSlug);
            addToast({
              type: 'info',
              message: `Deleted skill "${deletingSkillSlug}"`
            });
            setDeletingSkillSlug(null);
          }
        }}
        onCancel={() => setDeletingSkillSlug(null)}
      />
    </div>
  );
}

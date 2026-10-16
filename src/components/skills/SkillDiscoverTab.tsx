import React, { useState } from 'react';
import type { Skill } from '../../types';
import {
  CURATED_DISCOVER_SKILLS,
  type DiscoverableSkillItem,
  fetchRemoteSkillContent,
  convertRemoteSkillToLocal,
  computeContentHash
} from '../../lib/github/discover';
import { useToast } from '../common/ToastProvider';
import {
  Sparkles,
  ExternalLink,
  Download,
  Check,
  RefreshCw,
  Plus,
  Github,
  Globe,
  AlertCircle
} from 'lucide-react';

interface SkillDiscoverTabProps {
  existingSkills: Skill[];
  onImportSkill: (skill: Skill) => Promise<void>;
  onCheckUpdates?: (skill: Skill) => Promise<void>;
}

export function SkillDiscoverTab({
  existingSkills,
  onImportSkill
}: SkillDiscoverTabProps) {
  const { addToast } = useToast();

  const [repoList, setRepoList] = useState<string[]>([
    'anthropics/skills',
    'ComposioHQ/awesome-claude-skills'
  ]);
  const [selectedRepoFilter, setSelectedRepoFilter] = useState<string>('all');
  const [newRepoInput, setNewRepoInput] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [importingSlug, setImportingSlug] = useState<string | null>(null);

  const existingSlugMap = new Map(existingSkills.map((s) => [s.slug, s]));

  const filteredItems = CURATED_DISCOVER_SKILLS.filter((item) => {
    if (selectedRepoFilter === 'all') return true;
    return item.repo === selectedRepoFilter;
  });

  const handleImportRemote = async (item: DiscoverableSkillItem) => {
    setImportingSlug(item.slug);
    try {
      const text = await fetchRemoteSkillContent(item.rawSkillMdUrl);
      const localSkill = convertRemoteSkillToLocal(item, text);
      await onImportSkill(localSkill);
      addToast({
        type: 'success',
        message: `Imported "${localSkill.name}" into local library`
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: `Failed to import skill: ${String(err)}`,
        detail: 'Try importing via manual paste in the Import dialog.'
      });
    } finally {
      setImportingSlug(null);
    }
  };

  const handleAddCustomRepo = () => {
    const trimmed = newRepoInput.trim();
    if (!trimmed) return;
    if (!repoList.includes(trimmed)) {
      setRepoList([...repoList, trimmed]);
      setSelectedRepoFilter(trimmed);
      addToast({
        type: 'info',
        message: `Added ${trimmed} to repository catalog`
      });
    }
    setNewRepoInput('');
    setIsAddingRepo(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & External Registry Notices */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#101522] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Github className="w-4 h-4 text-indigo-400" />
              <span>Public Skill Catalog</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Curated + GitHub Public
            </span>
          </div>
          <p className="text-slate-400">
            Browse verified agent skill directories. Click <strong>Import</strong> to copy the skill and its files directly into your browser library.
          </p>
        </div>

        {/* External links */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://skills.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors"
            title="External skills.sh directory (manual import supported)"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>skills.sh</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Repo Filter and Add Custom Repo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-mono text-[11px]">Repository:</span>
          <button
            type="button"
            onClick={() => setSelectedRepoFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedRepoFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Sources
          </button>
          {repoList.map((repo) => (
            <button
              key={repo}
              type="button"
              onClick={() => setSelectedRepoFilter(repo)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedRepoFilter === repo
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {repo}
            </button>
          ))}
        </div>

        <div>
          {isAddingRepo ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRepoInput}
                onChange={(e) => setNewRepoInput(e.target.value)}
                placeholder="owner/repo"
                className="px-2.5 py-1 rounded bg-[#141b2a] border border-slate-700 text-xs text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={handleAddCustomRepo}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingRepo(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingRepo(true)}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Repo</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const alreadyImported = existingSlugMap.has(item.slug);
          const isImporting = importingSlug === item.slug;

          return (
            <div
              key={item.slug}
              className="p-5 rounded-xl border border-slate-800 bg-[#0f1420] flex flex-col justify-between hover:border-slate-700 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">{item.name}</h4>
                  <a
                    href={item.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span className="text-indigo-300">{item.repo}</span>
                  <span>·</span>
                  <span>{item.path}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {alreadyImported ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>In Library</span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">Ready to import</span>
                )}

                <button
                  type="button"
                  onClick={() => handleImportRemote(item)}
                  disabled={isImporting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    alreadyImported
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                  }`}
                >
                  {isImporting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{alreadyImported ? 'Re-import' : 'Import Skill'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

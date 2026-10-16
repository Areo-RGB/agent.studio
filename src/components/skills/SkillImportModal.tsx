import React, { useState } from 'react';
import type { Skill, SkillFile, ToolId } from '../../types';
import { unpackSkillsFromZip } from '../../lib/zip/exportZip';
import {
  X,
  Upload,
  FolderArchive,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Github
} from 'lucide-react';
import { fetchRemoteSkillContent, convertRemoteSkillToLocal } from '../../lib/github/discover';

interface SkillImportModalProps {
  isOpen: boolean;
  existingSkills: Skill[];
  onImportComplete: (skillsToAddOrUpdate: Skill[]) => void;
  onClose: () => void;
}

export function SkillImportModal({
  isOpen,
  existingSkills,
  onImportComplete,
  onClose
}: SkillImportModalProps) {
  const [importMode, setImportMode] = useState<'zip' | 'file' | 'paste' | 'github'>('zip');

  // Paste / Single File state
  const [pastedText, setPastedText] = useState('');
  const [pastedSlug, setPastedSlug] = useState('');

  // GitHub state
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);

  // Parsed Candidates
  const [parsedSkills, setParsedSkills] = useState<
    {
      skill: Skill;
      action: 'replace' | 'rename' | 'skip';
      newSlug?: string;
      exists: boolean;
    }[]
  >([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const existingSlugSet = new Set(existingSkills.map((s) => s.slug));

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setStatusMessage('Reading and unpacking ZIP archive...');

    try {
      const skills = await unpackSkillsFromZip(file);
      if (skills.length === 0) {
        setErrorMessage('No valid skill directory containing SKILL.md found in this ZIP.');
        setStatusMessage(null);
        return;
      }

      setParsedSkills(
        skills.map((skill) => {
          const exists = existingSlugSet.has(skill.slug);
          return {
            skill,
            exists,
            action: exists ? 'rename' : 'replace',
            newSlug: exists ? `${skill.slug}-imported` : undefined
          };
        })
      );
      setStatusMessage(`Found ${skills.length} skill(s) in ZIP archive.`);
    } catch (err) {
      setErrorMessage(`Failed to unpack ZIP: ${String(err)}`);
      setStatusMessage(null);
    }
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const slugFromName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      parseSingleSkillMd(slugFromName || 'imported-skill', content);
    };
    reader.readAsText(file);
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    const cleanSlug =
      pastedSlug.trim() ||
      `pasted-skill-${Date.now().toString(36).slice(-4)}`;
    parseSingleSkillMd(cleanSlug, pastedText);
  };

  const parseSingleSkillMd = (slug: string, content: string) => {
    let name = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    let description = 'Imported Skill';

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const nMatch = fm.match(/^name:\s*(.+)$/m);
      const dMatch = fm.match(/^description:\s*(.+)$/m);
      if (nMatch) name = nMatch[1].trim().replace(/^['"]|['"]$/g, '');
      if (dMatch) description = dMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }

    const exists = existingSlugSet.has(slug);
    const newSkill: Skill = {
      id: slug,
      slug,
      name,
      description,
      tags: ['imported', 'file'],
      sourceRepo: 'Local File',
      files: [{ path: 'SKILL.md', content }],
      toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setParsedSkills([
      {
        skill: newSkill,
        exists,
        action: exists ? 'rename' : 'replace',
        newSlug: exists ? `${slug}-imported` : undefined
      }
    ]);
  };

  const handleFetchGithub = async () => {
    if (!githubUrl.trim()) return;
    setIsLoadingGithub(true);
    setErrorMessage(null);

    try {
      let rawUrl = githubUrl.trim();
      // Convert standard github.com tree/blob URLs to raw.githubusercontent.com
      if (rawUrl.includes('github.com') && !rawUrl.includes('raw.githubusercontent.com')) {
        rawUrl = rawUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/')
          .replace('/tree/', '/');
      }
      if (!rawUrl.endsWith('/SKILL.md') && !rawUrl.endsWith('.md')) {
        rawUrl = rawUrl.replace(/\/$/, '') + '/SKILL.md';
      }

      const content = await fetchRemoteSkillContent(rawUrl);
      const urlParts = rawUrl.split('/');
      const slugCandidate = urlParts[urlParts.length - 2] || 'github-skill';
      parseSingleSkillMd(slugCandidate, content);
      setStatusMessage('Successfully fetched remote SKILL.md');
    } catch (err) {
      setErrorMessage(`Failed fetching from GitHub: ${String(err)}. Please verify repository accessibility or paste the SKILL.md contents directly.`);
    } finally {
      setIsLoadingGithub(false);
    }
  };

  const handleFinishImport = () => {
    const toImport: Skill[] = [];
    for (const item of parsedSkills) {
      if (item.action === 'skip') continue;
      const targetSlug =
        item.action === 'rename' && item.newSlug?.trim()
          ? item.newSlug.trim()
          : item.skill.slug;

      toImport.push({
        ...item.skill,
        id: targetSlug,
        slug: targetSlug
      });
    }

    onImportComplete(toImport);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#121824] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#151b29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Import Agent Skill</h3>
              <p className="text-xs text-slate-400">
                Import from ZIP archive, standalone SKILL.md, or raw GitHub URL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-2 bg-[#101520]">
          <button
            type="button"
            onClick={() => setImportMode('zip')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              importMode === 'zip'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ZIP Archive
          </button>
          <button
            type="button"
            onClick={() => setImportMode('file')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              importMode === 'file'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setImportMode('paste')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              importMode === 'paste'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Markdown
          </button>
          <button
            type="button"
            onClick={() => setImportMode('github')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              importMode === 'github'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            GitHub Repo
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {parsedSkills.length === 0 ? (
            <div>
              {/* ZIP Mode */}
              {importMode === 'zip' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Upload a .zip file containing one or more skill folders (each containing a <code className="text-indigo-300">SKILL.md</code>).
                  </p>
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl bg-[#0d121c] cursor-pointer transition-colors text-center">
                    <FolderArchive className="w-10 h-10 text-indigo-400/80 mb-2" />
                    <span className="text-sm font-semibold text-slate-200">
                      Choose .zip archive
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Directories containing SKILL.md will be automatically parsed
                    </span>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Single File Mode */}
              {importMode === 'file' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Upload a standalone <code className="text-indigo-300">SKILL.md</code> or Markdown file.
                  </p>
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl bg-[#0d121c] cursor-pointer transition-colors text-center">
                    <FileText className="w-10 h-10 text-indigo-400/80 mb-2" />
                    <span className="text-sm font-semibold text-slate-200">
                      Select SKILL.md file
                    </span>
                    <input
                      type="file"
                      accept=".md,.txt"
                      onChange={handleSingleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Paste Mode */}
              {importMode === 'paste' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Directory Slug
                    </label>
                    <input
                      type="text"
                      value={pastedSlug}
                      onChange={(e) => setPastedSlug(e.target.value)}
                      placeholder="e.g. git-workflow-expert"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      SKILL.md Markdown Content (with optional YAML frontmatter)
                    </label>
                    <textarea
                      rows={8}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="---\nname: Git Workflow Expert\ndescription: ...\n---\n\n# Directives..."
                      className="w-full p-3 rounded-lg bg-[#0d121c] border border-slate-800 text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleParsePasted}
                    disabled={!pastedText.trim()}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold"
                  >
                    Parse Skill
                  </button>
                </div>
              )}

              {/* GitHub Mode */}
              {importMode === 'github' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Enter the URL to a SKILL.md on GitHub (e.g. from <code className="text-indigo-300">anthropics/skills</code>).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/anthropics/skills/tree/main/skills/git-workflow/SKILL.md"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#141b2a] border border-slate-700 text-xs text-slate-100 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleFetchGithub}
                      disabled={isLoadingGithub || !githubUrl.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>{isLoadingGithub ? 'Fetching...' : 'Fetch'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview of parsed skills & conflict resolution */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{parsedSkills.length} skill(s) ready for import:</span>
                <button
                  type="button"
                  onClick={() => setParsedSkills([])}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  Clear & Re-upload
                </button>
              </div>

              {parsedSkills.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-800 bg-[#0d121c] flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        {item.skill.name}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        ({item.skill.slug})
                      </span>
                      {item.exists && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Slug collision</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.skill.description}</p>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      {item.skill.files.length} file(s) included
                    </div>
                  </div>

                  {item.exists ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={item.action}
                        onChange={(e) => {
                          const action = e.target.value as 'replace' | 'rename' | 'skip';
                          setParsedSkills((prev) => {
                            const next = [...prev];
                            next[idx].action = action;
                            return next;
                          });
                        }}
                        className="px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 text-xs"
                      >
                        <option value="rename">Rename (Safe)</option>
                        <option value="replace">Overwrite</option>
                        <option value="skip">Skip</option>
                      </select>

                      {item.action === 'rename' && (
                        <input
                          type="text"
                          value={item.newSlug || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParsedSkills((prev) => {
                              const next = [...prev];
                              next[idx].newSlug = val;
                              return next;
                            });
                          }}
                          className="w-28 px-2 py-1 rounded bg-[#141b2a] border border-slate-700 text-slate-200 font-mono text-xs"
                        />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setParsedSkills((prev) => {
                          const next = [...prev];
                          next[idx].action = next[idx].action === 'skip' ? 'replace' : 'skip';
                          return next;
                        });
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium border ${
                        item.action === 'skip'
                          ? 'border-slate-700 text-slate-500'
                          : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                      }`}
                    >
                      {item.action === 'skip' ? 'Skipped' : 'Include'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#151b29] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          {parsedSkills.length > 0 && (
            <button
              type="button"
              onClick={handleFinishImport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import Selected ({parsedSkills.filter((s) => s.action !== 'skip').length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

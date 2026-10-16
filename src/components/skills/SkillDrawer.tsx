import React, { useState, useEffect } from 'react';
import type { Skill, SkillFile, ToolId } from '../../types';
import { ToolToggles } from '../common/ToolToggles';
import { MarkdownPreview } from '../common/MarkdownPreview';
import {
  X,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  FolderTree,
  Eye,
  Edit3,
  Check,
  AlertCircle
} from 'lucide-react';

interface SkillDrawerProps {
  isOpen: boolean;
  skill: Skill | null;
  existingSlugs: string[];
  onSave: (skill: Skill) => void;
  onClose: () => void;
}

export function SkillDrawer({
  isOpen,
  skill,
  existingSlugs,
  onSave,
  onClose
}: SkillDrawerProps) {
  const isEditing = Boolean(skill);

  // Identity
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [sourceRepo, setSourceRepo] = useState('Local');

  // Virtual Files
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState('SKILL.md');

  // Editor Sub-tab for SKILL.md: edit vs preview
  const [skillMdMode, setSkillMdMode] = useState<'edit' | 'preview'>('edit');

  // New file input
  const [newFilePath, setNewFilePath] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Tool inclusions
  const [toolsEnabled, setToolsEnabled] = useState<Record<ToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skill) {
      setSlug(skill.slug);
      setName(skill.name);
      setDescription(skill.description);
      setCategory(skill.category || 'General');
      setTagsInput(skill.tags ? skill.tags.join(', ') : '');
      setSourceRepo(skill.sourceRepo || 'Local');
      setFiles([...skill.files]);
      setSelectedFilePath('SKILL.md');
      setToolsEnabled({ ...skill.toolsEnabled });
    } else {
      const defaultSlug = `skill-${Date.now().toString(36).slice(-4)}`;
      setSlug(defaultSlug);
      setName('');
      setDescription('');
      setCategory('General');
      setTagsInput('');
      setSourceRepo('Local');
      setFiles([
        {
          path: 'SKILL.md',
          content: `---\nname: New Agent Skill\ndescription: High-level instructions for AI coding assistants.\n---\n\n# New Agent Skill\n\nDescribe the role, principles, and procedures for this skill here.\n`
        }
      ]);
      setSelectedFilePath('SKILL.md');
      setToolsEnabled({ claude: true, codex: true, pi: true, opencode: true });
    }
    setError(null);
  }, [skill, isOpen]);

  const activeFile = files.find((f) => f.path === selectedFilePath);

  const handleActiveFileContentChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === selectedFilePath ? { ...f, content: newContent } : f))
    );

    // If editing SKILL.md, try updating name/description automatically from frontmatter
    if (selectedFilePath === 'SKILL.md') {
      const fmMatch = newContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        const fm = fmMatch[1];
        const nMatch = fm.match(/^name:\s*(.+)$/m);
        const dMatch = fm.match(/^description:\s*(.+)$/m);
        if (nMatch && !name) setName(nMatch[1].trim().replace(/^['"]|['"]$/g, ''));
        if (dMatch && !description) setDescription(dMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      }
    }
  };

  const handleCreateNewFile = () => {
    const cleanPath = newFilePath.trim();
    if (!cleanPath) return;

    if (cleanPath.startsWith('/') || cleanPath.includes('..')) {
      setError('File path must be relative without leading slash or directory traversal.');
      return;
    }

    if (files.some((f) => f.path === cleanPath)) {
      setError(`File "${cleanPath}" already exists in this skill.`);
      return;
    }

    const newFile: SkillFile = {
      path: cleanPath,
      content: ''
    };
    setFiles([...files, newFile]);
    setSelectedFilePath(cleanPath);
    setNewFilePath('');
    setIsAddingFile(false);
    setError(null);
  };

  const handleDeleteFile = (pathToDelete: string) => {
    if (pathToDelete === 'SKILL.md') {
      setError('SKILL.md is required and cannot be deleted.');
      return;
    }
    const nextFiles = files.filter((f) => f.path !== pathToDelete);
    setFiles(nextFiles);
    if (selectedFilePath === pathToDelete) {
      setSelectedFilePath('SKILL.md');
    }
  };

  const handleSave = () => {
    setError(null);
    const cleanSlug = slug.trim();

    if (!cleanSlug) {
      setError('Directory slug is required.');
      return;
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanSlug)) {
      setError('Directory slug must contain only alphanumeric characters, hyphens, or underscores.');
      return;
    }

    if ((!isEditing || skill?.slug !== cleanSlug) && existingSlugs.includes(cleanSlug)) {
      setError(`A skill with directory slug "${cleanSlug}" already exists.`);
      return;
    }

    const hasSkillMd = files.some((f) => f.path === 'SKILL.md');
    if (!hasSkillMd) {
      setError('Every skill must include a SKILL.md file.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updatedSkill: Skill = {
      id: cleanSlug,
      slug: cleanSlug,
      name: name.trim() || cleanSlug,
      description: description.trim() || 'Agent skill instructions',
      tags,
      category: category.trim() || 'General',
      sourceRepo: sourceRepo.trim() || 'Local',
      sourceUrl: skill?.sourceUrl,
      files,
      toolsEnabled,
      createdAt: skill ? skill.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    onSave(updatedSkill);
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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {isEditing ? `Edit Skill: ${skill?.name}` : 'Create Agent Skill'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                skills/{slug || 'skill-slug'}/SKILL.md
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split View (Metadata/Files left, Editor right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Metadata & Virtual File Tree */}
          <div className="p-5 overflow-y-auto space-y-5 bg-[#0d121c]">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Identity */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Directory & Metadata
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Folder Slug <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="code-review-companion"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Code Review Companion"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this skill teaches the agent..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="review, security, git"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#141b2a] border border-slate-700/80 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Virtual File Tree */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Skill Files ({files.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingFile(true)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add File</span>
                </button>
              </div>

              {isAddingFile && (
                <div className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                  <input
                    type="text"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    placeholder="references/api.md or scripts/run.py"
                    className="w-full px-2 py-1 rounded bg-[#121824] border border-slate-700 text-xs font-mono text-slate-200"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingFile(false);
                        setNewFilePath('');
                      }}
                      className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewFile}
                      className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-semibold"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {files.map((file) => {
                  const isSelected = selectedFilePath === file.path;
                  const isSkillMd = file.path === 'SKILL.md';
                  return (
                    <div
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate" title={file.path}>
                        {file.path}
                      </span>
                      {!isSkillMd && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.path);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tool Export Inclusions */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Tool Export Inclusions
              </div>
              <ToolToggles
                toolsEnabled={toolsEnabled}
                onChange={(tool, en) =>
                  setToolsEnabled((prev) => ({ ...prev, [tool]: en }))
                }
              />
            </div>
          </div>

          {/* Right Column: Active File Editor / Markdown Preview */}
          <div className="flex flex-col h-full overflow-hidden bg-[#0a0d14]">
            {/* Editor Top Bar */}
            <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0f1420] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold">{selectedFilePath}</span>
                {selectedFilePath === 'SKILL.md' && (
                  <span className="text-[10px] text-indigo-400 font-sans px-1.5 py-0.2 rounded bg-indigo-500/10">
                    Primary Entrypoint
                  </span>
                )}
              </div>

              {selectedFilePath.endsWith('.md') && (
                <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSkillMdMode('edit')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                      skillMdMode === 'edit'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillMdMode('preview')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                      skillMdMode === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-5">
              {skillMdMode === 'preview' && selectedFilePath.endsWith('.md') ? (
                <MarkdownPreview content={activeFile?.content || ''} />
              ) : (
                <textarea
                  value={activeFile?.content || ''}
                  onChange={(e) => handleActiveFileContentChange(e.target.value)}
                  placeholder="Enter file contents..."
                  className="w-full h-full min-h-[420px] bg-transparent text-slate-200 font-mono text-xs focus:outline-hidden resize-none leading-relaxed"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121724] flex items-center justify-end gap-3">
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
            <span>{isEditing ? 'Save Skill' : 'Create Skill'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

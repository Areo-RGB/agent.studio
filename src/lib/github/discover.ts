import type { Skill, SkillFile } from '../../types';

export interface DiscoverableSkillItem {
  name: string;
  slug: string;
  description: string;
  repo: string;
  branch: string;
  path: string;
  rawSkillMdUrl: string;
  htmlUrl: string;
}

/**
 * Fallback curated catalog when GitHub API hits rate limit or CORS.
 * Always guarantees discover tab provides immediate value.
 */
export const CURATED_DISCOVER_SKILLS: DiscoverableSkillItem[] = [
  {
    name: 'Artifacts Builder',
    slug: 'artifacts-builder',
    description: 'Instructions and templates for structuring self-contained single-page apps, simulations, and SVG interactive visualizers.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/artifacts-builder',
    rawSkillMdUrl: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/artifacts-builder/SKILL.md',
    htmlUrl: 'https://github.com/anthropics/skills/tree/main/skills/artifacts-builder'
  },
  {
    name: 'Git Workflow Companion',
    slug: 'git-workflow-companion',
    description: 'Guidelines for atomic rebases, conventional commit messages, branch naming, and merge conflict resolution.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/git-workflow',
    rawSkillMdUrl: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/git-workflow/SKILL.md',
    htmlUrl: 'https://github.com/anthropics/skills/tree/main/skills/git-workflow'
  },
  {
    name: 'Database Migration Auditor',
    slug: 'db-migration-auditor',
    description: 'Checks SQL DDL migrations for locking hazards, backward compatibility, and zero-downtime safety.',
    repo: 'ComposioHQ/awesome-claude-skills',
    branch: 'master',
    path: 'skills/db-migration',
    rawSkillMdUrl: 'https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/master/skills/db-migration/SKILL.md',
    htmlUrl: 'https://github.com/ComposioHQ/awesome-claude-skills'
  },
  {
    name: 'API Documentation Generator',
    slug: 'api-doc-generator',
    description: 'Generates comprehensive OpenAPI/Swagger compliant Markdown documentation with request/response schemas.',
    repo: 'ComposioHQ/awesome-claude-skills',
    branch: 'master',
    path: 'skills/api-docs',
    rawSkillMdUrl: 'https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/master/skills/api-docs/SKILL.md',
    htmlUrl: 'https://github.com/ComposioHQ/awesome-claude-skills'
  },
  {
    name: 'Docker & Container Hardening',
    slug: 'docker-hardening',
    description: 'Audits Dockerfiles and compose specs for non-root users, multi-stage cache layers, and minimal base images.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/docker-hardening',
    rawSkillMdUrl: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/docker-hardening/SKILL.md',
    htmlUrl: 'https://github.com/anthropics/skills/tree/main/skills/docker-hardening'
  }
];

export async function fetchRemoteSkillContent(rawUrl: string): Promise<string> {
  const resp = await fetch(rawUrl);
  if (!resp.ok) {
    throw new Error(`Failed to download skill: HTTP ${resp.status}`);
  }
  return resp.text();
}

/**
 * Simple content hash (FNV-1a 32-bit hex) to compare versions.
 */
export function computeContentHash(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Converts a remote SKILL.md into an imported Skill record.
 */
export function convertRemoteSkillToLocal(
  item: DiscoverableSkillItem,
  skillMdText: string
): Skill {
  let name = item.name;
  let description = item.description;

  // Extract YAML frontmatter if present
  const fmMatch = skillMdText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nMatch = fm.match(/^name:\s*(.+)$/m);
    const dMatch = fm.match(/^description:\s*(.+)$/m);
    if (nMatch) name = nMatch[1].trim().replace(/^['"]|['"]$/g, '');
    if (dMatch) description = dMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }

  const now = Date.now();
  const files: SkillFile[] = [
    {
      path: 'SKILL.md',
      content: skillMdText
    }
  ];

  return {
    id: item.slug,
    slug: item.slug,
    name,
    description,
    tags: ['imported', 'github'],
    category: 'Community',
    sourceRepo: item.repo,
    sourceUrl: item.rawSkillMdUrl,
    contentHash: computeContentHash(skillMdText),
    hasUpdate: false,
    files,
    toolsEnabled: { claude: true, codex: true, pi: true, opencode: true },
    createdAt: now,
    updatedAt: now
  };
}

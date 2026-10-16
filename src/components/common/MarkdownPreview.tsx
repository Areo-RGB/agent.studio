import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  // Check for YAML frontmatter
  let frontmatter: Record<string, string> | null = null;
  let markdownBody = content;

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    frontmatter = {};
    const lines = fmMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k) frontmatter[k] = v;
      }
    }
    markdownBody = content.slice(fmMatch[0].length).trim();
  }

  const lines = markdownBody.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        renderedElements.push(
          <pre
            key={`code-${i}`}
            className="my-3 p-3 rounded-lg bg-[#0c1017] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      renderedElements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-100 mt-5 mb-2 tracking-tight">
          {formatInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-base font-semibold text-slate-200 mt-4 mb-2 tracking-tight">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold text-slate-300 mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.trim().startsWith('- [ ] ')) {
      // Unchecked task
      renderedElements.push(
        <div key={`task-${i}`} className="flex items-center gap-2 text-xs text-slate-300 my-1">
          <input type="checkbox" disabled className="rounded border-slate-700 bg-slate-900" />
          <span>{formatInline(line.trim().slice(6))}</span>
        </div>
      );
    } else if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [X] ')) {
      // Checked task
      renderedElements.push(
        <div key={`task-${i}`} className="flex items-center gap-2 text-xs text-slate-300 my-1">
          <input type="checkbox" checked disabled className="rounded border-slate-700 bg-indigo-600" />
          <span className="line-through text-slate-500">{formatInline(line.trim().slice(6))}</span>
        </div>
      );
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      renderedElements.push(
        <li key={`li-${i}`} className="text-xs text-slate-300 ml-4 list-disc my-0.5 leading-relaxed">
          {formatInline(line.trim().slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)$/);
      if (match) {
        renderedElements.push(
          <div key={`num-${i}`} className="text-xs text-slate-300 ml-2 my-0.5 leading-relaxed flex items-baseline gap-1.5">
            <span className="text-slate-500 font-mono text-[11px] select-none">{match[1]}.</span>
            <span>{formatInline(match[2])}</span>
          </div>
        );
      }
    } else {
      renderedElements.push(
        <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1.5">
          {formatInline(line)}
        </p>
      );
    }
  }

  return (
    <div className={`prose-invert max-w-none ${className}`}>
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-xs text-slate-300">
          <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 mb-1.5 font-semibold">
            YAML Frontmatter
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
            {Object.entries(frontmatter).map(([k, v]) => (
              <React.Fragment key={k}>
                <span className="text-slate-400">{k}:</span>
                <span className="text-slate-200">{v}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">{renderedElements}</div>
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Match bold **text**, inline `code`, italic *text*
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { useToast } from './ToastProvider';

interface CodeViewerProps {
  code: string;
  language?: 'json' | 'toml' | 'markdown' | 'bash';
  fileName?: string;
  maxHeight?: string;
}

export function CodeViewer({ code, language = 'json', fileName, maxHeight = '400px' }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      addToast({
        type: 'success',
        message: 'Copied to clipboard',
        detail: fileName ? `${fileName} content copied` : undefined
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleDownload = () => {
    const mime =
      language === 'json'
        ? 'application/json'
        : language === 'toml'
          ? 'text/plain'
          : 'text/markdown';
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `config.${language === 'toml' ? 'toml' : language === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      message: 'Download started',
      detail: a.download
    });
  };

  const lines = code.split('\n');

  return (
    <div className="relative rounded-lg border border-slate-800 bg-[#0d111a] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-[#121722]/90">
        <div className="flex items-center gap-2 font-mono text-slate-400">
          <span className="uppercase text-[10px] tracking-wider font-semibold text-slate-500">
            {language}
          </span>
          {fileName && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-medium">{fileName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div
        style={{ maxHeight }}
        className="overflow-auto p-3.5 font-mono text-[13px] leading-relaxed text-slate-200"
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30">
                <td className="w-10 pr-3 text-right select-none text-slate-600 tabular-nums align-top text-xs">
                  {idx + 1}
                </td>
                <td className="whitespace-pre overflow-x-auto text-slate-300">
                  {/* Subtle syntax coloring for TOML and JSON */}
                  {colorizeLine(line, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function colorizeLine(line: string, language: string): React.ReactNode {
  if (language === 'toml') {
    if (line.trim().startsWith('#')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }
    if (line.trim().startsWith('[')) {
      return <span className="text-indigo-400 font-semibold">{line}</span>;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx);
      const val = line.slice(eqIdx);
      return (
        <>
          <span className="text-sky-300">{key}</span>
          <span className="text-slate-400">=</span>
          <span className="text-emerald-300">{val.slice(1)}</span>
        </>
      );
    }
  }

  if (language === 'json') {
    // Key/value coloring
    const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
    if (keyMatch) {
      const [, indent, key, rest] = keyMatch;
      return (
        <>
          {indent}
          <span className="text-sky-300">"{key}"</span>: <span className="text-emerald-300">{rest}</span>
        </>
      );
    }
  }

  return line;
}

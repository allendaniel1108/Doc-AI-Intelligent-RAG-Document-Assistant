import React from 'react';
import { 
  X, 
  FileText, 
  Layers, 
  Copy, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink,
  MessageSquarePlus,
  Percent,
  Hash,
  BookOpen
} from 'lucide-react';
import { DocumentChunk } from '../types';

interface SourcePassageModalProps {
  sources: DocumentChunk[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onAskAboutSource?: (sourceText: string, docTitle: string) => void;
  onOpenDocumentVisualizer?: (docId: string) => void;
}

export const SourcePassageModal: React.FC<SourcePassageModalProps> = ({
  sources,
  currentIndex,
  isOpen,
  onClose,
  onSelectIndex,
  onAskAboutSource,
  onOpenDocumentVisualizer,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !sources || sources.length === 0) return null;

  const currentSource = sources[currentIndex] || sources[0];
  const total = sources.length;

  const handleCopy = () => {
    const textToCopy = `"${currentSource.text}"\n— Source: ${currentSource.docTitle} (Chunk #${currentSource.chunkIndex + 1}${currentSource.page ? `, Page ${currentSource.page}` : ''})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const matchPercentage = currentSource.matchPercentage || Math.round((currentSource.similarityScore || 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                  [Source {currentIndex + 1}]
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-sm">
                  {currentSource.docTitle}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exact retrieved passage used by Gemini to ground this response
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Semantic Match</span>
            <div className="flex items-center space-x-1 font-mono font-bold text-cyan-400 mt-0.5">
              <Percent className="w-3 h-3" />
              <span>{matchPercentage}% Match</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Chunk Location</span>
            <div className="font-mono text-slate-200 mt-0.5">
              Chunk #{currentSource.chunkIndex + 1} of {currentSource.totalChunks || '?'}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Estimated Page</span>
            <div className="font-mono text-slate-200 mt-0.5">
              Page {currentSource.page || 1}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Token Size</span>
            <div className="font-mono text-slate-200 mt-0.5">
              ~{currentSource.tokenEstimate || Math.ceil(currentSource.text.length / 4)} tokens
            </div>
          </div>
        </div>

        {/* Passage Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Source Text Passage Excerpt:</span>
            </span>

            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy Excerpt'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
            {currentSource.text}
          </div>

          {/* Quick Context Action */}
          {onAskAboutSource && (
            <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/20 flex items-center justify-between">
              <div className="text-xs text-indigo-300">
                Want to analyze this specific passage deeper?
              </div>
              <button
                onClick={() => {
                  onAskAboutSource(currentSource.text, currentSource.docTitle);
                  onClose();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1 shadow-sm"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Ask Follow-up</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation (Step through sources) */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex <= 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Source</span>
            </button>

            <button
              onClick={() => onSelectIndex(Math.min(total - 1, currentIndex + 1))}
              disabled={currentIndex >= total - 1}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
            >
              <span>Next Source</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Source {currentIndex + 1} of {total}
          </span>
        </div>
      </div>
    </div>
  );
};

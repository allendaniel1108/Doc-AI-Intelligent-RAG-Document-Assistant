import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  FileText, 
  Search, 
  Tag, 
  ExternalLink,
  Copy,
  Check,
  Hash
} from 'lucide-react';
import { DocumentRecord, DocumentChunk } from '../types';

interface ChunkVisualizerModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery?: (q: string) => void;
}

export const ChunkVisualizerModal: React.FC<ChunkVisualizerModalProps> = ({
  document,
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);

  if (!isOpen || !document) return null;

  const chunks = document.chunks || [];
  const filteredChunks = chunks.filter(c => 
    c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.chunkIndex.toString().includes(searchTerm)
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white truncate max-w-md">{document.title}</h2>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full">
                  {chunks.length} Chunks
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total size: {(document.fileSize / 1024).toFixed(1)} KB • {document.textLength.toLocaleString()} characters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Stats Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter chunks by content keywords or #..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Showing <strong className="text-white">{filteredChunks.length}</strong> of {chunks.length} chunks</span>
          </div>
        </div>

        {/* Chunks List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {filteredChunks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No chunks match your search term.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`p-4 rounded-xl border transition ${
                  selectedChunk?.id === chunk.id
                    ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                      <Hash className="w-3 h-3" />
                      <span>Chunk {chunk.chunkIndex + 1}</span>
                    </span>
                    {chunk.page && (
                      <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        Page ~{chunk.page}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      Chars [{chunk.charStart} - {chunk.charEnd}]
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ~{chunk.tokenEstimate} tokens
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopy(chunk.id, chunk.text)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Copy chunk text"
                    >
                      {copiedId === chunk.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 whitespace-pre-wrap">
                  {chunk.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer with Sample Questions */}
        {document.sampleQuestions && document.sampleQuestions.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
              <Tag className="w-3 h-3 text-cyan-400" />
              <span>Recommended Questions for this document:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {document.sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (onSelectQuery) {
                      onSelectQuery(q);
                      onClose();
                    }
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

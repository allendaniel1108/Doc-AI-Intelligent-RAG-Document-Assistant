import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Trash2, 
  Layers, 
  Plus, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  Globe,
  Search,
  ArrowUpDown,
  Calendar,
  CheckSquare,
  Square,
  X,
  Loader2,
  Filter,
  Sparkles
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentListProps {
  documents: DocumentRecord[];
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
  onOpenUpload: () => void;
  onViewChunks: (doc: DocumentRecord) => void;
  onDeleteDoc: (id: string) => void;
  onBatchDeleteDocs: (ids: string[]) => void;
  onSelectSampleQuery: (q: string, docId: string) => void;
  isDeleting?: boolean;
  onCloseMobile?: () => void;
}

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'chunks-desc';

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocId,
  onSelectDoc,
  onOpenUpload,
  onViewChunks,
  onDeleteDoc,
  onBatchDeleteDocs,
  onSelectSampleQuery,
  isDeleting = false,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Sort
  const filteredAndSortedDocs = useMemo(() => {
    let result = documents.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.fileType.toLowerCase().includes(q) ||
        (doc.sampleQuestions || []).some(sq => sq.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      if (sortOption === 'name-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === 'name-desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortOption === 'size-desc') {
        return b.fileSize - a.fileSize;
      }
      if (sortOption === 'chunks-desc') {
        return b.chunkCount - a.chunkCount;
      }
      return 0;
    });

    return result;
  }, [documents, searchQuery, sortOption]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedDocs.map((d) => d.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0 || isDeleting) return;
    onBatchDeleteDocs(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Uploaded';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Uploaded';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800">
      {/* Top Bar */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Document Repository
          </h2>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono font-semibold">
            {documents.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenUpload}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            title="Upload new document (PDF/DOCX/TXT)"
          >
            <Plus className="w-4 h-4" />
          </button>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Sort Controls (Priority 2) */}
      <div className="p-3 space-y-2 border-b border-slate-800/80 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or topic..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1">
            <ArrowUpDown className="w-3 h-3 text-indigo-400" />
            <span>Sort by:</span>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-desc">Largest Size</option>
            <option value="chunks-desc">Most Chunks</option>
          </select>
        </div>
      </div>

      {/* Multi-Select Action Bar (Priority 2) */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-2 bg-indigo-950/40 border-b border-indigo-500/30 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
          <div className="flex items-center space-x-1.5 text-indigo-300 font-medium">
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedIds.size} Selected</span>
          </div>

          <button
            type="button"
            onClick={handleBatchDelete}
            disabled={isDeleting}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 shadow-sm"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Global / All Documents Option */}
      <div className="p-3 pb-1 border-b border-slate-800/60">
        <button
          onClick={() => {
            onSelectDoc('all');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between ${
            selectedDocId === 'all'
              ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-400/40 text-white shadow-sm'
              : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${selectedDocId === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold block text-slate-200">
                All Documents Scope
              </span>
              <span className="text-[10px] text-slate-400">
                Search across entire vector repository
              </span>
            </div>
          </div>
          {selectedDocId === 'all' && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
          )}
        </button>
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center space-x-1.5 cursor-pointer" onClick={toggleSelectAll}>
            {selectedIds.size === filteredAndSortedDocs.length && filteredAndSortedDocs.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Select All ({filteredAndSortedDocs.length})</span>
          </div>
          <span className="text-[10px] text-slate-500">Persistent SQLite</span>
        </div>

        {filteredAndSortedDocs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-1">
            <p>No documents found matching "{searchQuery}".</p>
          </div>
        ) : (
          filteredAndSortedDocs.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const isChecked = selectedIds.has(doc.id);
            const isSystemDoc = doc.userId === 'system';

            return (
              <div
                key={doc.id}
                onClick={() => {
                  onSelectDoc(doc.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`p-3 rounded-xl border transition cursor-pointer relative group space-y-2 ${
                  isSelected
                    ? 'bg-slate-800/80 border-indigo-500/60 shadow-md shadow-indigo-950/40 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                {/* Header Row: Checkbox, Title, Badges */}
                <div className="flex items-start space-x-2.5">
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(doc.id, e)}
                    className="mt-0.5 text-slate-500 hover:text-cyan-400 transition"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold truncate text-white" title={doc.title}>
                        {doc.title}
                      </h3>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1"></span>
                      )}
                    </div>

                    {/* Metadata & Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-cyan-300">
                        {doc.chunkCount} chunks
                      </span>
                      <span>•</span>
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.2 rounded font-medium ${
                        isSystemDoc ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isSystemDoc ? 'System Demo' : 'Indexed & Ready'}
                      </span>
                    </div>

                    {/* Upload Date */}
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChunks(doc);
                    }}
                    className="text-slate-400 hover:text-cyan-300 flex items-center space-x-1 transition"
                    title="Inspect vector chunks"
                  >
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>Inspect Chunks</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDoc(doc.id);
                    }}
                    disabled={isDeleting}
                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition disabled:opacity-40"
                    title={`Delete ${doc.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Suggested Queries */}
                {isSelected && doc.sampleQuestions && doc.sampleQuestions.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                      <HelpCircle className="w-3 h-3 text-cyan-400" />
                      <span>Suggested Queries:</span>
                    </span>
                    <div className="space-y-1">
                      {doc.sampleQuestions.slice(0, 3).map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSampleQuery(q, doc.id);
                            if (onCloseMobile) onCloseMobile();
                          }}
                          className="w-full text-left text-[11px] p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded-lg transition flex items-start space-x-1.5 border border-slate-800"
                        >
                          <span className="text-cyan-400 font-bold shrink-0">›</span>
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

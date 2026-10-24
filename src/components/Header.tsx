import React from 'react';
import { 
  FileText, 
  Database, 
  Layers, 
  Sparkles, 
  HelpCircle, 
  PlusCircle, 
  Zap,
  Info,
  MessageSquare,
  UploadCloud,
  FolderOpen
} from 'lucide-react';

interface HeaderProps {
  totalDocs: number;
  totalChunks: number;
  hasApiKey: boolean;
  activeView: 'upload' | 'chat';
  setActiveView: (view: 'upload' | 'chat') => void;
  onOpenUpload: () => void;
  onOpenVectorStore: () => void;
  onOpenProblemStatement: () => void;
  strictMode: boolean;
  setStrictMode: (val: boolean) => void;
  onToggleMobileDocs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalDocs,
  totalChunks,
  hasApiKey,
  activeView,
  setActiveView,
  onOpenUpload,
  onOpenVectorStore,
  onOpenProblemStatement,
  strictMode,
  setStrictMode,
  onToggleMobileDocs,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  doc_ai
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  RAG Core v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block">
                Persistent SQLite Vector Retrieval & Grounded Generation
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs: Document Center vs RAG Assistant */}
          <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveView('upload')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                activeView === 'upload'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Document Center</span>
              <span className="sm:hidden">Upload</span>
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                activeView === 'chat'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Doc AI Assistant</span>
              <span className="sm:hidden">Assistant</span>
            </button>
          </div>

          {/* Quick Stats Badges & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 text-xs">
            {/* Mobile Document Drawer Trigger (Fix for mobile mode) */}
            {onToggleMobileDocs && activeView === 'chat' && (
              <button
                onClick={onToggleMobileDocs}
                className="md:hidden px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-cyan-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1"
                title="View Document Repository"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Docs ({totalDocs})</span>
              </button>
            )}

            <button
              onClick={onOpenVectorStore}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition"
              title="Click to view Vector Store & Embedding Inspector"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300">Docs:</span>
              <span className="font-bold text-white">{totalDocs}</span>
              <span className="text-slate-600">|</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-300">Chunks:</span>
              <span className="font-bold text-cyan-300">{totalChunks}</span>
            </button>

            {/* Strict Grounding Toggle */}
            <div 
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800"
              title="Strict Grounding ensures the model rejects questions not covered in the document"
            >
              <Zap className={`w-3.5 h-3.5 ${strictMode ? 'text-emerald-400' : 'text-amber-400'}`} />
              <button
                onClick={() => setStrictMode(!strictMode)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                  strictMode 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {strictMode ? 'Strict Grounded' : 'Permissive'}
              </button>
            </div>

            <button
              onClick={onOpenProblemStatement}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center space-x-1.5"
              title="View Problem Statement #01 & Criteria"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Problem Spec</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

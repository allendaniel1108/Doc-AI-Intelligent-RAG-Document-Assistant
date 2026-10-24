import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  AlignLeft, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileCode,
  Sparkles
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(120);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!docTitle) {
        setDocTitle(selected.name);
      }
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!docTitle) {
        setDocTitle(selected.name);
      }
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (tab === 'file' && !file) {
      setErrorMessage('Please select a PDF or TXT file to upload.');
      return;
    }
    if (tab === 'paste' && !rawText.trim()) {
      setErrorMessage('Please enter or paste the document content.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStep('Extracting document contents & parsing structure...');

      const formData = new FormData();
      formData.append('chunkSize', chunkSize.toString());
      formData.append('chunkOverlap', chunkOverlap.toString());

      if (tab === 'file' && file) {
        formData.append('file', file);
        formData.append('title', docTitle || file.name);
      } else {
        formData.append('text', rawText);
        formData.append('title', docTitle || 'Pasted_Knowledge_Doc.txt');
      }

      setProcessStep('Segmenting text into semantic chunks & window overlaps...');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setProcessStep('Computing dense vector embeddings with Gemini & indexing...');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      // Success
      setIsProcessing(false);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload Document for RAG</h2>
              <p className="text-xs text-slate-400">Extracts text, builds sliding chunks, and generates vector embeddings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 space-x-4">
          <button
            type="button"
            onClick={() => setTab('file')}
            disabled={isProcessing}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition ${
              tab === 'file'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload File (PDF / TXT)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            disabled={isProcessing}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition ${
              tab === 'paste'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>Paste Raw Text / Markdown</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder={tab === 'file' ? 'Leave empty to use file name' : 'e.g., Company AI Security Policy.txt'}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              disabled={isProcessing}
            />
          </div>

          {/* Tab 1: File Dropzone */}
          {tab === 'file' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Select PDF or TXT File
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  file
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.md,.json,.csv"
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Plain Text'}
                    </span>
                    <span className="text-xs text-cyan-400 font-medium">Click or drag to replace file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-200">
                      Drop your document here or <span className="text-cyan-400 underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports PDF, TXT, Markdown, or JSON documents up to 25MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Raw Text */}
          {tab === 'paste' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Paste Document Text
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste research paper abstract, technical documentation, legal clauses, or study notes..."
                rows={7}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition font-mono text-xs leading-relaxed"
                disabled={isProcessing}
              />
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                <span>{rawText.length} characters</span>
                <span>Est. ~{Math.ceil(rawText.length / 4)} tokens</span>
              </div>
            </div>
          )}

          {/* RAG Chunking Parameters */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>RAG Text Chunking Configuration</span>
              </span>
              <span className="text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                Overlap: {chunkOverlap}ch / Size: {chunkSize}ch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Chunk Size:</span>
                  <span className="font-mono text-slate-200">{chunkSize} chars</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="1200"
                  step="50"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full accent-cyan-400"
                />
                <span className="text-[10px] text-slate-500">~{Math.round(chunkSize / 4)} tokens per chunk</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Sliding Overlap:</span>
                  <span className="font-mono text-slate-200">{chunkOverlap} chars</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="250"
                  step="20"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full accent-indigo-400"
                />
                <span className="text-[10px] text-slate-500">Prevents boundary context loss</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-cyan-300">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{processStep || 'Processing document...'}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Indexing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process & Index Chunks</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  RefreshCw,
  FileText,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { ChatMessage, DocumentChunk, PipelineBreakdown } from '../types';
import { RagPipelineViewer } from './RagPipelineViewer';
import { SourcePassageModal } from './SourcePassageModal';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string, topK: number) => Promise<void>;
  isLoading: boolean;
  selectedDocTitle: string;
  onViewChunkInDoc?: (chunk: DocumentChunk) => void;
  onClearChat: () => void;
  quickStarters?: string[];
  strictMode: boolean;
  onToggleMobileDocs?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  selectedDocTitle,
  onViewChunkInDoc,
  onClearChat,
  quickStarters = [],
  strictMode,
  onToggleMobileDocs,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [topK, setTopK] = useState(4);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPipelineIds, setExpandedPipelineIds] = useState<Record<string, boolean>>({});

  // Citation Jump Modal State (Priority 1 UX)
  const [sourceModalState, setSourceModalState] = useState<{
    isOpen: boolean;
    sources: DocumentChunk[];
    currentIndex: number;
  }>({
    isOpen: false,
    sources: [],
    currentIndex: 0,
  });

  // Query In-Flight Stage Progress
  const [progressStage, setProgressStage] = useState<number>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Simulate real-time progress steps while waiting for server response
  useEffect(() => {
    if (isLoading) {
      setProgressStage(1);
      const t1 = setTimeout(() => setProgressStage(2), 600);
      const t2 = setTimeout(() => setProgressStage(3), 1400);
      const t3 = setTimeout(() => setProgressStage(4), 2200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setProgressStage(1);
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    const query = inputQuery.trim();
    setInputQuery('');
    onSendMessage(query, topK);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePipeline = (msgId: string) => {
    setExpandedPipelineIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const openSourceModal = (sources: DocumentChunk[], index: number) => {
    setSourceModalState({
      isOpen: true,
      sources,
      currentIndex: Math.max(0, Math.min(sources.length - 1, index)),
    });
  };

  // Render text with clickable interactive citation pills that jump to source passages
  const renderContentWithCitations = (content: string, retrievedChunks?: DocumentChunk[]) => {
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return <div className="whitespace-pre-wrap font-sans space-y-2">{content}</div>;
    }

    const parts = content.split(/(\[Source\s+\d+\]|\[source\s+\d+\])/gi);

    return (
      <div className="whitespace-pre-wrap font-sans space-y-2 leading-relaxed">
        {parts.map((part, index) => {
          const match = part.match(/\[Source\s+(\d+)\]/i);
          if (match) {
            const sourceNum = parseInt(match[1], 10);
            const chunk = retrievedChunks[sourceNum - 1];

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (chunk) {
                    openSourceModal(retrievedChunks, sourceNum - 1);
                  }
                }}
                className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-500/20 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-100 border border-indigo-500/40 hover:border-cyan-400 font-mono text-[11px] font-bold transition cursor-pointer shadow-sm align-baseline"
                title={chunk ? `Click to view source passage in "${chunk.docTitle}" (Page ${chunk.page || 1})` : 'Jump to Source'}
              >
                <span>{part}</span>
                {chunk && (
                  <span className="ml-1 text-[10px] opacity-75 font-normal">
                    {chunk.matchPercentage || Math.round((chunk.similarityScore || 0) * 100)}%
                  </span>
                )}
              </button>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 relative">
      {/* Top Scope & Controls Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          {/* Mobile Document Drawer Trigger (Fix for mobile mode) */}
          {onToggleMobileDocs && (
            <button
              onClick={onToggleMobileDocs}
              className="md:hidden px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1 shrink-0"
              title="Open Document Repository"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>
          )}

          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-cyan-400 shrink-0">
            <Bot className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-bold text-white truncate">Doc AI Assistant</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                strictMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {strictMode ? 'Strict Grounding' : 'Permissive'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Active Scope: <span className="text-cyan-300 font-semibold">{selectedDocTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition disabled:opacity-40"
              title="Clear active conversation"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-auto pt-8 sm:pt-12 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-slate-700/80 flex items-center justify-center shadow-xl shadow-indigo-950/40">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                AI-Powered Document Intelligence Assistant
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Ground answers directly in your uploaded PDF, DOCX, or text documents. Every factual claim is cited with verified source passages.
              </p>
            </div>

            {/* Quick Starter Suggestions */}
            {quickStarters.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-center space-x-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Suggested Starter Questions:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-xl mx-auto">
                  {quickStarters.map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(starter, topK)}
                      disabled={isLoading}
                      className="p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-400/40 rounded-xl text-xs text-slate-300 hover:text-white transition flex items-start space-x-2 text-left disabled:opacity-40"
                    >
                      <span className="text-cyan-400 font-bold shrink-0">›</span>
                      <span>{starter}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPipelineOpen = expandedPipelineIds[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Message Header */}
                <div className="flex items-center space-x-2 px-1 text-[11px] text-slate-500">
                  <span className="font-semibold">{isUser ? 'You' : 'Doc AI Assistant'}</span>
                  {!isUser && msg.confidenceScore !== undefined && !msg.isError && (
                    <>
                      <span>•</span>
                      <span className={`font-mono font-bold ${
                        msg.confidenceScore > 70 ? 'text-emerald-400' : msg.confidenceScore > 40 ? 'text-cyan-400' : 'text-amber-400'
                      }`}>
                        {msg.confidenceScore}% Grounded
                      </span>
                    </>
                  )}
                  <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-3xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                      : msg.isError
                      ? 'bg-rose-950/30 border border-rose-500/40 text-slate-200 rounded-tl-none'
                      : msg.isFoundInDocument === false
                      ? 'bg-slate-900 border border-rose-500/30 text-slate-200 rounded-tl-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Actionable Error Banner with Retry (Priority 4) */}
                  {!isUser && msg.isError && (
                    <div className="mb-3 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start justify-between space-x-3 text-xs text-rose-300">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <div>
                          <strong className="block font-semibold">Request Error:</strong>
                          <span>{msg.content}</span>
                        </div>
                      </div>
                      {msg.errorAction && (
                        <button
                          type="button"
                          onClick={() => onSendMessage(msg.errorAction!, topK)}
                          disabled={isLoading}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Warning banner if answer was not found in document (Requirement 8) */}
                  {!isUser && !msg.isError && msg.isFoundInDocument === false && (
                    <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-2.5 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <strong className="block font-semibold">Reliable Grounding Fallback:</strong>
                        Information regarding this query could not be verified in the indexed document(s). Under strict RAG guidelines, generative hallucinations are prevented.
                      </div>
                    </div>
                  )}

                  {/* Render Body with Clickable Inline Citations (Priority 1 UX) */}
                  {!isUser && !msg.isError ? (
                    renderContentWithCitations(msg.content, msg.retrievedChunks)
                  ) : (
                    <div className="whitespace-pre-wrap font-sans space-y-2">{msg.content}</div>
                  )}

                  {/* Supporting Source References Drawer (Clickable pills) */}
                  {!isUser && !msg.isError && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Supporting Source References (Click to jump):</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {msg.retrievedChunks.length} Chunks Retrieved
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {msg.retrievedChunks.map((chunk, cIdx) => (
                          <button
                            key={chunk.id || cIdx}
                            type="button"
                            onClick={() => openSourceModal(msg.retrievedChunks!, cIdx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-400 text-[11px] text-cyan-300 transition flex items-center space-x-1.5 shadow-sm group"
                          >
                            <span className="font-bold text-indigo-400 group-hover:text-cyan-300">[Source {cIdx + 1}]</span>
                            <span className="truncate max-w-[140px] text-slate-300">{chunk.docTitle}</span>
                            <span className="font-mono text-cyan-400 text-[10px]">
                              {chunk.matchPercentage || Math.round((chunk.similarityScore || 0) * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Bottom Action Bar */}
                  {!isUser && !msg.isError && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        {msg.pipelineBreakdown && (
                          <button
                            onClick={() => togglePipeline(msg.id)}
                            className="px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition flex items-center space-x-1 text-[11px] font-medium"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>{isPipelineOpen ? 'Close Pipeline' : 'Inspect RAG Pipeline'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white transition flex items-center space-x-1 text-[11px]"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline RAG Pipeline Viewer Drawer */}
                {!isUser && isPipelineOpen && msg.pipelineBreakdown && (
                  <div className="w-full max-w-3xl">
                    <RagPipelineViewer
                      breakdown={msg.pipelineBreakdown}
                      confidenceScore={msg.confidenceScore}
                      isFoundInDocument={msg.isFoundInDocument}
                      retrievedChunks={msg.retrievedChunks}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Real Progress Indicator (Priority 3 Real Progress UX) */}
        {isLoading && (
          <div className="flex items-start space-x-3 max-w-3xl animate-in fade-in">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>
                    {progressStage === 1 && 'Phase 1/4: Embedding Query (Dense 768-D Vector)...'}
                    {progressStage === 2 && 'Phase 2/4: Scanning SQLite Persistent Vector Index...'}
                    {progressStage === 3 && 'Phase 3/4: Reranking Chunks & Positional Balancing...'}
                    {progressStage === 4 && 'Phase 4/4: Gemini 3.8 Flash Grounded Generative Synthesis...'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Step {progressStage} of 4</span>
              </div>

              {/* Real Multi-Stage Progress Bar */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressStage * 25}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-500">
                <span className={progressStage >= 1 ? 'text-cyan-400 font-semibold' : ''}>1. Embed</span>
                <span className={progressStage >= 2 ? 'text-indigo-400 font-semibold' : ''}>2. Vector Scan</span>
                <span className={progressStage >= 3 ? 'text-purple-400 font-semibold' : ''}>3. Cross-Rerank</span>
                <span className={progressStage >= 4 ? 'text-emerald-400 font-semibold' : ''}>4. Attributed Gen</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
          {/* Query Settings Toolbar */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Retrieval Top-K:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  disabled={isLoading}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={2}>2 Chunks</option>
                  <option value={4}>4 Chunks (Recommended)</option>
                  <option value={6}>6 Chunks</option>
                  <option value={8}>8 Chunks</option>
                </select>
              </div>

              <span className="text-slate-600 hidden sm:inline">|</span>

              <span className="hidden sm:inline text-[11px] text-slate-400">
                Grounding: <strong className={strictMode ? 'text-emerald-400' : 'text-amber-400'}>{strictMode ? 'Strict Attribution' : 'Permissive'}</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onSendMessage(`Summarize the document ${selectedDocTitle} thoroughly with key takeaways, main findings, and structure.`, 6)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-[11px] transition flex items-center space-x-1 disabled:opacity-40"
                title="Generate comprehensive executive summary"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Summarize Document</span>
              </button>
            </div>
          </div>

          {/* Textarea + Submit */}
          <div className="relative flex items-end bg-slate-950 border border-slate-700/80 focus-within:border-cyan-400 rounded-2xl shadow-inner transition">
            <textarea
              ref={textareaRef}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={2}
              placeholder="Ask a question about the document(s)... (e.g. 'What are the five phases of RAG?')"
              className="w-full p-3.5 pr-24 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
            />

            <div className="absolute right-2.5 bottom-2.5 flex items-center space-x-1.5">
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Source Passage Modal (Jump to Citation) */}
      <SourcePassageModal
        sources={sourceModalState.sources}
        currentIndex={sourceModalState.currentIndex}
        isOpen={sourceModalState.isOpen}
        onClose={() => setSourceModalState(prev => ({ ...prev, isOpen: false }))}
        onSelectIndex={(index) => setSourceModalState(prev => ({ ...prev, currentIndex: index }))}
        onAskAboutSource={(text, doc) => {
          onSendMessage(`Regarding this passage from ${doc}: "${text.slice(0, 180)}...", can you explain its technical significance in detail?`, topK);
        }}
      />
    </div>
  );
};

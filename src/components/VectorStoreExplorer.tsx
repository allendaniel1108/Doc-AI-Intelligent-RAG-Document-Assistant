import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Search, 
  Sliders, 
  Layers, 
  Cpu, 
  Sparkles, 
  Activity, 
  FileText,
  Hash,
  ArrowUpDown,
  Percent,
  CheckCircle2,
  Play,
  Loader2,
  Award,
  Zap
} from 'lucide-react';
import { DocumentChunk, BenchmarkEvaluationResult } from '../types';

interface VectorStoreExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  totalDocs: number;
  totalChunks: number;
}

export const VectorStoreExplorer: React.FC<VectorStoreExplorerProps> = ({
  isOpen,
  onClose,
  totalDocs,
  totalChunks,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'benchmark'>('search');
  const [testQuery, setTestQuery] = useState('');
  const [topK, setTopK] = useState(4);
  const [results, setResults] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    embedTimeMs: number;
    searchTimeMs: number;
    totalCandidates: number;
  } | null>(null);

  // Benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkEvaluationResult | null>(null);

  if (!isOpen) return null;

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/rag/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery, topK, docId: 'all' }),
      });
      const data = await res.json();
      setResults(data.chunksRetrieved || []);
      setStats({
        embedTimeMs: data.embedTimeMs,
        searchTimeMs: data.searchTimeMs,
        totalCandidates: data.totalCandidates,
      });
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    try {
      setIsBenchmarking(true);
      const res = await fetch('/api/rag/evaluate');
      const data = await res.json();
      setBenchmarkData(data);
      setIsBenchmarking(false);
    } catch (err) {
      console.error('Benchmark failed:', err);
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Persistent SQLite Vector Store & Retriever</h2>
              <p className="text-xs text-slate-400">
                Hybrid Retrieval (Dense Vectors + BM25 Lexical) with Cross-Reranker & Evaluation Suite
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 space-x-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'search'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Interactive Vector Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'benchmark'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Retrieval Quality Benchmark</span>
          </button>
        </div>

        {/* Vector Store Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-2">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Storage Engine</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">SQLite (Persistent)</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Indexed Chunks</span>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">{totalChunks} Chunks</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Retriever Mode</span>
            <div className="text-sm font-bold text-indigo-400 mt-0.5">Hybrid + Reranker</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Security Isolation</span>
            <div className="text-sm font-bold text-purple-400 mt-0.5">Tenant Scoped</div>
          </div>
        </div>

        {/* Tab 1: Interactive Search Simulator */}
        {activeTab === 'search' && (
          <div className="p-6 pt-3 space-y-4 flex-1 overflow-y-auto">
            <form onSubmit={handleTestSearch} className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Real-Time Hybrid Similarity & Reranking</span>
                </span>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span>Top-K:</span>
                  <select
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    disabled={isLoading}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                  >
                    <option value={2}>2 Chunks</option>
                    <option value={4}>4 Chunks</option>
                    <option value={6}>6 Chunks</option>
                    <option value={8}>8 Chunks</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter a test query to calculate hybrid cosine & lexical scores..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isLoading || !testQuery.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cpu className="w-3.5 h-3.5" />
                  )}
                  <span>Score Chunks</span>
                </button>
              </div>

              {stats && (
                <div className="flex items-center space-x-4 text-[11px] text-slate-400 font-mono pt-1">
                  <span>Embedding: <strong className="text-cyan-400">{stats.embedTimeMs}ms</strong></span>
                  <span>Rerank: <strong className="text-indigo-400">{stats.searchTimeMs}ms</strong></span>
                  <span>Candidates Scanned: <strong className="text-white">{stats.totalCandidates}</strong> chunks</span>
                </div>
              )}
            </form>

            {/* Results List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Retrieved Candidate Chunks</span>
                {results.length > 0 && (
                  <span className="text-cyan-400 font-mono text-[11px]">Ranked by Cross-Reranker</span>
                )}
              </h3>

              {results.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
                  Enter a query above to run vector distance retrieval and inspect cosine matching scores.
                </div>
              ) : (
                results.map((chunk, idx) => (
                  <div 
                    key={chunk.id || idx}
                    className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px]">
                          Rank #{idx + 1}
                        </span>
                        <span className="font-semibold text-white">{chunk.docTitle}</span>
                        <span className="text-slate-500 text-[11px]">Chunk #{chunk.chunkIndex + 1}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (chunk.similarityScore || 0) > 0.7
                                ? 'bg-emerald-400'
                                : (chunk.similarityScore || 0) > 0.45
                                ? 'bg-cyan-400'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((chunk.similarityScore || 0) * 100))}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200 text-xs">
                          {((chunk.similarityScore || 0) * 100).toFixed(1)}% Score
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                      "{chunk.text}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Retrieval Evaluation Benchmark Suite */}
        {activeTab === 'benchmark' && (
          <div className="p-6 pt-3 space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>RAG Retrieval Quality Evaluation Suite (Priority 3)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Executes known query benchmarks, evaluates Precision@4 and Mean Reciprocal Rank (MRR).
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                {isBenchmarking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running Evaluation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Benchmark Suite</span>
                  </>
                )}
              </button>
            </div>

            {benchmarkData ? (
              <div className="space-y-4">
                {/* Scorecard Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold">Precision @ 4</span>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {(benchmarkData.precisionAt4 * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
                    <span className="text-[10px] text-indigo-400 uppercase font-semibold">Mean Reciprocal Rank (MRR)</span>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {benchmarkData.meanReciprocalRank.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl">
                    <span className="text-[10px] text-cyan-400 uppercase font-semibold">Tests Evaluated</span>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {benchmarkData.testsRun} Queries
                    </div>
                  </div>
                </div>

                {/* Benchmark Test Details */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Details</span>
                  {benchmarkData.benchmarkResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">"{item.query}"</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.hit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.hit ? `Hit at Rank #${item.rank}` : 'Miss'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{item.latencyMs}ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Expected: <strong className="text-slate-300">{item.expectedDocTitle}</strong></span>
                        <span>Retrieved Top Match: <strong className="text-cyan-300">{item.retrievedDocTitles[0] || 'None'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
                Click "Run Benchmark Suite" above to evaluate retrieval accuracy, latency, and MRR.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  ArrowRight, 
  Database, 
  Cpu, 
  Search, 
  FileCheck2, 
  MessageSquare, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { PipelineBreakdown, DocumentChunk } from '../types';

interface RagPipelineViewerProps {
  breakdown: PipelineBreakdown;
  confidenceScore?: number;
  isFoundInDocument?: boolean;
  retrievedChunks?: DocumentChunk[];
  onViewChunkInDoc?: (chunk: DocumentChunk) => void;
}

export const RagPipelineViewer: React.FC<RagPipelineViewerProps> = ({
  breakdown,
  confidenceScore = 0,
  isFoundInDocument = true,
  retrievedChunks = [],
  onViewChunkInDoc,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeStep, setActiveStep] = useState<number>(3); // Default to Top-K chunks

  const topScore = breakdown.highestSimilarityScore ?? (breakdown.step4_topChunks?.[0]?.score || 0);

  return (
    <div className="mt-3 rounded-xl border border-indigo-500/30 bg-slate-950/70 overflow-hidden shadow-inner">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 bg-indigo-950/30 hover:bg-indigo-950/50 cursor-pointer flex items-center justify-between border-b border-indigo-500/20 transition"
      >
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200">
            RAG Pipeline Inspector
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
            Cosine Match: {(topScore * 100).toFixed(1)}%
          </span>
          {isFoundInDocument ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Grounded</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Low Grounding</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>{isExpanded ? 'Hide Steps' : 'View 6 RAG Steps'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Step Flow Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-center text-[10px]">
            {[
              { num: 1, name: 'Query Input', icon: MessageSquare },
              { num: 2, name: 'Embedding Vector', icon: Cpu },
              { num: 3, name: 'Cosine Search', icon: Search },
              { num: 4, name: 'Top-K Chunks', icon: Layers },
              { num: 5, name: 'Prompt Context', icon: Database },
              { num: 6, name: 'Attributed LLM', icon: Sparkles },
            ].map(step => (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`p-2 rounded-lg border transition flex flex-col items-center justify-center space-y-1 ${
                  activeStep === step.num
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <step.icon className="w-3.5 h-3.5" />
                <span className="font-semibold">{step.num}. {step.name}</span>
              </button>
            ))}
          </div>

          {/* Step Detail Content */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
            {activeStep === 1 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Step 1: User Natural Language Query
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-cyan-300">
                  "{breakdown.step1_query}"
                </div>
                <p className="text-[11px] text-slate-400">
                  The query is analyzed without conversational noise to extract key semantic intentions.
                </p>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Step 2: Vector Embedding Generation</span>
                  <span className="text-cyan-400 font-mono">{breakdown.step2_embeddingTimeMs}ms</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                  Model: Gemini Embedding (gemini-embedding-2-preview) • 768 Dimensions<br />
                  Vector: [0.0342, -0.0128, 0.0891, 0.0412, -0.0074, 0.0219, ... +762 more dimensions]
                </div>
                <p className="text-[11px] text-slate-400">
                  Projects query text into continuous mathematical hyperspace where semantic similarities translate into angular proximity.
                </p>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Step 3: Vector Store Cosine Similarity Scan</span>
                  <span className="text-indigo-400 font-mono">{breakdown.step3_chunksEvaluated} Chunks Evaluated</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div>Formula: Cosine Similarity = (Query_Vector • Chunk_Vector) / (||Query|| × ||Chunk||)</div>
                  <div className="text-slate-400">Range: -1.0 to 1.0 (Higher values indicate closer conceptual relevance)</div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every chunk in the selected document index is scored and ranked by cosine similarity against the query embedding.
                </p>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-2">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Step 4: Top Retrieved Supporting Chunks</span>
                  <span className="text-cyan-400 font-mono">{breakdown.step4_topChunks?.length || 0} Retrieved</span>
                </div>

                <div className="space-y-2">
                  {(breakdown.step4_topChunks || []).map((chunk, idx) => (
                    <div 
                      key={chunk.id || idx}
                      className="p-2.5 bg-slate-950/80 rounded border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-cyan-300">
                          [Source {idx + 1}] {chunk.docTitle}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                chunk.percentage > 70 ? 'bg-emerald-400' : chunk.percentage > 45 ? 'bg-cyan-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${Math.min(100, chunk.percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-200">{chunk.percentage}% match</span>
                        </div>
                      </div>
                      <p className="text-slate-400 font-mono text-[11px] leading-relaxed line-clamp-2">
                        "{chunk.preview}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Step 5: Context-Augmented Prompt Construction</span>
                  <span className="text-indigo-300 font-mono">~{breakdown.step5_promptTokensEst} Tokens</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-indigo-400">[System]: Answer strictly using retrieved context below. Cite [Source X].</div>
                  <div className="text-cyan-400">[Context]: {breakdown.step4_topChunks?.map((c, i) => `[Source ${i+1}]: "${c.preview.slice(0, 60)}..."`).join(' ')}</div>
                  <div className="text-slate-300">[User Query]: {breakdown.step1_query}</div>
                </div>
              </div>
            )}

            {activeStep === 6 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Step 6: Grounded Synthesis with Citations</span>
                  <span className="text-cyan-400 font-mono">{breakdown.step6_modelDurationMs}ms</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  The model synthesizes the answer with strict attribution. Claims without corresponding context are rejected to satisfy the zero-hallucination constraint.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

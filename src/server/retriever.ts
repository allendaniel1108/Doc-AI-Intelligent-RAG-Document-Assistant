import { DbChunk } from './db';

export interface ScoredChunk extends DbChunk {
  denseScore: number;
  lexicalScore: number;
  hybridScore: number;
  rerankScore: number;
  matchPercentage: number;
}

// Compute cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Lexical BM25-style keyword matching
export function computeLexicalScore(query: string, text: string, docTitle: string): number {
  const queryTerms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  if (queryTerms.length === 0) return 0;

  const combined = `${docTitle} ${text}`.toLowerCase();
  let matchedTerms = 0;
  let termFrequency = 0;

  for (const term of queryTerms) {
    if (combined.includes(term)) {
      matchedTerms++;
      // count term frequency
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      const count = (combined.match(regex) || []).length;
      termFrequency += Math.min(3, count);
    }
  }

  // Exact phrase matching bonus
  let exactPhraseBonus = 0;
  if (queryTerms.length > 1 && combined.includes(query.toLowerCase().trim())) {
    exactPhraseBonus = 0.35;
  }

  const coverageRatio = matchedTerms / queryTerms.length;
  const tfBonus = Math.min(0.2, (termFrequency / (queryTerms.length * 3)) * 0.2);

  return Math.min(1, coverageRatio * 0.65 + tfBonus + exactPhraseBonus);
}

// Cross-Reranker: reranks candidates combining dense, lexical, and positional diversity
export function crossRerankCandidates(
  query: string,
  queryEmbedding: number[],
  candidateChunks: DbChunk[],
  topK: number = 4
): ScoredChunk[] {
  if (candidateChunks.length === 0) return [];

  // 1. Initial Scoring
  const scored: ScoredChunk[] = candidateChunks.map(chunk => {
    const dense = chunk.embedding && chunk.embedding.length > 0 
      ? cosineSimilarity(queryEmbedding, chunk.embedding) 
      : 0;
    const lexical = computeLexicalScore(query, chunk.text, chunk.docTitle);
    
    // Weighted hybrid baseline
    const hybrid = Math.min(1, dense * 0.60 + lexical * 0.40);

    return {
      ...chunk,
      denseScore: Number(dense.toFixed(4)),
      lexicalScore: Number(lexical.toFixed(4)),
      hybridScore: Number(hybrid.toFixed(4)),
      rerankScore: Number(hybrid.toFixed(4)),
      matchPercentage: Math.max(0, Math.min(100, Math.round(hybrid * 100))),
    };
  });

  // Sort by hybrid score
  scored.sort((a, b) => b.hybridScore - a.hybridScore);

  // 2. Reranking & Diversity Balancing
  // Penalize redundant adjacent chunks from the same document if better distributed chunks exist
  const finalReranked: ScoredChunk[] = [];
  const selectedDocChunkIndexes = new Map<string, Set<number>>();

  for (const item of scored) {
    const chosenIndices = selectedDocChunkIndexes.get(item.docId) || new Set<number>();
    
    // Check if immediate neighboring chunk is already selected
    let neighborPenalty = 0;
    if (chosenIndices.has(item.chunkIndex - 1) || chosenIndices.has(item.chunkIndex + 1)) {
      neighborPenalty = 0.04;
    }

    const finalScore = Math.max(0, item.hybridScore - neighborPenalty);
    item.rerankScore = Number(finalScore.toFixed(4));
    item.matchPercentage = Math.round(finalScore * 100);

    finalReranked.push(item);
    chosenIndices.add(item.chunkIndex);
    selectedDocChunkIndexes.set(item.docId, chosenIndices);
  }

  // Final sort by rerank score
  finalReranked.sort((a, b) => b.rerankScore - a.rerankScore);
  return finalReranked.slice(0, topK);
}

// Built-in RAG Evaluation Suite
export const EVAL_BENCHMARK_SUITE = [
  {
    query: 'What are the five phases of the RAG pipeline?',
    expectedDocTitle: 'Doc_AI_RAG_Technical_Spec.pdf',
    targetKeywords: ['Phase 1', 'Ingestion', 'Chunking', 'Dense Vector Embeddings'],
  },
  {
    query: 'What are the 8 key requirements in Problem Statement 01?',
    expectedDocTitle: 'Problem_Statement_01_DocAI.txt',
    targetKeywords: ['Document Upload', 'Document Processing', 'Generative AI', 'Reliable Responses'],
  },
  {
    query: 'How does Doc AI prevent hallucinations when answers are missing?',
    expectedDocTitle: 'Doc_AI_RAG_Technical_Spec.pdf',
    targetKeywords: ['confidence threshold', 'does not contain information', 'fabricate'],
  },
  {
    query: 'What constraint disqualifies a normal chatbot in this challenge?',
    expectedDocTitle: 'Problem_Statement_01_DocAI.txt',
    targetKeywords: ['normal chatbot', 'without retrieving', 'RAG requirement'],
  },
];

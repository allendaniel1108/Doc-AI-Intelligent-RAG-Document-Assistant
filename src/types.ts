export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  charStart: number;
  charEnd: number;
  page?: number;
  similarityScore?: number;
  matchPercentage?: number;
  tokenEstimate?: number;
}

export interface DocumentRecord {
  id: string;
  userId?: string;
  title: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  textLength: number;
  chunkCount: number;
  chunks?: DocumentChunk[];
  sampleQuestions: string[];
}

export interface PipelineBreakdown {
  step1_query: string;
  step2_embeddingTimeMs: number;
  step3_chunksEvaluated: number;
  step4_topChunks: Array<{
    id: string;
    docTitle: string;
    score: number;
    percentage: number;
    preview: string;
  }>;
  step5_promptTokensEst: number;
  step6_modelDurationMs: number;
  highestSimilarityScore?: number;
}

export interface RAGResponse {
  answer: string;
  isFoundInDocument: boolean;
  confidenceScore: number;
  retrievedChunks: DocumentChunk[];
  pipelineBreakdown: PipelineBreakdown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isFoundInDocument?: boolean;
  confidenceScore?: number;
  retrievedChunks?: DocumentChunk[];
  pipelineBreakdown?: PipelineBreakdown;
  selectedDocId?: string;
  selectedDocTitle?: string;
  isError?: boolean;
  errorAction?: string;
}

export interface BenchmarkEvaluationResult {
  timestamp: string;
  testsRun: number;
  precisionAt4: number;
  meanReciprocalRank: number;
  benchmarkResults: Array<{
    query: string;
    expectedDocTitle: string;
    retrievedDocTitles: string[];
    rank: number | null;
    hit: boolean;
    mrr: number;
    topScore: number;
    latencyMs: number;
  }>;
}

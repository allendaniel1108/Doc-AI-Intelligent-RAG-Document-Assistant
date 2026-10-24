import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'doc_ai_rag.sqlite');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

export interface DbDocument {
  id: string;
  userId: string;
  title: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  textLength: number;
  chunkCount: number;
  sampleQuestions: string[];
}

export interface DbChunk {
  id: string;
  docId: string;
  userId: string;
  docTitle: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  charStart: number;
  charEnd: number;
  page?: number;
  tokenEstimate: number;
  embedding: number[];
}

export interface EvalBenchmarkResult {
  query: string;
  expectedDocTitle: string;
  retrievedDocTitles: string[];
  hit: boolean;
  mrr: number;
  topScore: number;
  latencyMs: number;
}

// Initialize SQLite Database with persistence
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log(`[SQLite] Loaded persistent vector database from ${DB_FILE}`);
    } catch (err) {
      console.warn('[SQLite] Failed to load existing database file, creating fresh one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('[SQLite] Initialized new persistent database.');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      text_length INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      sample_questions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      doc_title TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      text TEXT NOT NULL,
      char_start INTEGER NOT NULL,
      char_end INTEGER NOT NULL,
      page INTEGER,
      token_estimate INTEGER NOT NULL,
      embedding_json TEXT NOT NULL,
      FOREIGN KEY(doc_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_user ON chunks(user_id);
    CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
  `);

  persistDatabase();
  return db;
}

// Save database state to disk
export function persistDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[SQLite] Error persisting database to disk:', err);
  }
}

// Save Document with Chunks atomically
export function saveDocumentWithChunks(doc: DbDocument, chunks: DbChunk[]): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT OR REPLACE INTO documents 
      (id, user_id, title, file_type, file_size, uploaded_at, text_length, chunk_count, sample_questions) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      doc.id,
      doc.userId,
      doc.title,
      doc.fileType,
      doc.fileSize,
      doc.uploadedAt,
      doc.textLength,
      doc.chunkCount,
      JSON.stringify(doc.sampleQuestions || []),
    ]
  );

  // Insert or replace chunks
  for (const c of chunks) {
    db.run(
      `INSERT OR REPLACE INTO chunks 
        (id, doc_id, user_id, doc_title, chunk_index, total_chunks, text, char_start, char_end, page, token_estimate, embedding_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        c.id,
        c.docId,
        c.userId,
        c.docTitle,
        c.chunkIndex,
        c.totalChunks,
        c.text,
        c.charStart,
        c.charEnd,
        c.page || 1,
        c.tokenEstimate,
        JSON.stringify(c.embedding || []),
      ]
    );
  }

  persistDatabase();
}

// Get all documents accessible to user (user's docs + system demo docs)
export function getDocumentsForUser(userId: string): DbDocument[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT id, user_id, title, file_type, file_size, uploaded_at, text_length, chunk_count, sample_questions
    FROM documents 
    WHERE user_id = ? OR user_id = 'system'
    ORDER BY uploaded_at DESC;
  `);
  stmt.bind([userId]);

  const docs: DbDocument[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    docs.push({
      id: String(row.id),
      userId: String(row.user_id),
      title: String(row.title),
      fileType: String(row.file_type),
      fileSize: Number(row.file_size),
      uploadedAt: String(row.uploaded_at),
      textLength: Number(row.text_length),
      chunkCount: Number(row.chunk_count),
      sampleQuestions: JSON.parse(String(row.sample_questions || '[]')),
    });
  }
  stmt.free();
  return docs;
}

// Get single document by ID (verifying user ownership or system)
export function getDocumentById(id: string, userId: string): (DbDocument & { chunks: DbChunk[] }) | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT id, user_id, title, file_type, file_size, uploaded_at, text_length, chunk_count, sample_questions
    FROM documents 
    WHERE id = ? AND (user_id = ? OR user_id = 'system');
  `);
  stmt.bind([id, userId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject();
  stmt.free();

  // Load chunks
  const cStmt = db.prepare(`
    SELECT id, doc_id, user_id, doc_title, chunk_index, total_chunks, text, char_start, char_end, page, token_estimate, embedding_json
    FROM chunks
    WHERE doc_id = ?
    ORDER BY chunk_index ASC;
  `);
  cStmt.bind([id]);

  const chunks: DbChunk[] = [];
  while (cStmt.step()) {
    const cRow = cStmt.getAsObject();
    chunks.push({
      id: String(cRow.id),
      docId: String(cRow.doc_id),
      userId: String(cRow.user_id),
      docTitle: String(cRow.doc_title),
      chunkIndex: Number(cRow.chunk_index),
      totalChunks: Number(cRow.total_chunks),
      text: String(cRow.text),
      charStart: Number(cRow.char_start),
      charEnd: Number(cRow.char_end),
      page: Number(cRow.page) || 1,
      tokenEstimate: Number(cRow.token_estimate),
      embedding: JSON.parse(String(cRow.embedding_json || '[]')),
    });
  }
  cStmt.free();

  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    fileType: String(row.file_type),
    fileSize: Number(row.file_size),
    uploadedAt: String(row.uploaded_at),
    textLength: Number(row.text_length),
    chunkCount: Number(row.chunk_count),
    sampleQuestions: JSON.parse(String(row.sample_questions || '[]')),
    chunks,
  };
}

// Get all chunks for retrieval (filtered by user ownership or system)
export function getChunksForUser(userId: string, targetDocId?: string): DbChunk[] {
  if (!db) return [];
  let queryStr = `
    SELECT id, doc_id, user_id, doc_title, chunk_index, total_chunks, text, char_start, char_end, page, token_estimate, embedding_json
    FROM chunks
    WHERE (user_id = ? OR user_id = 'system')
  `;
  const params: any[] = [userId];

  if (targetDocId && targetDocId !== 'all') {
    queryStr += ` AND doc_id = ?`;
    params.push(targetDocId);
  }

  queryStr += ` ORDER BY doc_id, chunk_index ASC;`;

  const stmt = db.prepare(queryStr);
  stmt.bind(params);

  const chunks: DbChunk[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    chunks.push({
      id: String(row.id),
      docId: String(row.doc_id),
      userId: String(row.user_id),
      docTitle: String(row.doc_title),
      chunkIndex: Number(row.chunk_index),
      totalChunks: Number(row.total_chunks),
      text: String(row.text),
      charStart: Number(row.char_start),
      charEnd: Number(row.char_end),
      page: Number(row.page) || 1,
      tokenEstimate: Number(row.token_estimate),
      embedding: JSON.parse(String(row.embedding_json || '[]')),
    });
  }
  stmt.free();
  return chunks;
}

// Delete document with ownership check
export function deleteDocument(id: string, userId: string): { success: boolean; deletedTitle?: string; deletedChunks?: number; error?: string } {
  if (!db) return { success: false, error: 'Database not initialized' };

  // Check document exists and belongs to user (or system demo doc)
  const stmt = db.prepare(`SELECT id, title, user_id FROM documents WHERE id = ?;`);
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return { success: false, error: 'Document not found' };
  }

  const doc = stmt.getAsObject();
  stmt.free();

  if (doc.user_id !== userId && doc.user_id !== 'system') {
    return { success: false, error: 'Unauthorized: You do not have permission to delete this document' };
  }

  // Count chunks before delete
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM chunks WHERE doc_id = ?;`);
  countStmt.bind([id]);
  countStmt.step();
  const chunkCount = Number(countStmt.getAsObject().count || 0);
  countStmt.free();

  db.run(`DELETE FROM chunks WHERE doc_id = ?;`, [id]);
  db.run(`DELETE FROM documents WHERE id = ?;`, [id]);
  persistDatabase();

  return {
    success: true,
    deletedTitle: String(doc.title),
    deletedChunks: chunkCount,
  };
}

// Batch delete documents
export function batchDeleteDocuments(ids: string[], userId: string): { successCount: number; deletedTitles: string[]; totalDeletedChunks: number } {
  let successCount = 0;
  const deletedTitles: string[] = [];
  let totalDeletedChunks = 0;

  for (const id of ids) {
    const res = deleteDocument(id, userId);
    if (res.success) {
      successCount++;
      if (res.deletedTitle) deletedTitles.push(res.deletedTitle);
      totalDeletedChunks += res.deletedChunks || 0;
    }
  }

  return { successCount, deletedTitles, totalDeletedChunks };
}

// Total counts
export function getStats(userId: string): { totalDocs: number; totalChunks: number } {
  if (!db) return { totalDocs: 0, totalChunks: 0 };
  const dStmt = db.prepare(`SELECT COUNT(*) as count FROM documents WHERE user_id = ? OR user_id = 'system';`);
  dStmt.bind([userId]);
  dStmt.step();
  const totalDocs = Number(dStmt.getAsObject().count || 0);
  dStmt.free();

  const cStmt = db.prepare(`SELECT COUNT(*) as count FROM chunks WHERE user_id = ? OR user_id = 'system';`);
  cStmt.bind([userId]);
  cStmt.step();
  const totalChunks = Number(cStmt.getAsObject().count || 0);
  cStmt.free();

  return { totalDocs, totalChunks };
}

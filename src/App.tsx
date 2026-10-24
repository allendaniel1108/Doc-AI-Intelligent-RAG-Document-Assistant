import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentCenter } from './components/DocumentCenter';
import { DocumentList } from './components/DocumentList';
import { ChatInterface } from './components/ChatInterface';
import { UploadModal } from './components/UploadModal';
import { ChunkVisualizerModal } from './components/ChunkVisualizerModal';
import { VectorStoreExplorer } from './components/VectorStoreExplorer';
import { ProblemStatementModal } from './components/ProblemStatementModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DocumentRecord, ChatMessage } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<'upload' | 'chat'>('upload');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);

  // Modals & Navigation state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVectorStoreOpen, setIsVectorStoreOpen] = useState(false);
  const [isProblemStatementOpen, setIsProblemStatementOpen] = useState(false);
  const [viewingChunkDoc, setViewingChunkDoc] = useState<DocumentRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    const container = document.getElementById('toasts');
    if (!container) return;
    const icons = {
      ok: 'bi-check-circle-fill',
      warn: 'bi-exclamation-triangle-fill',
      err: 'bi-x-octagon-fill',
    };
    const t = document.createElement('div');
    t.className = `toast-i ${type}`;
    t.innerHTML = `<i class="bi ${icons[type]}"></i><span></span>`;
    const span = t.querySelector('span');
    if (span) span.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, 3800);
  };

  // Fetch documents and status
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotalChunksCount(data.totalChunks || 0);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchHealth();
  }, []);

  // Fetch full document with chunks when opening Chunk Visualizer
  const handleViewChunks = async (doc: DocumentRecord) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingChunkDoc(data.document);
      } else {
        setViewingChunkDoc(doc);
      }
    } catch {
      setViewingChunkDoc(doc);
    }
  };

  // Single document delete initiation
  const handleDeleteDoc = (id: string) => {
    const doc = documents.find((item) => item.id === id);

    if (!doc) {
      showToast('Document not found in list. Refreshing...', 'warn');
      fetchDocuments();
      return;
    }

    setDocToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const doc = docToDelete;
    setIsDeletingDoc(true);

    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(doc.id)}`,
        { method: 'DELETE' }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || `Delete failed with status ${res.status}`
        );
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== doc.id)
      );

      if (selectedDocId === doc.id) {
        setSelectedDocId('all');
      }

      if (viewingChunkDoc?.id === doc.id) {
        setViewingChunkDoc(null);
      }

      showToast(`"${doc.title}" was deleted successfully.`, 'ok');
      await fetchDocuments();
      setDocToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Unable to delete document. Check server logs.',
        'err'
      );
      await fetchDocuments();
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Batch delete documents (Priority 2)
  const handleBatchDeleteDocs = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsDeletingDoc(true);

    try {
      const res = await fetch('/api/documents/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Batch delete failed with status ${res.status}`);
      }

      setDocuments((current) => current.filter((item) => !ids.includes(item.id)));
      if (ids.includes(selectedDocId)) {
        setSelectedDocId('all');
      }
      if (viewingChunkDoc && ids.includes(viewingChunkDoc.id)) {
        setViewingChunkDoc(null);
      }

      showToast(`Successfully deleted ${data.deletedCount || ids.length} documents.`, 'ok');
      await fetchDocuments();
    } catch (err: any) {
      console.error('Batch delete error:', err);
      showToast(err.message || 'Unable to delete selected documents.', 'err');
      await fetchDocuments();
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Execute RAG Query
  const handleSendMessage = async (queryText: string, topK: number = 4) => {
    const userMsgId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
      selectedDocId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          docId: selectedDocId,
          topK,
          strictMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No response returned from RAG engine.',
        timestamp: new Date().toISOString(),
        isFoundInDocument: data.isFoundInDocument,
        confidenceScore: data.confidenceScore,
        retrievedChunks: data.retrievedChunks || [],
        pipelineBreakdown: data.pipelineBreakdown,
        selectedDocId,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Query error:', err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error performing RAG query: ${err.message || 'Server connection failed'}.`,
        timestamp: new Date().toISOString(),
        isFoundInDocument: false,
        confidenceScore: 0,
        isError: true,
        errorAction: queryText,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine active document title
  const activeDoc = documents.find((d) => d.id === selectedDocId);
  const selectedDocTitle = activeDoc ? activeDoc.title : 'All Documents (Global Knowledge Base)';

  // Quick starter questions based on selected document or all documents
  const quickStarters = activeDoc?.sampleQuestions?.length
    ? activeDoc.sampleQuestions
    : [
        'What are the five phases of the RAG pipeline?',
        'What are the 8 key requirements in Problem Statement 01?',
        'How does Doc AI prevent hallucinations if information is missing?',
        'What formula is used to calculate similarity between query and document chunks?',
      ];

  return (
    <div className="flex flex-col min-h-screen w-screen overflow-x-hidden font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        totalDocs={documents.length}
        totalChunks={totalChunksCount}
        hasApiKey={hasApiKey}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenVectorStore={() => setIsVectorStoreOpen(true)}
        onOpenProblemStatement={() => setIsProblemStatementOpen(true)}
        strictMode={strictMode}
        setStrictMode={setStrictMode}
        onToggleMobileDocs={() => setIsMobileDocsOpen(true)}
      />

      {/* Main View Area */}
      {activeView === 'upload' ? (
        /* Document Center View (User's provided glassmorphism upload stage) */
        <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
          <DocumentCenter
            onUploadSuccess={fetchDocuments}
            onNavigateToChat={() => setActiveView('chat')}
            totalDocs={documents.length}
            totalChunks={totalChunksCount}
          />
        </main>
      ) : (
        /* Doc AI Assistant View (Dual-Pane RAG Chat & Document Repository) */
        <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
          {/* Left Sidebar: Document Management (Desktop & Laptop) */}
          <aside className="w-80 shrink-0 hidden md:block bg-slate-900/40 backdrop-blur-md">
            <DocumentList
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
              onOpenUpload={() => setIsUploadOpen(true)}
              onViewChunks={handleViewChunks}
              onDeleteDoc={handleDeleteDoc}
              onBatchDeleteDocs={handleBatchDeleteDocs}
              onSelectSampleQuery={(q, docId) => {
                setSelectedDocId(docId);
                handleSendMessage(q, 4);
              }}
              isDeleting={isDeletingDoc}
            />
          </aside>

          {/* Center Area: RAG Chat & Retrieval Engine */}
          <main className="flex-1 flex flex-col min-w-0 bg-slate-950/70 backdrop-blur-md">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              selectedDocTitle={selectedDocTitle}
              onClearChat={() => setMessages([])}
              quickStarters={quickStarters}
              strictMode={strictMode}
              onToggleMobileDocs={() => setIsMobileDocsOpen(true)}
            />
          </main>
        </div>
      )}

      {/* Mobile & Tablet Slide-Over Document Repository Drawer */}
      {isMobileDocsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileDocsOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <DocumentList
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={(id) => {
                setSelectedDocId(id);
                setIsMobileDocsOpen(false);
              }}
              onOpenUpload={() => {
                setIsMobileDocsOpen(false);
                setIsUploadOpen(true);
              }}
              onViewChunks={(doc) => {
                setIsMobileDocsOpen(false);
                handleViewChunks(doc);
              }}
              onDeleteDoc={handleDeleteDoc}
              onBatchDeleteDocs={handleBatchDeleteDocs}
              onSelectSampleQuery={(q, docId) => {
                setSelectedDocId(docId);
                setIsMobileDocsOpen(false);
                handleSendMessage(q, 4);
              }}
              isDeleting={isDeletingDoc}
              onCloseMobile={() => setIsMobileDocsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchDocuments();
        }}
      />

      <ChunkVisualizerModal
        document={viewingChunkDoc}
        isOpen={!!viewingChunkDoc}
        onClose={() => setViewingChunkDoc(null)}
        onSelectQuery={(q) => {
          if (viewingChunkDoc) {
            setSelectedDocId(viewingChunkDoc.id);
          }
          setActiveView('chat');
          handleSendMessage(q, 4);
        }}
      />

      <VectorStoreExplorer
        isOpen={isVectorStoreOpen}
        onClose={() => setIsVectorStoreOpen(false)}
        totalDocs={documents.length}
        totalChunks={totalChunksCount}
      />

      <ProblemStatementModal
        isOpen={isProblemStatementOpen}
        onClose={() => setIsProblemStatementOpen(false)}
      />

      <DeleteConfirmModal
        document={docToDelete}
        isOpen={!!docToDelete}
        isDeleting={isDeletingDoc}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}

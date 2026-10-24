import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Sliders, 
  Cpu, 
  CheckCircle2, 
  Layers,
  Database
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentCenterProps {
  onUploadSuccess: () => void;
  onNavigateToChat: () => void;
  totalDocs: number;
  totalChunks: number;
}

interface QueueItem {
  id: number;
  file: File;
  status: 'ready' | 'up' | 'done' | 'fail';
  progress: number;
  error?: string;
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({
  onUploadSuccess,
  onNavigateToChat,
  totalDocs,
  totalChunks,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [overallLabel, setOverallLabel] = useState('Uploading…');
  const [showOverall, setShowOverall] = useState(false);
  const [popCount, setPopCount] = useState(false);

  // RAG chunking options
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(120);
  const [showSettings, setShowSettings] = useState(false);

  // 3D tilt & spotlight
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = panel.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      panel.style.setProperty('--mx', x + 'px');
      panel.style.setProperty('--my', y + 'px');
      panel.style.setProperty('--ry', (((x / r.width) - 0.5) * 6).toFixed(2) + 'deg');
      panel.style.setProperty('--rx', ((0.5 - (y / r.height)) * 6).toFixed(2) + 'deg');
    };

    const handlePointerLeave = () => {
      panel.style.setProperty('--rx', '0deg');
      panel.style.setProperty('--ry', '0deg');
    };

    panel.addEventListener('pointermove', handlePointerMove);
    panel.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      panel.removeEventListener('pointermove', handlePointerMove);
      panel.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getExt = (name: string) => name.split('.').pop()?.toLowerCase() || '';

  const getFileIconCls = (ext: string) => {
    if (ext === 'pdf') return { cls: 'pdf', icon: 'bi-file-earmark-pdf-fill' };
    if (ext === 'txt') return { cls: 'txt', icon: 'bi-file-earmark-text-fill' };
    return { cls: 'doc', icon: 'bi-file-earmark-word-fill' };
  };

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

  const triggerConfetti = () => {
    const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#6366f1', '#a855f7', '#22d3ee', '#34d399', '#fbbf24', '#fb7185'];
    const particles = Array.from({ length: 110 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 16 - 4,
      s: Math.random() * 7 + 4,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.vy += 0.45;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / 110);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (++frame < 110) {
        requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(loop);
  };

  const addFiles = (files: FileList | File[]) => {
    const allowed = ['pdf', 'doc', 'docx', 'txt', 'md', 'json'];
    const max = 25 * 1024 * 1024;
    let addedCount = 0;
    const newItems: QueueItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = getExt(file.name);
      if (!allowed.includes(ext)) {
        showToast(`${file.name}: unsupported format`, 'warn');
        return;
      }
      if (file.size > max) {
        showToast(`${file.name}: file exceeds 25 MB`, 'warn');
        return;
      }
      if (queue.some((q) => q.file.name === file.name && q.file.size === file.size)) {
        showToast(`${file.name} already in queue`, 'warn');
        return;
      }

      newItems.push({
        id: Date.now() + Math.random(),
        file,
        status: 'ready',
        progress: 0,
      });
      addedCount++;
    });

    if (addedCount > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setPopCount(true);
      setTimeout(() => setPopCount(false), 200);
    }
  };

  const removeItem = (id: number) => {
    if (busy) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadSingleFile = (item: QueueItem, onProgress: (pct: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('title', item.file.name);
      fd.append('chunkSize', chunkSize.toString());
      fd.append('chunkOverlap', chunkOverlap.toString());

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/documents/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Server ${xhr.status}`));
          } catch {
            reject(new Error(`Server error ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network connection error'));
      xhr.send(fd);
    });
  };

  const handleUploadAll = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ripple effect
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const s = Math.max(r.width, r.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    const pending = queue.filter((q) => q.status !== 'done');
    if (pending.length === 0 || busy) return;

    setBusy(true);
    setShowOverall(true);
    setOverallLabel('Chunking & Computing Vector Embeddings…');
    setOverallProgress(0);

    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'up', progress: 5 } : q))
      );

      const basePct = (i / pending.length) * 100;
      const spanPct = 100 / pending.length;

      try {
        await uploadSingleFile(item, (pct) => {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q))
          );
          const currentTotal = Math.round(basePct + (pct / 100) * spanPct);
          setOverallProgress(currentTotal);
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'done', progress: 100 } : q))
        );
        okCount++;
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'fail', error: err.message } : q
          )
        );
        failCount++;
        showToast(`${item.file.name}: ${err.message}`, 'err');
      }

      setOverallProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setBusy(false);
    onUploadSuccess();

    if (okCount > 0) {
      showToast(`${okCount} file${okCount > 1 ? 's' : ''} indexed into Vector Store!`, 'ok');
      if (failCount === 0) {
        triggerConfetti();
      }
      setOverallLabel(`${okCount} file${okCount > 1 ? 's' : ''} ready for RAG Assistant`);
    } else {
      setOverallLabel('Upload failed');
    }

    setTimeout(() => {
      if (!busy) setShowOverall(false);
    }, 4000);
  };

  const pendingCount = queue.filter((q) => q.status !== 'done').length;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="stage">
        <div className="panel" id="panel" ref={panelRef}>
          {/* Header */}
          <div className="d-flex align-items-start justify-content-between">
            <div>
              <h1>Document Center</h1>
              <div className="sub mt-1">Upload files securely to your RAG vector database</div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="chip flex items-center space-x-1.5 cursor-pointer hover:bg-white/10 transition"
                title="RAG Chunking Settings"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>{chunkSize}ch / {chunkOverlap}ov</span>
              </button>
              <span className="chip">
                <span className="dot"></span>Gemini RAG Active
              </span>
            </div>
          </div>

          {/* RAG Chunking Parameters Drawer */}
          {showSettings && (
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configurable RAG Parameters</span>
                </span>
                <span className="font-mono text-cyan-300 text-[11px]">
                  ~{Math.round(chunkSize / 4)} tokens/chunk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Chunk Size:</span>
                    <span className="font-mono text-white">{chunkSize} chars</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1200"
                    step="50"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    disabled={busy}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Overlap:</span>
                    <span className="font-mono text-white">{chunkOverlap} chars</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="250"
                    step="20"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    disabled={busy}
                    className="w-full accent-indigo-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`drop ${isDragOver ? 'over' : ''}`}
            id="drop"
            tabIndex={0}
            role="button"
            aria-label="Choose files to upload"
            onClick={() => {
              if (!busy) inputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !busy) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (!busy && e.dataTransfer.files) {
                addFiles(e.dataTransfer.files);
              }
            }}
          >
            <svg className="border">
              <defs>
                <linearGradient id="g">
                  <stop offset="0" stopColor="#6366f1" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" rx="20" width="calc(100% - 2px)" height="calc(100% - 2px)" />
            </svg>
            <div className="orb">
              <i className="bi bi-cloud-arrow-up-fill"></i>
            </div>
            <h5 id="dropTitle">{isDragOver ? 'Release to add files' : 'Drag & drop files here'}</h5>
            <div className="sub">
              or <span className="text-info text-decoration-underline">browse your computer</span>
            </div>
            <div className="fmt">
              <span>PDF</span>
              <span>DOCX</span>
              <span>DOC</span>
              <span>TXT</span>
              <span>≤ 25 MB</span>
            </div>
            <input
              type="file"
              ref={inputRef}
              id="input"
              className="d-none"
              accept=".pdf,.doc,.docx,.txt,.md,.json"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {/* Queue Header */}
          <div className="qhead">
            <h6>Upload queue</h6>
            <span className={`count ${popCount ? 'pop' : ''}`} id="count">
              {queue.length} {queue.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* Queue List */}
          <div className="list" id="list">
            {queue.length === 0 ? (
              <div className="empty" id="empty">
                <i className="bi bi-inboxes"></i>Nothing queued yet — drop a PDF or TXT in!
              </div>
            ) : (
              queue.map((it) => {
                const ext = getExt(it.file.name);
                const { cls, icon } = getFileIconCls(ext);

                return (
                  <div
                    key={it.id}
                    className={`file ${it.status === 'done' ? 'done' : ''} ${
                      it.status === 'fail' ? 'fail' : ''
                    }`}
                  >
                    <div className="fill" style={{ width: `${it.progress}%` }}></div>
                    <div className={`ficon ${cls}`}>
                      <i className={`bi ${icon}`}></i>
                    </div>
                    <div className="meta">
                      <b>{it.file.name}</b>
                      <small>
                        {formatSize(it.file.size)} · {ext.toUpperCase()}
                        {it.status === 'done' && ' · Indexed to Vector Store'}
                        {it.status === 'fail' && ` · ${it.error || 'Failed'}`}
                      </small>
                    </div>
                    <div className="state">
                      {it.status === 'ready' && (
                        <button
                          type="button"
                          className="x"
                          title="Remove"
                          onClick={() => removeItem(it.id)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                      {it.status === 'up' && (
                        <svg className="ring" width="30" height="30" viewBox="0 0 30 30">
                          <circle className="bg" cx="15" cy="15" r="12" />
                          <circle
                            className="fg"
                            cx="15"
                            cy="15"
                            r="12"
                            style={{
                              strokeDashoffset: 75.4 * (1 - it.progress / 100),
                            }}
                          />
                        </svg>
                      )}
                      {it.status === 'done' && (
                        <i className="bi bi-check-circle-fill tick"></i>
                      )}
                      {it.status === 'fail' && (
                        <i className="bi bi-exclamation-circle-fill bad"></i>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Overall Progress */}
          <div className={`overall ${showOverall ? 'on' : ''}`} id="overall">
            <div className="d-flex justify-content-between sub mb-2">
              <span id="olabel">{overallLabel}</span>
              <b className="text-light" id="opct">
                {overallProgress}%
              </b>
            </div>
            <div className="bar">
              <i id="obar" style={{ width: `${overallProgress}%` }}></i>
            </div>
          </div>

          {/* Upload Button */}
          <button
            className="go"
            id="go"
            disabled={busy || !pendingCount}
            onClick={handleUploadAll}
          >
            <i className="bi bi-rocket-takeoff-fill"></i>
            <span id="golabel">
              {busy
                ? 'Processing & Generating Embeddings…'
                : pendingCount
                ? `Upload & Index ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                : 'Upload files'}
            </span>
          </button>

          {/* Bottom Action: Launch Doc AI Chat */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="text-slate-400 flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vector Store: <strong>{totalDocs}</strong> Docs • <strong>{totalChunks}</strong> Chunks</span>
            </div>

            <button
              onClick={onNavigateToChat}
              className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-cyan-200 hover:text-white font-semibold transition flex items-center space-x-2 shadow-lg"
            >
              <span>Ask Questions with Doc AI</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

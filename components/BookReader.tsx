
import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize, X, Menu, Loader2,
  ChevronDown, ChevronRight as ChevronRightIcon, FileText, FolderOpen, Book as BookIcon,
  Monitor, Headphones, Music
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';

const TreeItem = memo(({ node, level, expandedNodes, toggleExpand, onSelect, isSelected, bookType }: any) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  const isAudio = useMemo(() => {
    const url = (node.url || '').toLowerCase();
    return url.match(/\.(mp3|wav|ogg|m4a|mp4|m4b|aac|mpeg)/i) || 
           (url.includes('drive.google.com') && bookType === 'audio') ||
           (!hasChildren && bookType === 'audio');
  }, [node.url, bookType, hasChildren]);

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2.5 py-2 px-3.5 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => {
          if (hasChildren) toggleExpand(node.id);
          onSelect(node);
        }}
      >
        {hasChildren ? (
          <span className="shrink-0">{isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}</span>
        ) : (
          <span className="w-4 flex justify-center shrink-0 opacity-40">
            {isAudio ? <Music size={13}/> : <FileText size={13}/>}
          </span>
        )}
        <span className={`text-[12px] truncate tracking-tight leading-snug ${hasChildren ? 'font-black' : 'font-semibold'}`}>{node.title}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children.map((child: any) => (
            <TreeItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
              expandedNodes={expandedNodes} 
              toggleExpand={toggleExpand} 
              onSelect={onSelect} 
              isSelected={isSelected} 
              bookType={bookType}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface BookReaderProps {
  book: Book;
}

const PDF_VERSION = '4.4.168';
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: true,
};

const getDirectUrl = (url: string, forIframe: boolean = false) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/(?:\/d\/|id=)([\w-]+)/);
        if (idMatch && idMatch[1]) {
            const fileId = idMatch[1];
            if (forIframe) {
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
            return `https://docs.google.com/uc?export=download&id=${fileId}`;
        }
    }
    return url;
};

// Hàm kiểm tra link có phải Google Drive không
const checkIsDrive = (url: string) => {
    return url && (url.includes('drive.google.com') || url.includes('docs.google.com'));
};

const BookReader: React.FC<BookReaderProps> = ({ book }) => {
  const treeData = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];
    book.chapters.forEach(ch => { map[ch.id] = { ...ch, children: [] }; });
    book.chapters.forEach(ch => {
      if (ch.parentId && map[ch.parentId]) map[ch.parentId].children.push(map[ch.id]);
      else roots.push(map[ch.id]);
    });
    return roots.sort((a, b) => a.pageNumber - b.pageNumber);
  }, [book.chapters]);

  const flattenedReadingList = useMemo(() => {
    const list: any[] = [];
    const traverse = (nodes: any[]) => {
      nodes.sort((a, b) => a.pageNumber - b.pageNumber).forEach(node => {
        if (node.children.length === 0 || node.url) list.push(node);
        if (node.children.length > 0) traverse(node.children);
      });
    };
    if (book.chapters.length === 0) list.push({ id: 'default', url: book.url, title: 'Bìa sách', pageNumber: 1 });
    else traverse(treeData);
    return list;
  }, [treeData, book.url, book.chapters.length]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [source, setSource] = useState<string>(getDirectUrl(book.url));
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1); 
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Tự động nhận diện Google Drive để khởi tạo chế độ xem
  const [useNativeViewer, setUseNativeViewer] = useState(() => checkIsDrive(book.url));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);

  const isImageUrl = useMemo(() => {
    const url = source.toLowerCase();
    return url.match(/\.(jpeg|jpg|gif|png|webp)/) || book.contentType === 'image';
  }, [source, book.contentType]);

  const isAudioUrl = useMemo(() => {
    const url = source.toLowerCase();
    return url.match(/\.(mp3|wav|ogg|m4a|mp4|m4b|aac|mpeg)/) || 
           book.contentType === 'audio' || 
           source.includes('docs.google.com/uc');
  }, [source, book.contentType]);

  useEffect(() => {
    const rootIds = treeData.filter(n => n.children.length > 0).map(n => n.id);
    setExpandedNodes(new Set(rootIds));
  }, [treeData]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    handleResize();
    return () => observer.disconnect();
  }, [isSidebarOpen]);

  useEffect(() => {
    if (containerRef.current && !useNativeViewer) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pageNumber, source, useNativeViewer]);

  const handleSelectNode = useCallback((node: any) => {
    const idx = flattenedReadingList.findIndex(item => item.id === node.id);
    if (idx !== -1) setCurrentIndex(idx);
    
    const nodeUrl = node.url || book.url;
    const newSource = getDirectUrl(nodeUrl);
    
    // TỰ ĐỘNG NHẬN DIỆN GOOGLE DRIVE:
    // Nếu là link drive thì bật Chế độ Web (native viewer)
    if (checkIsDrive(nodeUrl)) {
        setUseNativeViewer(true);
    } else {
        setUseNativeViewer(false);
    }

    if (newSource !== source) {
        setIsLoading(true);
        setSource(newSource);
        setLoadError(null);
        setPageNumber(1); 
    } else {
        setPageNumber(node.pageNumber || 1);
    }
  }, [flattenedReadingList, book.url, source]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    setIsLoading(false);
    setLoadError("Lỗi nạp file PDF. Vui lòng bật 'Chế độ Gốc'.");
  };

  const handleNext = () => {
    if (!isImageUrl && !isAudioUrl && !useNativeViewer && pageNumber < numPages) { 
      setPageNumber(prev => prev + 1); 
      return; 
    }
    if (currentIndex < flattenedReadingList.length - 1) {
      handleSelectNode(flattenedReadingList[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (!isImageUrl && !isAudioUrl && !useNativeViewer && pageNumber > 1) { 
      setPageNumber(prev => prev - 1); 
      return; 
    }
    if (currentIndex > 0) {
      handleSelectNode(flattenedReadingList[currentIndex - 1]);
    }
  };

  const bookWidth = useMemo(() => {
    if (!containerSize) return 800;
    const baseWidth = containerSize.width;
    if (baseWidth > 1200) return baseWidth * 0.65;
    if (baseWidth > 800) return baseWidth * 0.8;
    return baseWidth * 0.95;
  }, [containerSize]);

  const iframeUrl = useMemo(() => {
      const originalUrl = flattenedReadingList[currentIndex]?.url || book.url;
      return getDirectUrl(originalUrl, true);
  }, [currentIndex, book.url, flattenedReadingList]);

  return (
    <div className={`flex h-full w-full ${isPresentationMode ? 'bg-black' : 'bg-slate-950'}`}>
      {!isPresentationMode && (
        <div className={`bg-slate-900 border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64 shadow-2xl' : 'w-0 shadow-none'}`}>
            <div className="p-5 border-b border-white/5 shrink-0 bg-slate-900/80">
                <div className="flex items-center gap-2 text-indigo-400 mb-1.5 opacity-80">
                    <FolderOpen size={14} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Học liệu bài giảng</span>
                </div>
                <h1 className="font-bold text-white text-[13px] line-clamp-2 tracking-tight leading-tight">{book.title}</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {treeData.map(node => (
                  <TreeItem 
                    key={node.id} node={node} level={0} 
                    expandedNodes={expandedNodes} toggleExpand={(id: string) => setExpandedNodes(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })} 
                    onSelect={handleSelectNode} isSelected={flattenedReadingList[currentIndex]?.id === node.id}
                    bookType={book.contentType}
                  />
                ))}
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
        {!isPresentationMode && (
          <div className="h-12 bg-slate-800/90 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-5 z-20 shrink-0 shadow-xl">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white transition-all"><Menu size={18} /></button>
                <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-lg border border-white/5">
                    <button onClick={handlePrev} className="p-1 text-slate-500 hover:text-white rounded transition-all"><ChevronLeft size={16} /></button>
                    {!isImageUrl && !isAudioUrl && !useNativeViewer && <span className="text-[10px] text-slate-200 font-mono font-bold w-16 text-center tracking-tighter">{pageNumber} <span className="text-slate-500 opacity-50 mx-0.5">/</span> {numPages || '--'}</span>}
                    {(isImageUrl || isAudioUrl || useNativeViewer) && <span className="text-[8px] text-indigo-400 font-black px-2 uppercase tracking-widest">{isAudioUrl ? 'Audio' : useNativeViewer ? 'Gốc' : 'Media'}</span>}
                    <button onClick={handleNext} className="p-1 text-slate-500 hover:text-white rounded transition-all"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
               {!isImageUrl && (
                 <button 
                  onClick={() => setUseNativeViewer(!useNativeViewer)} 
                  className={`h-8 px-3 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${useNativeViewer ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-400 border border-white/5 hover:text-white'}`}
                 >
                    <Monitor size={12} /> {useNativeViewer ? 'Chế độ Web' : 'Chế độ Gốc'}
                 </button>
               )}
               <div className="h-4 w-px bg-white/5 mx-1"></div>
               {!isAudioUrl && !useNativeViewer && (
                 <div className="flex items-center gap-0.5 bg-slate-950/20 p-0.5 rounded-lg border border-white/5">
                    <button onClick={() => setScale(s => Math.max(s-0.1, 0.5))} className="p-1 text-slate-400 hover:text-white transition-all"><ZoomOut size={14} /></button>
                    <span className="text-[9px] text-slate-400 font-bold w-10 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(s+0.1, 3))} className="p-1 text-slate-400 hover:text-white transition-all"><ZoomIn size={14} /></button>
                 </div>
               )}
               <button onClick={() => setIsPresentationMode(true)} className="p-2 text-slate-400 hover:text-white transition-all"><Maximize size={16}/></button>
            </div>
          </div>
        )}

        <div ref={containerRef} className={`flex-1 overflow-hidden relative flex flex-col`} style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
            {isLoading && !loadError && !useNativeViewer && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-xl">
                    <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="mt-5 text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] animate-pulse">Đang nạp...</p>
                </div>
            )}

            <div className={`flex-1 flex flex-col items-center overflow-y-auto custom-scrollbar ${useNativeViewer ? 'p-0' : 'py-8 px-4 md:py-12'}`}>
                {isImageUrl ? (
                    <div className="relative group flex justify-center w-full">
                        <img 
                          src={source} 
                          className={`shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-in-out bg-white transform origin-top ${isLoading ? 'opacity-0 scale-95 blur-2xl' : 'opacity-100 scale-100 blur-0'}`} 
                          style={{ width: `${bookWidth * scale}px`, maxWidth: 'none' }}
                          onLoad={() => setIsLoading(false)}
                          alt="Trang sách hình"
                        />
                    </div>
                ) : (isAudioUrl && !useNativeViewer) ? (
                    <div className="w-full max-w-xl bg-slate-800/90 rounded-[3rem] p-12 border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col items-center gap-8 animate-slide-up mt-8 backdrop-blur-2xl">
                        <div className="w-40 h-40 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner group overflow-hidden">
                            <Headphones size={80} className="animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{flattenedReadingList[currentIndex]?.title || book.title}</h2>
                            <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[9px] opacity-70">{book.author}</p>
                        </div>
                        
                        <div className="w-full bg-slate-950/50 p-6 rounded-3xl border border-white/5">
                            <audio 
                                controls 
                                className="w-full h-10 accent-indigo-500" 
                                src={source}
                                onCanPlay={() => setIsLoading(false)}
                                autoPlay
                            >
                                Audio element is not supported.
                            </audio>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={handlePrev} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">Bài trước</button>
                            <button onClick={handleNext} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Bài sau</button>
                        </div>
                    </div>
                ) : useNativeViewer ? (
                    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
                        <iframe 
                          src={iframeUrl} 
                          className="w-full flex-1 border-0"
                          title="Native Previewer"
                          onLoad={() => setIsLoading(false)}
                          allow="autoplay"
                        />
                    </div>
                ) : (
                    <div className="flex justify-center w-full">
                        <Document
                            key={source} file={source}
                            onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError}
                            options={pdfOptions} className="flex justify-center" loading={null}
                        >
                            <PDFPage pageNumber={pageNumber} width={bookWidth} scale={scale} />
                        </Document>
                    </div>
                )}
            </div>

            {isPresentationMode && (
                 <button onClick={() => setIsPresentationMode(false)} className="fixed top-6 right-6 p-3 bg-slate-900/90 text-white rounded-full border border-white/10 z-50 hover:bg-rose-600 transition-all shadow-2xl backdrop-blur-xl group">
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                 </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default BookReader;

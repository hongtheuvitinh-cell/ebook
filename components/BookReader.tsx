
import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, Maximize, X, Menu, Loader2,
  ChevronDown, ChevronRight as ChevronRightIcon, FileText, FolderOpen, Book as BookIcon,
  AlertTriangle, ExternalLink, RefreshCcw, Eye, Monitor, Play, Pause, Volume2, Headphones, Music
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

const TreeItem = memo(({ node, level, expandedNodes, toggleExpand, onSelect, isSelected }: any) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) toggleExpand(node.id);
          onSelect(node);
        }}
      >
        {hasChildren ? (
          <span className="shrink-0">{isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}</span>
        ) : (
          <span className="w-3.5 flex justify-center shrink-0 opacity-40">
            {node.url?.match(/\.(mp3|wav|ogg|m4a|mp4|m4b|aac)/i) ? <Music size={12}/> : <FileText size={12}/>}
          </span>
        )}
        <span className={`text-[11px] truncate ${hasChildren ? 'font-bold' : 'font-normal'}`}>{node.title}</span>
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
        const idMatch = url.match(/\/d\/(.+?)\/(view|edit|preview)?/);
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
  const [isAIActive, setIsAIActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [useNativeViewer, setUseNativeViewer] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);

  const isImageUrl = useMemo(() => {
    const url = source.toLowerCase();
    return url.match(/\.(jpeg|jpg|gif|png|webp)/) || book.contentType === 'image';
  }, [source, book.contentType]);

  const isAudioUrl = useMemo(() => {
    const url = source.toLowerCase();
    return url.match(/\.(mp3|wav|ogg|m4a|mp4|m4b|aac)/) || book.contentType === 'audio';
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
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pageNumber, source]);

  const handleSelectNode = useCallback((node: any) => {
    const idx = flattenedReadingList.findIndex(item => item.id === node.id);
    if (idx !== -1) setCurrentIndex(idx);
    
    const newSource = getDirectUrl(node.url || book.url);
    
    if (newSource !== source) {
        setSource(newSource);
        setIsLoading(true);
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
    setLoadError("Lỗi nạp file JavaScript. Vui lòng bật 'Chế độ Gốc'.");
  };

  const handleNext = () => {
    if (!isImageUrl && !isAudioUrl && pageNumber < numPages) { 
      setPageNumber(prev => prev + 1); 
      return; 
    }
    if (currentIndex < flattenedReadingList.length - 1) {
      handleSelectNode(flattenedReadingList[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (!isImageUrl && !isAudioUrl && pageNumber > 1) { 
      setPageNumber(prev => prev - 1); 
      return; 
    }
    if (currentIndex > 0) {
      handleSelectNode(flattenedReadingList[currentIndex - 1]);
    }
  };

  const bookWidth = useMemo(() => {
    if (!containerSize) return 800;
    return containerSize.width * 0.8;
  }, [containerSize]);

  const iframeUrl = useMemo(() => {
      return getDirectUrl(source, true);
  }, [source]);

  return (
    <div className={`flex h-full w-full ${isPresentationMode ? 'bg-black' : 'bg-[#1a1a1a]'}`}>
      {!isPresentationMode && (
        <div className={`bg-[#222] border-r border-black flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
            <div className="p-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <FolderOpen size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Danh mục bài học</span>
                </div>
                <h1 className="font-bold text-white text-xs line-clamp-1">{book.title}</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {treeData.map(node => (
                  <TreeItem 
                    key={node.id} node={node} level={0} 
                    expandedNodes={expandedNodes} toggleExpand={(id: string) => setExpandedNodes(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })} 
                    onSelect={handleSelectNode} isSelected={flattenedReadingList[currentIndex]?.id === node.id}
                  />
                ))}
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#151515]">
        {!isPresentationMode && (
          <div className="h-12 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white"><Menu size={18} /></button>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded border border-white/5">
                    <button onClick={handlePrev} className="p-1 text-gray-500 hover:text-white"><ChevronLeft size={16} /></button>
                    {!isImageUrl && !isAudioUrl && <span className="text-[10px] text-gray-300 font-mono w-16 text-center">{pageNumber} / {numPages || '--'}</span>}
                    {(isImageUrl || isAudioUrl) && <span className="text-[10px] text-gray-300 font-mono px-2 uppercase tracking-widest">{isAudioUrl ? 'Audio' : 'Hình ảnh'}</span>}
                    <button onClick={handleNext} className="p-1 text-gray-500 hover:text-white"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex items-center gap-2">
               {!isImageUrl && !isAudioUrl && (
                 <button 
                  onClick={() => setUseNativeViewer(!useNativeViewer)} 
                  className={`p-1.5 rounded flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter transition-all ${useNativeViewer ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
                 >
                    <Monitor size={14} /> {useNativeViewer ? 'Chế độ Web' : 'Chế độ Gốc'}
                 </button>
               )}
               <div className="h-4 w-px bg-gray-800 mx-1"></div>
               {!isAudioUrl && (
                 <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => Math.max(s-0.1, 0.5))} className="p-1.5 text-gray-500 hover:text-white"><ZoomOut size={14} /></button>
                    <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(s+0.1, 3))} className="p-1.5 text-gray-500 hover:text-white"><ZoomIn size={14} /></button>
                 </div>
               )}
               <button onClick={() => setIsPresentationMode(true)} className="p-2 text-gray-500 hover:text-white"><Maximize size={16}/></button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded ${isAIActive ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}><Sparkles size={16} /></button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#111]">
            {isLoading && !loadError && !isImageUrl && !isAudioUrl && !useNativeViewer && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a]">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Đang tải...</p>
                </div>
            )}

            <div className="min-h-full w-full flex flex-col items-center py-8 px-4 md:px-12">
                {isImageUrl ? (
                    <img 
                      src={source} 
                      className="shadow-2xl transition-all duration-300 bg-white" 
                      style={{ width: `${bookWidth * scale}px`, maxWidth: 'none' }}
                      onLoad={() => setIsLoading(false)}
                      alt="Trang sách"
                    />
                ) : isAudioUrl ? (
                    <div className="w-full max-w-2xl bg-[#222] rounded-[3rem] p-12 border border-white/5 shadow-2xl flex flex-col items-center gap-8 animate-slide-up mt-12">
                        <div className="w-48 h-48 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner">
                            <div className="relative">
                                <Headphones size={80} className="animate-pulse" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                    <Music size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tight">{flattenedReadingList[currentIndex]?.title || book.title}</h2>
                            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">{book.author}</p>
                        </div>
                        <div className="w-full bg-[#151515] p-6 rounded-[2rem] border border-white/5">
                            <audio 
                                controls 
                                className="w-full h-10 accent-indigo-500" 
                                src={source}
                                onCanPlay={() => setIsLoading(false)}
                                autoPlay
                            >
                                Trình duyệt của bạn không hỗ trợ phát âm thanh.
                            </audio>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={handlePrev} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Bài trước</button>
                            <button onClick={handleNext} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Bài sau</button>
                        </div>
                    </div>
                ) : useNativeViewer ? (
                    <div className="w-full h-[calc(100vh-80px)] max-w-6xl shadow-2xl rounded-lg overflow-hidden border border-white/5">
                        <iframe 
                          src={iframeUrl} 
                          className="w-full h-full border-0 bg-white"
                          title="Native PDF Viewer"
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
                 <button onClick={() => setIsPresentationMode(false)} className="fixed top-6 right-6 p-3 bg-gray-900 text-white rounded-full border border-gray-700 z-50 hover:bg-red-600 transition-all">
                    <X size={20} />
                 </button>
            )}
        </div>

        <AIAssistant isVisible={isAIActive} onClose={() => setIsAIActive(false)} pageText="" />
      </div>
    </div>
  );
};

export default BookReader;

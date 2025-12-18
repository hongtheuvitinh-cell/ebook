
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, Maximize, X, Menu, Loader2,
  Play, Pause, SkipBack, SkipForward, Music,
  ChevronDown, ChevronRight as ChevronRightIcon, FileText, FolderOpen, Book as BookIcon
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

interface BookReaderProps {
  book: Book;
}

const PDF_VERSION = '4.4.168';
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
};

const BookReader: React.FC<BookReaderProps> = ({ book }) => {
  // --- LOGIC XỬ LÝ CÂY MENU ---
  const treeData = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];
    
    book.chapters.forEach(ch => {
      map[ch.id] = { ...ch, children: [] };
    });

    book.chapters.forEach(ch => {
      if (ch.parentId && map[ch.parentId]) {
        map[ch.parentId].children.push(map[ch.id]);
      } else {
        roots.push(map[ch.id]);
      }
    });
    
    return roots.sort((a, b) => a.pageNumber - b.pageNumber);
  }, [book.chapters]);

  // Kiểm tra xem đây có phải là sách "phẳng" (không có chương con nào)
  const isFlatBook = useMemo(() => {
    return book.chapters.every(ch => !ch.parentId);
  }, [book.chapters]);

  // Flattened reading list: Tìm các nút lá hoặc các nút có URL riêng
  const flattenedReadingList = useMemo(() => {
    const list: any[] = [];
    const traverse = (nodes: any[]) => {
      nodes.sort((a, b) => a.pageNumber - b.pageNumber).forEach(node => {
        if (node.children.length === 0 || node.url) {
          list.push(node);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    if (book.chapters.length === 0) {
      list.push({ id: 'default', url: book.url, title: 'Bìa sách', pageNumber: 1 });
    } else {
      traverse(treeData);
    }
    return list;
  }, [treeData, book.url, book.chapters.length]);

  // --- STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [source, setSource] = useState<string>(book.url);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState(1.0);
  const [isAIActive, setIsAIActive] = useState(false);
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);
  const documentRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mặc định mở rộng tất cả các chương cấp 1 nếu có con
  useEffect(() => {
    const rootIds = treeData.filter(n => n.children.length > 0).map(n => n.id);
    setExpandedNodes(new Set(rootIds));
  }, [treeData]);

  useEffect(() => {
    const initialItem = flattenedReadingList[0];
    if (initialItem) {
      setSource(initialItem.url || book.url);
      setPageNumber(initialItem.pageNumber || 1);
    }
    setCurrentIndex(0);
    setIsLoading(true);
  }, [book.id, flattenedReadingList, book.url]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, isPresentationMode]);

  // --- HANDLERS ---
  const handleNext = () => {
    if (currentIndex < flattenedReadingList.length - 1) {
      const nextIdx = currentIndex + 1;
      const item = flattenedReadingList[nextIdx];
      setCurrentIndex(nextIdx);
      if (item.url && item.url !== source) {
        setSource(item.url);
        setIsLoading(true);
      }
      setPageNumber(item.pageNumber || 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const item = flattenedReadingList[prevIdx];
      setCurrentIndex(prevIdx);
      if (item.url && item.url !== source) {
        setSource(item.url);
        setIsLoading(true);
      }
      setPageNumber(item.pageNumber || 1);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const selectNode = (node: any) => {
    const idx = flattenedReadingList.findIndex(item => item.id === node.id);
    if (idx !== -1) setCurrentIndex(idx);
    
    if (node.url && node.url !== source) {
      setSource(node.url);
      setIsLoading(true);
    }
    setPageNumber(node.pageNumber || 1);
  };

  // --- RENDER HELPERS ---
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children.length > 0;
      const isSelected = flattenedReadingList[currentIndex]?.id === node.id;

      return (
        <div key={node.id} className="select-none">
          <div 
            className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (hasChildren) {
                  toggleExpand(node.id);
                  if (node.url) selectNode(node);
              } else {
                  selectNode(node);
              }
            }}
          >
            {hasChildren ? (
              <span className="shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
              </span>
            ) : (
              !isFlatBook && (
                <span className="w-3.5 flex justify-center shrink-0 opacity-40">
                  <FileText size={12}/>
                </span>
              )
            )}
            {isFlatBook && isSelected && <div className="w-1 h-3 bg-white rounded-full shrink-0"></div>}
            <span className={`text-xs truncate ${hasChildren ? 'font-semibold' : 'font-normal'}`}>
                {node.title}
            </span>
          </div>
          {hasChildren && isExpanded && (
            <div className="mt-0.5 mb-1 overflow-hidden">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`flex h-full w-full ${isPresentationMode ? 'bg-black' : 'bg-[#1a1a1a]'}`}>
      
      {/* SIDEBAR - TREE MENU */}
      {!isPresentationMode && (
        <div className={`bg-[#252525] border-r border-black flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
            <div className="p-5 border-b border-gray-800 bg-[#2d2d2d] shrink-0">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    {isFlatBook ? <BookIcon size={16} /> : <FolderOpen size={16} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{isFlatBook ? 'Danh sách bài' : 'Mục lục'}</span>
                </div>
                <h1 className="font-bold text-white text-sm font-serif line-clamp-2 leading-tight">{book.title}</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                {book.chapters.length > 0 ? renderTree(treeData) : (
                   <div className="text-center py-12 text-gray-600 italic text-[10px] uppercase tracking-widest font-bold px-4">
                       Nội dung đang được cập nhật
                   </div>
                )}
            </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* TOOLBAR */}
        {!isPresentationMode && (
          <div className="h-14 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Bật/Tắt Menu"><Menu size={18} /></button>
                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                
                <div className="flex items-center gap-1 bg-[#252525] px-2 py-1 rounded-lg border border-gray-800">
                    <button onClick={handlePrev} disabled={currentIndex <= 0} className="p-1 text-gray-400 disabled:opacity-20 hover:text-white"><ChevronLeft size={16} /></button>
                    <span className="text-[11px] text-gray-300 min-w-[70px] text-center font-mono font-bold">
                        {currentIndex + 1} / {flattenedReadingList.length}
                    </span>
                    <button onClick={handleNext} disabled={currentIndex >= flattenedReadingList.length - 1} className="p-1 text-gray-400 disabled:opacity-20 hover:text-white"><ChevronRight size={16} /></button>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 bg-[#252525] px-1 py-1 rounded-lg border border-gray-800">
                  <button onClick={() => setScale(s => Math.max(s-0.1, 0.5))} className="p-1.5 text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
                  <span className="text-[10px] text-gray-500 w-10 text-center font-bold">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(s+0.1, 3))} className="p-1.5 text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
               </div>
               <button onClick={() => setIsPresentationMode(true)} className="p-2 text-gray-400 hover:text-indigo-400 transition-colors" title="Toàn màn hình"><Maximize size={18}/></button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded-lg transition-all ${isAIActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white'}`} title="Trợ lý Gemini"><Sparkles size={18} /></button>
            </div>
          </div>
        )}

        {/* READER AREA */}
        <div ref={containerRef} className={`flex-1 overflow-y-auto relative ${isPresentationMode ? 'bg-black' : 'bg-[#2a2a2a]'} custom-scrollbar`}>
            <div className="min-h-full w-full flex items-center justify-center p-6">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#2a2a2a]/60 backdrop-blur-md">
                        <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Đang nạp nội dung...</span>
                    </div>
                )}

                {book.contentType === 'pdf' ? (
                  <Document
                      file={source}
                      onLoadSuccess={() => setIsLoading(false)}
                      onLoadError={() => setIsLoading(false)}
                      options={pdfOptions}
                      inputRef={documentRef}
                      className="flex justify-center"
                      loading={null}
                  >
                      <PDFPage pageNumber={pageNumber} width={Math.min(containerSize?.width ? containerSize.width * 0.9 : 600, 1000)} scale={scale} />
                  </Document>
                ) : book.contentType === 'image' ? (
                  <div className="flex flex-col items-center gap-6" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                     <img 
                        src={source} 
                        alt="Reading"
                        className="shadow-2xl bg-white max-w-full h-auto rounded-xl border border-white/10"
                        style={{ width: containerSize ? containerSize.width * 0.85 : 'auto', maxHeight: '90vh', objectFit: 'contain' }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)}
                     />
                     <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-6 py-2 rounded-full shadow-xl backdrop-blur-md animate-slide-up">
                        {flattenedReadingList[currentIndex]?.title}
                     </div>
                  </div>
                ) : (
                  <div className="w-full max-w-xl bg-gray-900/80 backdrop-blur-2xl rounded-3xl p-10 border border-white/5 shadow-2xl flex flex-col items-center animate-slide-up">
                      <div className="w-48 h-48 bg-indigo-600/20 rounded-full flex items-center justify-center mb-8 border border-indigo-500/30 shadow-inner">
                        <Music size={80} className="text-indigo-400 animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 text-center font-serif">{book.title}</h2>
                      <p className="text-gray-400 text-sm mb-8">{flattenedReadingList[currentIndex]?.title}</p>
                      <audio
                        ref={audioRef}
                        src={source}
                        controls
                        className="w-full accent-indigo-500 h-10"
                        onLoadedMetadata={() => setIsLoading(false)}
                      />
                  </div>
                )}
            </div>

            {isPresentationMode && (
                 <button onClick={() => setIsPresentationMode(false)} className="fixed top-6 right-6 p-3 bg-gray-800/80 text-white rounded-full border border-gray-600 z-50 hover:bg-red-600 transition-all shadow-2xl backdrop-blur-md">
                    <X size={20} />
                 </button>
            )}
        </div>

        <AIAssistant isVisible={isAIActive} onClose={() => setIsAIActive(false)} pageText={currentPageText} />
      </div>
    </div>
  );
};

export default BookReader;


import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, Maximize, X, Menu, Loader2,
  ChevronDown, ChevronRight as ChevronRightIcon, FileText, FolderOpen, Book as BookIcon,
  AlertTriangle, ExternalLink, RefreshCcw, LogOut
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

// Thành phần mục lục được tối ưu hóa (Memoized) để tránh lag khi đổi trang
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
          <span className="w-3.5 flex justify-center shrink-0 opacity-40"><FileText size={12}/></span>
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
              isSelected={isSelected && child.id === node.id} // This logic simplified for performance
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
  disableAutoFetch: true, // Tiết kiệm RAM cho sách hình
};

const getDirectUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/(.+?)\/(view|edit)?/);
        if (idMatch && idMatch[1]) {
            return `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
        }
    }
    return url;
};

const BookReader: React.FC<BookReaderProps> = ({ book }) => {
  // 1. Tối ưu tính toán Cây thư mục (Chỉ tính khi book.chapters đổi)
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

  // 2. Danh sách phẳng để điều hướng Next/Prev
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);

  // Khởi tạo trạng thái mở rộng cây
  useEffect(() => {
    const rootIds = treeData.filter(n => n.children.length > 0).map(n => n.id);
    setExpandedNodes(new Set(rootIds));
  }, [treeData]);

  // Cập nhật kích thước container để scale trang PDF
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

  // Handlers
  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectNode = useCallback((node: any) => {
    const idx = flattenedReadingList.findIndex(item => item.id === node.id);
    if (idx !== -1) setCurrentIndex(idx);
    
    const newSource = getDirectUrl(node.url || book.url);
    if (newSource !== source) {
        setSource(newSource);
        setIsLoading(true);
        setLoadError(null);
    }
    setPageNumber(node.pageNumber || 1);
  }, [flattenedReadingList, book.url, source]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    setIsLoading(false);
    if (err.message.includes('Fetch') || err.message.includes('CORS')) {
      setLoadError("Lỗi bảo mật (CORS): Trình duyệt chặn ứng dụng đọc file từ máy chủ này. Hãy mở bằng trình duyệt gốc.");
    } else {
      setLoadError("Tệp PDF này quá nặng hoặc không tương thích để nạp trực tiếp vào ứng dụng.");
    }
  };

  const handleNext = () => {
    if (pageNumber < numPages) { setPageNumber(prev => prev + 1); return; }
    if (currentIndex < flattenedReadingList.length - 1) {
      const nextItem = flattenedReadingList[currentIndex + 1];
      handleSelectNode(nextItem);
    }
  };

  const handlePrev = () => {
    if (pageNumber > 1) { setPageNumber(prev => prev - 1); return; }
    if (currentIndex > 0) {
      const prevItem = flattenedReadingList[currentIndex - 1];
      handleSelectNode(prevItem);
    }
  };

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
                    key={node.id} 
                    node={node} 
                    level={0} 
                    expandedNodes={expandedNodes} 
                    toggleExpand={toggleExpand} 
                    onSelect={handleSelectNode}
                    isSelected={flattenedReadingList[currentIndex]?.id === node.id}
                  />
                ))}
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#2a2a2a]">
        {!isPresentationMode && (
          <div className="h-12 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white"><Menu size={18} /></button>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded border border-white/5">
                    <button onClick={handlePrev} className="p-1 text-gray-500 hover:text-white"><ChevronLeft size={16} /></button>
                    <span className="text-[10px] text-gray-300 font-mono w-12 text-center">{pageNumber} / {numPages || '--'}</span>
                    <button onClick={handleNext} className="p-1 text-gray-500 hover:text-white"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1">
                  <button onClick={() => setScale(s => Math.max(s-0.1, 0.5))} className="p-1.5 text-gray-500 hover:text-white"><ZoomOut size={14} /></button>
                  <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(s+0.1, 2))} className="p-1.5 text-gray-500 hover:text-white"><ZoomIn size={14} /></button>
               </div>
               <button onClick={() => setIsPresentationMode(true)} className="p-2 text-gray-500 hover:text-white"><Maximize size={16}/></button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded ${isAIActive ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}><Sparkles size={16} /></button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
            {isLoading && !loadError && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a]">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Đang tối ưu bộ nhớ...</p>
                </div>
            )}

            {loadError && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a] p-10 text-center">
                    <AlertTriangle className="text-red-500 mb-4" size={40} />
                    <h3 className="text-white font-bold mb-2">Lỗi nạp trang sách</h3>
                    <p className="text-gray-500 text-xs max-w-sm mb-6 leading-relaxed">{loadError}</p>
                    <div className="flex gap-3">
                      <button onClick={() => { setIsLoading(true); setLoadError(null); }} className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg flex items-center gap-2"><RefreshCcw size={14} /> Thử lại</button>
                      <a href={source} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-800 text-white text-xs rounded-lg flex items-center gap-2"><ExternalLink size={14} /> Mở trình xem gốc</a>
                    </div>
                </div>
            )}

            <div className="min-h-full w-full flex items-start justify-center p-6 md:p-10">
                <Document
                    key={source} 
                    file={source}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    options={pdfOptions}
                    className="flex justify-center"
                    loading={null}
                >
                    <PDFPage 
                      pageNumber={pageNumber} 
                      width={containerSize?.width ? Math.min(containerSize.width * 0.9, 1000) : 600} 
                      scale={scale} 
                    />
                </Document>
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


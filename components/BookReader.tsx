import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, AlertCircle, Maximize, X,
  Menu, Book as BookIcon, Upload, Columns, File, Image as ImageIcon, Loader2
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

interface BookReaderProps {
  book: Book;
}

// CẤU HÌNH ĐỒNG BỘ VỚI VERSION TRONG index.tsx (4.4.168)
const PDF_VERSION = '4.4.168';
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
};

// Helper để check loại file
const isImageSource = (source: string | File): boolean => {
  if (!source) return false;
  if (source instanceof File) {
    return source.type.startsWith('image/');
  }
  if (typeof source === 'string') {
    // Check extension hoặc pattern trong URL
    return /\.(jpg|jpeg|png|webp|gif|bmp)($|\?)/i.test(source);
  }
  return false;
};

const BookReader: React.FC<BookReaderProps> = ({ book }) => {
  const [pdfSource, setPdfSource] = useState<string | File>(book.url);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState(1.0);
  const [isAIActive, setIsAIActive] = useState(false);
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  
  // Xác định loại file hiện tại
  const fileType = useMemo(() => isImageSource(pdfSource) ? 'image' : 'pdf', [pdfSource]);

  // View Mode: 'single' (trang đơn) hoặc 'book' (2 trang/sách)
  const [viewMode, setViewMode] = useState<'single' | 'book'>('single');
  
  // Layout State
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const documentRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI States
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const activeChapter = book.chapters.find(c => c.id === activeChapterId);

  // Xử lý khi là file ảnh
  useEffect(() => {
    if (fileType === 'image') {
        setNumPages(1);
        setPageNumber(1);
        setCurrentPageText("Nội dung hình ảnh. Tính năng trích xuất văn bản chỉ hỗ trợ PDF.");
        setError(null);
        setIsDocumentLoading(false);
    } else {
        setIsDocumentLoading(true);
    }
  }, [fileType, pdfSource]);

  // Tự động chuyển sang Book Mode trên màn hình lớn
  useEffect(() => {
    if (fileType === 'pdf' && containerSize && containerSize.width > 1200) { 
      setViewMode('book');
    } else {
      setViewMode('single');
    }
  }, [containerSize?.width, fileType]); 

  // --- RESIZE HANDLER ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, isPresentationMode]);

  // --- PDF HANDLERS ---
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    setIsDocumentLoading(false);
    extractPageText(1);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF Load Error:", err);
    setError(`Lỗi: ${err.message}. Có thể file PDF không tồn tại hoặc lỗi đường truyền.`);
    setIsDocumentLoading(false);
  };

  // --- NAVIGATION CONTROLS ---
  const handleNext = () => {
    if (pageNumber >= numPages) return;
    const step = (viewMode === 'book' && pageNumber > 1) ? 2 : 1;
    const next = Math.min(pageNumber + step, numPages);
    setPageNumber(next);
    if (fileType === 'pdf') extractPageText(next);
    scrollToTop();
  };

  const handlePrev = () => {
    if (pageNumber <= 1) return;
    const step = (viewMode === 'book' && pageNumber > 2) ? 2 : 1;
    const prev = Math.max(pageNumber - step, 1);
    setPageNumber(prev);
    if (fileType === 'pdf') extractPageText(prev);
    scrollToTop();
  };

  const scrollToTop = () => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const handleChapterClick = (chapter: Chapter) => {
    setActiveChapterId(chapter.id);
    const targetUrl = chapter.url ? chapter.url : book.url;

    if (targetUrl !== pdfSource) {
        setPdfSource(targetUrl);
        setPageNumber(chapter.pageNumber || 1);
    } else {
        setPageNumber(chapter.pageNumber || 1);
        if (fileType === 'pdf') extractPageText(chapter.pageNumber || 1);
        scrollToTop();
    }
  };

  const extractPageText = useCallback(async (pageNum: number) => {
    if (!documentRef.current || fileType !== 'pdf') return;
    try {
      const page = await documentRef.current.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      setCurrentPageText(text);
    } catch (error) { /* ignore */ }
  }, [fileType]);

  const togglePresentationMode = () => {
    if (!isPresentationMode) {
      setIsPresentationMode(true);
      setIsSidebarOpen(false);
      document.documentElement.requestFullscreen?.().catch(console.error);
    } else {
      setIsPresentationMode(false);
      setIsSidebarOpen(true);
      document.exitFullscreen?.().catch(console.error);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.2));

  // --- DIMENSION CALCULATION ---
  const getPageDimensions = () => {
    if (!containerSize) return { width: 600 };
    const padding = isPresentationMode ? 10 : 40;
    const availableWidth = containerSize.width - padding;
    
    if (viewMode === 'book' && pageNumber > 1 && fileType === 'pdf') {
        return { width: Math.min((availableWidth / 2) * scale, 800), height: undefined };
    }
    return { width: Math.min(availableWidth * 0.9 * scale, 1200), height: isPresentationMode ? containerSize.height - 20 : undefined };
  };

  const { width: pageWidth, height: pageHeight } = getPageDimensions();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] p-4">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-red-500/50 max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-2 justify-center">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 rounded text-white text-sm font-medium">Tải lại trang</button>
              <button onClick={() => setPdfSource(book.url)} className="px-4 py-2 bg-gray-700 rounded text-white text-sm font-medium">File mặc định</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full transition-colors duration-500 ${isPresentationMode ? 'bg-black' : 'bg-[#1a1a1a]'}`}>
      
      {/* 1. SIDEBAR */}
      {!isPresentationMode && (
        <div className={`bg-[#252525] border-r border-black flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
            <div className="p-5 border-b border-gray-700 bg-[#2d2d2d]">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <BookIcon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Thư viện</span>
                </div>
                <h1 className="font-bold text-white text-lg leading-tight font-serif line-clamp-2">{book.title}</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {book.chapters.map((chapter) => (
                    <button
                        key={chapter.id}
                        onClick={() => handleChapterClick(chapter)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all mb-1 flex items-start gap-3 ${activeChapterId === chapter.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800'}`}
                    >
                        <span className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5 ${activeChapterId === chapter.id ? 'bg-indigo-600 text-white' : 'bg-gray-700'}`}>{chapter.pageNumber}</span>
                        <span className="line-clamp-2">{chapter.title}</span>
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* TOOLBAR */}
        {!isPresentationMode && (
          <div className="h-14 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white rounded-lg"><Menu size={18} /></button>
                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                
                {fileType === 'pdf' ? (
                  <div className="flex items-center gap-1 bg-[#252525] px-2 py-1 rounded-lg">
                      <button onClick={handlePrev} disabled={pageNumber <= 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-20"><ChevronLeft size={16} /></button>
                      <span className="text-[11px] text-gray-400 w-16 text-center font-mono">
                          {viewMode === 'book' && pageNumber > 1 ? `${pageNumber}-${Math.min(pageNumber+1, numPages)}` : pageNumber} / {numPages}
                      </span>
                      <button onClick={handleNext} disabled={pageNumber >= numPages} className="p-1 text-gray-400 hover:text-white disabled:opacity-20"><ChevronRight size={16} /></button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded flex items-center gap-1">
                    <ImageIcon size={12} /> ẢNH
                  </span>
                )}
                
                <div className="flex items-center gap-1 bg-[#252525] px-1 py-1 rounded-lg">
                    <button onClick={handleZoomOut} className="p-1 text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
                    <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1 text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
                </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={togglePresentationMode} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors" title="Toàn màn hình">
                  <Maximize size={18} />
               </button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded-lg transition-colors ${isAIActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                  <Sparkles size={18} />
               </button>
            </div>
          </div>
        )}

        {/* READER CONTAINER */}
        <div ref={containerRef} className={`flex-1 overflow-y-auto relative ${isPresentationMode ? 'bg-black' : 'bg-[#2a2a2a]'} custom-scrollbar`}>
            
            <div className={`min-h-full w-full flex items-center justify-center p-4`}>
                
                {isDocumentLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]/80 z-50">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                        <p className="text-gray-400 text-sm animate-pulse">Đang tải nội dung...</p>
                    </div>
                )}

                {fileType === 'pdf' ? (
                  <Document
                      file={pdfSource}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      options={pdfOptions}
                      inputRef={documentRef}
                      className="flex justify-center"
                      loading={null}
                  >
                      {viewMode === 'book' && pageNumber > 1 && numPages > 0 && containerSize ? (
                          <div className="flex shadow-2xl rounded-sm overflow-hidden bg-white border border-gray-700">
                              <div className="relative border-r border-gray-100">
                                  <PDFPage pageNumber={pageNumber} width={pageWidth} scale={scale} />
                              </div>
                              {pageNumber + 1 <= numPages && (
                                  <div className="relative">
                                      <PDFPage pageNumber={pageNumber + 1} width={pageWidth} scale={scale} />
                                  </div>
                              )}
                          </div>
                      ) : (
                          numPages > 0 && containerSize && (
                              <PDFPage pageNumber={pageNumber} width={pageWidth} height={pageHeight} scale={scale} isPresentation={isPresentationMode} />
                          )
                      )}
                  </Document>
                ) : (
                  <div className="flex justify-center items-center" style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}>
                     <img 
                        src={typeof pdfSource === 'string' ? pdfSource : URL.createObjectURL(pdfSource)} 
                        alt="Page content"
                        className="shadow-2xl bg-white max-w-full h-auto"
                        style={{ width: pageWidth }}
                     />
                  </div>
                )}
            </div>

            {isPresentationMode && (
                 <button onClick={togglePresentationMode} className="fixed top-6 right-6 p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full backdrop-blur-md z-50 border border-gray-600 shadow-xl">
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

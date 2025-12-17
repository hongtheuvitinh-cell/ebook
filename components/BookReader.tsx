import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, AlertCircle, Maximize, X,
  Menu, Book as BookIcon, Upload, Link as LinkIcon, FileText
} from 'lucide-react';
import { Book, Chapter } from '../types';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';

interface BookReaderProps {
  book: Book;
}

const pdfOptions = {
  cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/',
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
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isSidebarOpen, isPresentationMode]);

  // --- KEYBOARD NAV ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape' && isPresentationMode) togglePresentationMode();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, isPresentationMode]);

  // --- PDF HANDLERS ---
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    extractPageText(1);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF Load Error:", err);
    setError(`Không thể tải sách. Lỗi: ${err.message}.`);
  };

  // --- NAVIGATION CONTROLS ---
  const handleNext = () => {
    if (pageNumber < numPages) {
      const nextPage = pageNumber + 1;
      setPageNumber(nextPage);
      extractPageText(nextPage);
      scrollToTop();
    }
  };

  const handlePrev = () => {
    if (pageNumber > 1) {
      const prevPage = pageNumber - 1;
      setPageNumber(prevPage);
      extractPageText(prevPage);
      scrollToTop();
    }
  };

  const scrollToTop = () => {
    if (containerRef.current) {
        containerRef.current.scrollTop = 0;
    }
  };

  const handleChapterClick = (chapter: Chapter) => {
    setActiveChapterId(chapter.id);
    const targetUrl = chapter.url ? chapter.url : book.url;

    if (targetUrl !== pdfSource) {
        setPdfSource(targetUrl);
    } else {
        const targetPage = chapter.pageNumber || 1;
        setPageNumber(targetPage);
        extractPageText(targetPage);
        scrollToTop();
    }

    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }
  };

  const extractPageText = useCallback(async (pageNum: number) => {
    if (!documentRef.current) return;
    try {
      if (pageNum > documentRef.current.numPages || pageNum < 1) return;
      const page = await documentRef.current.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      setCurrentPageText(text);
    } catch (error) {
       // ignore
    }
  }, []);

  // --- UI HELPERS ---
  const togglePresentationMode = () => {
    if (!isPresentationMode) {
      setIsPresentationMode(true);
      setIsSidebarOpen(false);
      setScale(1.0); // Reset scale khi vào presentation
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(console.error);
      }
    } else {
      setIsPresentationMode(false);
      setIsSidebarOpen(true);
      setScale(1.0);
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
        setPdfSource(file);
        setNumPages(0);
        setPageNumber(1);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  // --- DIMENSION CALCULATION ---
  const getPageDimensions = () => {
    if (!containerSize) return { width: 800 };
    
    // 1. CHẾ ĐỘ TOÀN MÀN HÌNH (PRESENTATION)
    if (isPresentationMode) {
      // Ưu tiên fit theo chiều cao màn hình để không bị mất chữ
      // Trừ đi một chút padding nhỏ (20px) để không dính sát mép trên dưới
      return { 
        height: containerSize.height - 20, 
        width: undefined // Để undefined để react-pdf tự tính width theo tỷ lệ
      };
    }

    // 2. CHẾ ĐỘ THƯỜNG (NORMAL)
    const padding = 40; 
    const availableWidth = containerSize.width - padding;
    
    // Tăng tỷ lệ lên 0.8 (80%) theo yêu cầu
    const scaleFactor = 0.8; 
    const targetWidth = availableWidth * scaleFactor;
    
    // Giới hạn max width xuống 800px cho gọn
    const MAX_READING_WIDTH = 800; 
    
    return {
      width: Math.min(targetWidth, MAX_READING_WIDTH),
      height: undefined
    };
  };

  const { width: pageWidth, height: pageHeight } = getPageDimensions();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] gap-4">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-red-500/50 max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-300 mb-4">{error}</p>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 rounded text-white flex items-center gap-2 mx-auto">
             <Upload size={16} /> Chọn file khác
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full transition-colors duration-500 ${isPresentationMode ? 'bg-black' : 'bg-[#1a1a1a]'}`}>
      
      {/* 1. SIDEBAR */}
      {!isPresentationMode && (
        <div className={`bg-[#252525] border-r border-black flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
            <div className="p-5 border-b border-gray-700 bg-[#2d2d2d] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <BookIcon size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Tên sách</span>
                </div>
                <h1 className="font-bold text-white text-xl leading-snug break-words font-serif" title={book.title}>{book.title}</h1>
                {activeChapter && (
                     <div className="mt-2 pt-2 border-t border-gray-600">
                        <p className="text-sm text-indigo-300 font-medium leading-tight">{activeChapter.title}</p>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-1">
                    {book.chapters.map((chapter) => (
                        <button
                            key={chapter.id}
                            onClick={() => handleChapterClick(chapter)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-start group relative overflow-hidden ${activeChapterId === chapter.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800'}`}
                        >
                            <span className={`mr-3 text-xs mt-0.5 px-1.5 py-0.5 rounded flex-shrink-0 ${activeChapterId === chapter.id ? 'bg-indigo-500 text-white' : 'bg-gray-700'}`}>{chapter.pageNumber}</span>
                            <div className="flex-1">
                                <span className="line-clamp-2">{chapter.title}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* TOOLBAR */}
        {!isPresentationMode && (
          <div className="h-14 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shadow-lg shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><Menu size={20} /></button>
                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                
                <div className="flex items-center gap-2 bg-[#2d2d2d] px-2 py-1 rounded-lg">
                    <button onClick={handlePrev} disabled={pageNumber <= 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={18} /></button>
                    <span className="text-sm text-gray-300 w-20 text-center font-mono">{pageNumber} / {numPages || '--'}</span>
                    <button onClick={handleNext} disabled={pageNumber >= numPages} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={18} /></button>
                </div>
                
                <div className="flex items-center gap-1 bg-[#2d2d2d] px-2 py-1 rounded-lg ml-2">
                    <button onClick={handleZoomOut} className="p-1 text-gray-400 hover:text-white"><ZoomOut size={16} /></button>
                    <span className="text-xs text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1 text-gray-400 hover:text-white"><ZoomIn size={16} /></button>
                </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={togglePresentationMode} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 rounded-lg border border-indigo-500/30 text-sm font-medium">
                <Maximize size={16} /><span className="hidden sm:inline">Toàn màn hình</span>
               </button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded-lg transition-colors ${isAIActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Sparkles size={20} />
               </button>
            </div>
          </div>
        )}

        {/* READER CONTAINER */}
        <div ref={containerRef} className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isPresentationMode ? 'bg-black' : 'bg-[#525659]'} custom-scrollbar`}>
            
            {/* Inner Wrapper: Trong presentation mode, giảm padding để tối ưu không gian */}
            <div className={`min-h-full w-full flex items-center justify-center ${isPresentationMode ? 'p-1' : 'p-4 md:p-8'}`}>
                
                {numPages === 0 && (
                    <div className="flex flex-col items-center justify-center text-gray-400 z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-2"></div>
                        <p>Đang chuẩn bị sách...</p>
                    </div>
                )}

                <Document
                    file={pdfSource}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    options={pdfOptions}
                    inputRef={documentRef}
                    className="flex justify-center" 
                >
                    {/* Standard Page Rendering */}
                    {numPages > 0 && containerSize && (
                        <PDFPage 
                            pageNumber={pageNumber}
                            width={pageWidth}
                            height={pageHeight} // Truyền height nếu có (cho chế độ presentation)
                            scale={scale}
                            isPresentation={isPresentationMode}
                        />
                    )}
                </Document>
            </div>

            {isPresentationMode && (
                 <button onClick={togglePresentationMode} className="fixed top-4 right-4 p-2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-full backdrop-blur z-50">
                    <X size={24} />
                 </button>
            )}
        </div>

        <AIAssistant isVisible={isAIActive} onClose={() => setIsAIActive(false)} pageText={currentPageText} />
      </div>
    </div>
  );
};

export default BookReader;
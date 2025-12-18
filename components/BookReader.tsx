import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sparkles, AlertCircle, Maximize, X,
  Menu, Book as BookIcon, ImageIcon, Loader2,
  Play, Pause, SkipBack, SkipForward, Volume2, Headphones, Music
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
  const [source, setSource] = useState<string>(book.url);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState(1.0);
  const [isAIActive, setIsAIActive] = useState(false);
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'single' | 'book'>('single');
  const [containerSize, setContainerSize] = useState<{width: number, height: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<any>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Audio States
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    setSource(book.url);
    setPageNumber(1);
    setIsLoading(true);
    setError(null);
    setAudioError(null);
    if (book.contentType !== 'audio') setIsPlaying(false);
  }, [book.id, book.url, book.contentType]);

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

  // Audio Logic
  const togglePlay = () => {
    if (audioRef.current && !audioError) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(e => setAudioError("Không thể phát âm thanh. Vui lòng kiểm tra lại link file."));
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioError(null);
    }
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) audioRef.current.currentTime = time;
    setAudioProgress(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    extractPageText(1);
  };

  const handleNext = () => {
    if (book.contentType === 'audio') {
        if (audioRef.current) audioRef.current.currentTime += 30;
        return;
    }
    if (pageNumber >= numPages) return;
    const next = Math.min(pageNumber + (viewMode === 'book' && pageNumber > 1 ? 2 : 1), numPages);
    setPageNumber(next);
    if (book.contentType === 'pdf') extractPageText(next);
  };

  const handlePrev = () => {
    if (book.contentType === 'audio') {
        if (audioRef.current) audioRef.current.currentTime -= 30;
        return;
    }
    if (pageNumber <= 1) return;
    const prev = Math.max(pageNumber - (viewMode === 'book' && pageNumber > 2 ? 2 : 1), 1);
    setPageNumber(prev);
    if (book.contentType === 'pdf') extractPageText(prev);
  };

  const handleChapterClick = (chapter: Chapter) => {
    setActiveChapterId(chapter.id);
    const targetUrl = chapter.url || book.url;
    if (targetUrl !== source) {
        setSource(targetUrl);
        setAudioError(null);
        setIsLoading(true);
    }
    setPageNumber(chapter.pageNumber || 1);
  };

  const extractPageText = useCallback(async (pageNum: number) => {
    if (!documentRef.current || book.contentType !== 'pdf') return;
    try {
      const page = await documentRef.current.getPage(pageNum);
      const textContent = await page.getTextContent();
      setCurrentPageText(textContent.items.map((item: any) => item.str).join(' '));
    } catch (e) {}
  }, [book.contentType]);

  const togglePresentationMode = () => {
    if (!isPresentationMode) {
      document.documentElement.requestFullscreen?.();
      setIsPresentationMode(true);
      setIsSidebarOpen(false);
    } else {
      document.exitFullscreen?.();
      setIsPresentationMode(false);
      setIsSidebarOpen(true);
    }
  };

  // Error screen only for non-audio fatal errors
  if (error && book.contentType !== 'audio') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-white font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 bg-indigo-600 px-4 py-2 rounded">Thử lại</button>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full ${isPresentationMode ? 'bg-black' : 'bg-[#1a1a1a]'}`}>
      
      {/* SIDEBAR */}
      {!isPresentationMode && (
        <div className={`bg-[#252525] border-r border-black flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
            <div className="p-5 border-b border-gray-700 bg-[#2d2d2d]">
                <h1 className="font-bold text-white text-lg font-serif line-clamp-2">{book.title}</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {book.chapters.map(ch => (
                    <button key={ch.id} onClick={() => handleChapterClick(ch)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 flex items-start gap-3 ${activeChapterId === ch.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] mt-0.5 ${activeChapterId === ch.id ? 'bg-indigo-600 text-white' : 'bg-gray-700'}`}>{ch.pageNumber}</span>
                        <span className="line-clamp-2">{ch.title}</span>
                    </button>
                ))}
                {book.chapters.length === 0 && <p className="text-gray-600 text-[10px] text-center mt-4 uppercase font-bold tracking-widest">Không có chương mục</p>}
            </div>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* TOOLBAR */}
        {!isPresentationMode && (
          <div className="h-14 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition-colors"><Menu size={18} /></button>
                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                
                {book.contentType === 'pdf' ? (
                  <div className="flex items-center gap-1 bg-[#252525] px-2 py-1 rounded-lg">
                      <button onClick={handlePrev} disabled={pageNumber <= 1} className="p-1 text-gray-400 disabled:opacity-20"><ChevronLeft size={16} /></button>
                      <span className="text-[11px] text-gray-400 w-16 text-center font-mono">{pageNumber} / {numPages}</span>
                      <button onClick={handleNext} disabled={pageNumber >= numPages} className="p-1 text-gray-400 disabled:opacity-20"><ChevronRight size={16} /></button>
                  </div>
                ) : book.contentType === 'image' ? (
                  <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full flex items-center gap-1 uppercase">
                    <ImageIcon size={14} /> HÌNH ẢNH
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full flex items-center gap-1 uppercase">
                    <Headphones size={14} /> SÁCH NÓI
                  </span>
                )}
                
                {book.contentType !== 'audio' && (
                  <div className="flex items-center gap-1 bg-[#252525] px-1 py-1 rounded-lg">
                      <button onClick={() => setScale(s => Math.max(s-0.1, 0.5))} className="p-1 text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
                      <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                      <button onClick={() => setScale(s => Math.min(s+0.1, 3))} className="p-1 text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
                  </div>
                )}
            </div>
            <div className="flex items-center gap-2">
               {/* Fixed: Moved 'title' prop from Maximize icon to the button element */}
               <button onClick={togglePresentationMode} className="p-2 text-gray-400 hover:text-indigo-400 transition-colors" title="Toàn màn hình"><Maximize size={18} /></button>
               <button onClick={() => setIsAIActive(!isAIActive)} className={`p-2 rounded-lg transition-all ${isAIActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:text-white'}`}><Sparkles size={18} /></button>
            </div>
          </div>
        )}

        {/* CONTAINER */}
        <div ref={containerRef} className={`flex-1 overflow-y-auto relative ${isPresentationMode ? 'bg-black' : 'bg-[#2a2a2a]'} custom-scrollbar`}>
            <div className="min-h-full w-full flex items-center justify-center p-4">
                
                {isLoading && book.contentType !== 'image' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#2a2a2a]/60 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                        <p className="text-gray-400 text-sm animate-pulse">Đang tải nội dung...</p>
                    </div>
                )}

                {book.contentType === 'pdf' ? (
                  <Document
                      file={source}
                      /* Fixed: Changed 'onDocumentLoadSuccess' to 'onLoadSuccess' */
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(err) => { setError(err.message); setIsLoading(false); }}
                      options={pdfOptions}
                      inputRef={documentRef}
                      className="flex justify-center"
                      loading={null}
                  >
                      {viewMode === 'book' && pageNumber > 1 && numPages > 0 ? (
                          <div className="flex shadow-2xl rounded bg-white">
                              <PDFPage pageNumber={pageNumber} width={Math.min(containerSize?.width ? containerSize.width * 0.45 : 600, 800)} scale={scale} />
                              {pageNumber + 1 <= numPages && <PDFPage pageNumber={pageNumber + 1} width={Math.min(containerSize?.width ? containerSize.width * 0.45 : 600, 800)} scale={scale} />}
                          </div>
                      ) : (
                          numPages > 0 && <PDFPage pageNumber={pageNumber} width={Math.min(containerSize?.width ? containerSize.width * 0.9 : 600, 1000)} scale={scale} />
                      )}
                  </Document>
                ) : book.contentType === 'image' ? (
                  <div className="flex justify-center items-center" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                     <img 
                        src={source} 
                        alt="Content"
                        className="shadow-2xl bg-white max-w-full h-auto"
                        style={{ width: containerSize ? containerSize.width * 0.9 : 'auto' }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setError("Không thể nạp hình ảnh. Kiểm tra lại đường dẫn."); setIsLoading(false); }}
                     />
                  </div>
                ) : (
                  /* AUDIO PLAYER INTERFACE */
                  <div className="w-full max-w-2xl bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl flex flex-col items-center animate-slide-up">
                      <div className="relative mb-8">
                          {/* Animated Disk Effect */}
                          <div className={`w-64 h-64 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden relative ${isPlaying && !audioError ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-full h-full bg-indigo-900/40 flex items-center justify-center p-4">
                                      <Music size={80} className="text-indigo-400 opacity-50" />
                                  </div>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-900 rounded-full border-4 border-gray-800 z-10"></div>
                          </div>
                          {/* Needle Effect */}
                          <div className={`absolute -right-4 top-0 w-2 h-32 bg-gray-700 origin-top transition-transform duration-500 rounded-full ${isPlaying && !audioError ? 'rotate-[25deg]' : 'rotate-0'}`}></div>
                      </div>

                      <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-white mb-2 font-serif">{book.title}</h2>
                          <p className="text-indigo-400 font-medium">{book.author}</p>
                      </div>

                      {source && source !== "https://" && (
                        <audio
                          ref={audioRef}
                          src={source}
                          onTimeUpdate={onTimeUpdate}
                          onLoadedMetadata={onLoadedMetadata}
                          onEnded={() => setIsPlaying(false)}
                          onError={() => { 
                            setAudioError("Không thể nạp file âm thanh. Có thể đường dẫn sai hoặc file không tồn tại."); 
                            setIsLoading(false); 
                            setIsPlaying(false);
                          }}
                        />
                      )}

                      {/* Controls */}
                      <div className="w-full space-y-6">
                          {audioError ? (
                              <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs">
                                  <AlertCircle size={16} />
                                  <span>{audioError}</span>
                              </div>
                          ) : (
                              <>
                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <input 
                                      type="range" 
                                      value={audioProgress}
                                      onChange={handleSeek}
                                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                        <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center justify-center gap-8">
                                    <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10; }} className="text-gray-400 hover:text-white transition-colors p-2" title="Lùi 10s"><SkipBack size={24}/></button>
                                    <button onClick={togglePlay} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all hover:scale-110 active:scale-95">
                                        {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                                    </button>
                                    <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10; }} className="text-gray-400 hover:text-white transition-colors p-2" title="Tiến 10s"><SkipForward size={24}/></button>
                                </div>
                              </>
                          )}

                          <div className="flex items-center gap-3 justify-center text-gray-500 bg-gray-800/30 py-2 px-4 rounded-full w-fit mx-auto">
                              <Volume2 size={16} />
                              <div className="text-[10px] font-bold uppercase tracking-widest">Âm thanh chuẩn HD</div>
                          </div>
                      </div>
                  </div>
                )}
            </div>

            {isPresentationMode && (
                 <button onClick={togglePresentationMode} className="fixed top-6 right-6 p-2 bg-gray-800/80 text-white rounded-full border border-gray-600 z-50 transition-colors hover:bg-gray-700 shadow-xl backdrop-blur-md">
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

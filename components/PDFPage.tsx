
import React, { useState, useEffect, useMemo } from 'react';
import { Page } from 'react-pdf';

interface PDFPageProps {
  pageNumber: number;
  width?: number;
  height?: number;
  scale: number;
}

const PDFPage: React.FC<PDFPageProps> = ({ pageNumber, width = 600, height, scale }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setRenderError(false);
  }, [pageNumber, width, scale]); 

  const safePixelRatio = useMemo(() => {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = width * scale * dpr;
    if (targetWidth > 1800) return Math.min(1.25, 1800 / (width * scale));
    return Math.min(1.5, dpr); 
  }, [width, scale]);

  const scaledWidth = width * scale;
  // Giả định tỷ lệ trang giấy A4 (1.41) để giữ khung hình ổn định lúc nạp
  const minHeight = scaledWidth * 1.41;

  if (renderError) {
    return (
      <div 
        className="bg-[#222] border border-red-900/30 rounded-lg flex flex-col items-center justify-center text-center p-12"
        style={{ width: scaledWidth, height: minHeight }}
      >
        <p className="text-red-400 text-sm font-bold">Lỗi dựng hình</p>
        <p className="text-gray-500 text-xs mt-2 italic">Tệp quá nặng cho bộ nhớ RAM. Hãy dùng "Chế độ Gốc".</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/5 relative overflow-hidden transition-all duration-500 ease-out transform"
      style={{
        width: scaledWidth,
        minHeight: minHeight,
        transform: isLoaded ? 'scale(1)' : 'scale(0.98)',
      }}
    >
        {/* Skeleton Layer: Hiện khi đang nạp để tránh màn hình trắng xóa hoặc giật */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#f9f9f9] flex flex-col items-center justify-center z-10 animate-pulse">
             <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <div className="space-y-3 w-2/3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
             </div>
             <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-6">Đang lật trang {pageNumber}...</span>
          </div>
        )}

        <Page
            pageNumber={pageNumber}
            width={width}
            scale={scale}
            devicePixelRatio={safePixelRatio}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            canvasBackground="white"
            className={`transition-all duration-700 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0 scale-95 blur-sm'}`}
            onRenderSuccess={() => setIsLoaded(true)} 
            onRenderError={() => {
              setRenderError(true);
              setIsLoaded(true);
            }}
            loading={null}
        />
    </div>
  );
};

export default PDFPage;


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

  // Tính toán DPI an toàn cho sách hình scan nặng
  const safePixelRatio = useMemo(() => {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = width * scale * dpr;
    if (targetWidth > 1800) return Math.min(1.25, 1800 / (width * scale));
    return Math.min(1.5, dpr); 
  }, [width, scale]);

  const scaledWidth = width * scale;

  if (renderError) {
    return (
      <div 
        className="bg-[#222] border border-red-900/30 rounded-lg flex flex-col items-center justify-center text-center p-12"
        style={{ width: scaledWidth, height: scaledWidth * 1.41 }}
      >
        <p className="text-red-400 text-sm font-bold">Lỗi dựng hình</p>
        <p className="text-gray-500 text-xs mt-2 italic">Tệp quá nặng cho bộ nhớ RAM. Hãy dùng "Chế độ Gốc".</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative"
      style={{
        width: scaledWidth,
        // Loại bỏ minHeight cố định để div tự co theo nội dung PDF render
      }}
    >
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center z-10">
             <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
             <span className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Dựng trang {pageNumber}...</span>
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
            className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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

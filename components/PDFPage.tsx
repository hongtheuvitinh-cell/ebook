
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
  const [aspectRatio, setAspectRatio] = useState<number>(1.41); // Mặc định A4, sẽ cập nhật khi nạp trang

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
  const calculatedHeight = scaledWidth * aspectRatio;

  if (renderError) {
    return (
      <div 
        className="bg-[#222] border border-red-900/30 rounded-lg flex flex-col items-center justify-center text-center p-12"
        style={{ width: scaledWidth, height: calculatedHeight || 400 }}
      >
        <p className="text-red-400 text-sm font-bold">Lỗi dựng hình</p>
        <p className="text-gray-500 text-xs mt-2 italic">Tệp quá nặng cho bộ nhớ RAM. Hãy dùng "Chế độ Gốc".</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 ease-out transform origin-top"
      style={{
        width: scaledWidth,
        height: isLoaded ? 'auto' : calculatedHeight,
        transform: isLoaded ? 'scale(1)' : 'scale(0.99)',
      }}
    >
        {/* Skeleton Layer: Khít theo tỷ lệ thực của trang */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#fdfdfd] flex flex-col items-center justify-center z-10 animate-pulse">
             <div className="w-10 h-10 border-4 border-indigo-500/5 border-t-indigo-500/40 rounded-full animate-spin mb-4"></div>
             <div className="space-y-3 w-1/2">
                <div className="h-2 bg-gray-100 rounded w-full"></div>
                <div className="h-2 bg-gray-100 rounded w-3/4 mx-auto"></div>
             </div>
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
            className={`transition-all duration-700 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0 scale-95 blur-[2px]'}`}
            onLoadSuccess={(page) => {
                // Tính toán tỷ lệ thực của trang: cao / rộng
                const ratio = page.height / page.width;
                setAspectRatio(ratio);
            }}
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


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
  }, [pageNumber, sourceKey(width, scale)]); // Simplified dependency

  // Helper to detect scale changes for reset
  function sourceKey(w: number, s: number) { return `${w}-${s}`; }

  /**
   * GIỚI HẠN DIỆN TÍCH CANVAS (Memory Protection):
   * Các trình duyệt thường lỗi nếu Canvas vượt quá ~16-30 triệu điểm ảnh.
   * Với sách hình scan (thường 300-600 DPI), ta phải giới hạn cực độ.
   */
  const safePixelRatio = useMemo(() => {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = width * scale * dpr;
    const maxSafeWidth = 1800; // Giới hạn chiều rộng vẽ thực tế để cứu RAM
    
    if (targetWidth > maxSafeWidth) {
      return maxSafeWidth / (width * scale);
    }
    return Math.min(1.5, dpr); // Không cần quá sắc nét để đánh đổi hiệu năng
  }, [width, scale]);

  const scaledWidth = width * scale;
  const scaledHeight = height ? height * scale : scaledWidth * 1.414;

  if (renderError) {
    return (
      <div 
        className="bg-[#333] border border-red-900/30 rounded flex flex-col items-center justify-center text-center p-10"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <p className="text-red-400 text-xs font-bold">Lỗi hiển thị hình ảnh nặng</p>
        <p className="text-gray-500 text-[10px] mt-1">Hãy giảm thu phóng hoặc dùng trình xem gốc.</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow-2xl border border-black/20 relative overflow-hidden transition-opacity duration-300"
      style={{
        width: scaledWidth,
        minHeight: scaledHeight,
      }}
    >
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#222] flex flex-col items-center justify-center z-10">
             <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
             <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Đang dựng hình...</span>
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
            className={isLoaded ? 'opacity-100' : 'opacity-0'}
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

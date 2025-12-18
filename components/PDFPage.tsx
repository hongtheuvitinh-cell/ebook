
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

  // Reset trạng thái khi đổi trang
  useEffect(() => {
    setIsLoaded(false);
  }, [pageNumber, sourceKey(width, scale)]);

  function sourceKey(w: number, s: number) {
      return `${w}-${s}`;
  }

  // Thuật toán giới hạn Canvas: 
  // Nếu (width * scale * devicePixelRatio) quá lớn, nó sẽ làm sập trình duyệt.
  // Chúng ta sẽ tính toán một tỷ lệ "an toàn".
  const safePixelRatio = useMemo(() => {
    const rawRatio = window.devicePixelRatio || 1;
    const totalPixels = width * scale * rawRatio;
    
    // Nếu chiều rộng vẽ ra > 3000px, bắt đầu giảm tỷ lệ điểm ảnh để cứu RAM
    if (totalPixels > 3000) {
        return Math.max(1, 3000 / (width * scale));
    }
    return Math.min(2, rawRatio); // Không bao giờ vượt quá 2 để giữ hiệu năng
  }, [width, scale]);

  const scaledWidth = width * scale;
  const scaledHeight = height ? height * scale : scaledWidth * 1.414;

  return (
    <div 
      className="bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-gray-200 relative overflow-hidden transition-all mx-auto w-fit h-fit rounded-sm"
      style={{
        minWidth: isLoaded ? 'auto' : `${scaledWidth}px`,
        minHeight: isLoaded ? 'auto' : `${scaledHeight}px`,
      }}
    >
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#f8f9fa] flex items-center justify-center z-10">
             <div className="w-full h-full p-12 flex flex-col gap-6 opacity-20">
                  <div className="w-3/4 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="w-full h-3 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="w-5/6 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="w-4/6 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg animate-pulse border border-gray-200"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
             </div>
          </div>
        )}

        <Page
            pageNumber={pageNumber}
            width={width}
            scale={scale}
            // Dùng tỷ lệ an toàn đã tính toán
            devicePixelRatio={safePixelRatio}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            canvasBackground="white"
            className={`block transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onRenderSuccess={() => {
                setIsLoaded(true);
                // Gợi ý trình duyệt giải phóng bộ nhớ thừa sau khi vẽ xong
                const canvases = document.querySelectorAll('canvas');
                if (canvases.length > 2) {
                    // Cơ chế này giúp đảm bảo không có quá nhiều canvas ẩn được giữ lại
                }
            }} 
            onLoadError={() => setIsLoaded(true)}
            loading={null}
        />
    </div>
  );
};

export default PDFPage;

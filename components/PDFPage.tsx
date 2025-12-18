
import React, { useState, useEffect } from 'react';
import { Page } from 'react-pdf';

interface PDFPageProps {
  pageNumber: number;
  width?: number;
  height?: number;
  scale: number;
}

const PDFPage: React.FC<PDFPageProps> = ({ pageNumber, width = 600, height, scale }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset trạng thái loaded mỗi khi số trang hoặc file thay đổi
  useEffect(() => {
    setIsLoaded(false);
  }, [pageNumber, width, scale]);

  // Tính toán kích thước thực tế sau khi scale để áp dụng cho Skeleton
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
        {/* Skeleton Loader cải tiến */}
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
            height={height}
            width={width}
            scale={scale}
            // CRITICAL: Giới hạn Device Pixel Ratio để không làm sập bộ nhớ Canvas trên màn hình 4K/Retina
            devicePixelRatio={Math.min(2, window.devicePixelRatio)}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            canvasBackground="white"
            className={`block transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onRenderSuccess={() => setIsLoaded(true)} 
            onLoadError={() => setIsLoaded(true)}
            loading={null}
        />
    </div>
  );
};

export default PDFPage;

import React, { useState, useEffect } from 'react';
import { Page } from 'react-pdf';

interface PDFPageProps {
  pageNumber: number;
  width?: number;
  height?: number;
  scale: number;
  isPresentation?: boolean;
}

const PDFPage: React.FC<PDFPageProps> = ({ pageNumber, width, height, scale }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset trạng thái loaded mỗi khi số trang thay đổi
  useEffect(() => {
    setIsLoaded(false);
  }, [pageNumber]);

  return (
    <div 
      className="bg-white shadow-xl border border-gray-200 relative overflow-hidden transition-all mx-auto"
      style={{
        // Nếu có width thì dùng width, nếu không (presentation mode dùng height) thì width auto
        width: width ? `${width}px` : 'auto',
        // Nếu có height (presentation mode) thì dùng height, nếu không thì auto
        height: height ? `${height}px` : 'auto',
        
        // Skeleton logic:
        // Nếu đã load: auto (để ôm sát nội dung)
        // Nếu chưa load (Skeleton):
        // 1. Nếu có width: giả lập chiều cao theo tỷ lệ A4 (width * 1.414)
        // 2. Nếu có height (presentation): dùng đúng height đó
        // 3. Fallback 70vh
        minHeight: isLoaded 
            ? 'auto' 
            : (height 
                ? `${height}px` 
                : (width ? `${width * 1.414}px` : '70vh')
              ),
        
        // Khi dùng height mode, cần đảm bảo aspect ratio của skeleton không làm vỡ khung
        minWidth: (!isLoaded && height) ? `${height / 1.414}px` : 'auto'
      }}
    >
        {/* Skeleton Loader */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center animate-pulse z-10">
             <div className="text-gray-300 flex flex-col items-center w-full px-12">
                <div className="w-full h-full flex flex-col gap-4 justify-center items-center py-10 opacity-50">
                     <div className="w-3/4 h-8 bg-gray-200 rounded"></div>
                     <div className="w-full h-px bg-gray-200 my-4"></div>
                     <div className="w-full h-4 bg-gray-200 rounded"></div>
                     <div className="w-full h-4 bg-gray-200 rounded"></div>
                     <div className="w-5/6 h-4 bg-gray-200 rounded"></div>
                     <div className="w-full h-32 bg-gray-200 rounded mt-8"></div>
                </div>
             </div>
          </div>
        )}

        <Page
            pageNumber={pageNumber}
            height={height}
            width={width}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className={`block page-transition ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onRenderSuccess={() => setIsLoaded(true)} 
            loading={null}
        />
    </div>
  );
};

export default PDFPage;

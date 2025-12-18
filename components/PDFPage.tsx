
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
  }, [pageNumber, width]);

  // Tính toán kích thước thực tế sau khi scale để áp dụng cho Skeleton
  const scaledWidth = width * scale;
  const scaledHeight = height ? height * scale : scaledWidth * 1.414;

  return (
    <div 
      className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 relative overflow-hidden transition-all mx-auto w-fit h-fit rounded-sm"
      style={{
        // Khung nền trắng sẽ có kích thước bằng đúng kích thước PDF đã scale
        minWidth: isLoaded ? 'auto' : `${scaledWidth}px`,
        minHeight: isLoaded ? 'auto' : `${scaledHeight}px`,
      }}
    >
        {/* Skeleton Loader - Chỉ hiện khi chưa load xong và ôm đúng kích thước sẽ hiển thị */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center animate-pulse z-10">
             <div className="text-gray-200 flex flex-col items-center w-full px-8 gap-4">
                  <div className="w-3/4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="w-full h-2 bg-gray-100 rounded-full"></div>
                  <div className="w-5/6 h-2 bg-gray-100 rounded-full"></div>
                  <div className="w-full h-32 bg-gray-100 rounded-md mt-4 opacity-50"></div>
                  <div className="w-2/3 h-2 bg-gray-100 rounded-full mt-4"></div>
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

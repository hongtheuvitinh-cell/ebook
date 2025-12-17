import React, { useState, useMemo } from 'react';
import { Book, Category } from '../types';
import { BookOpen, Folder, ChevronRight, Home, FolderOpen } from 'lucide-react';

interface LibraryProps {
  books: Book[];
  categories: Category[];
  onSelectBook: (book: Book) => void;
}

const Library: React.FC<LibraryProps> = ({ books, categories, onSelectBook }) => {
  // null nghĩa là đang ở trang chủ (Root)
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);

  // --- LOGIC LỌC DỮ LIỆU ---

  // 1. Lấy danh mục hiện tại (để hiển thị tên)
  const currentCategory = useMemo(() => 
    categories.find(c => c.id === currentCategoryId), 
  [currentCategoryId, categories]);

  // 2. Lấy danh sách danh mục con của danh mục hiện tại
  const subCategories = useMemo(() => 
    categories.filter(c => {
        if (currentCategoryId === null) {
            // Nếu ở Root, lấy các category không có parentId (hoặc parentId undefined)
            return !c.parentId;
        }
        return c.parentId === currentCategoryId;
    }),
  [currentCategoryId, categories]);

  // 3. Lấy sách thuộc danh mục hiện tại
  const currentBooks = useMemo(() => 
    books.filter(b => {
        if (currentCategoryId === null) {
            // Ở trang chủ, chỉ hiện sách không thuộc category nào (nếu có)
            return !b.categoryId;
        }
        return b.categoryId === currentCategoryId;
    }),
  [currentCategoryId, books]);

  // --- LOGIC BREADCRUMBS (ĐƯỜNG DẪN) ---
  const breadcrumbs = useMemo(() => {
      const path: Category[] = [];
      let current = currentCategory;
      while (current) {
          path.unshift(current); // Thêm vào đầu mảng
          const parentId = current.parentId;
          current = categories.find(c => c.id === parentId);
      }
      return path;
  }, [currentCategory, categories]);

  // --- RENDER ---
  return (
    <div className="container mx-auto px-4 py-8 h-full">
      
      {/* 1. HEADER & BREADCRUMBS */}
      <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 font-serif text-center">
             {currentCategory ? currentCategory.name : 'Thư Viện Sách'}
          </h1>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg w-fit mx-auto md:mx-0">
              <button 
                onClick={() => setCurrentCategoryId(null)}
                className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${currentCategoryId === null ? 'text-indigo-400 font-bold' : ''}`}
              >
                  <Home size={16} /> Trang chủ
              </button>
              
              {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                      <ChevronRight size={14} className="text-gray-600" />
                      <button 
                        onClick={() => setCurrentCategoryId(crumb.id)}
                        className={`hover:text-indigo-400 transition-colors ${currentCategoryId === crumb.id ? 'text-indigo-400 font-bold' : ''}`}
                      >
                          {crumb.name}
                      </button>
                  </React.Fragment>
              ))}
          </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className="space-y-10">
          
          {/* SECTION: FOLDERS (Danh mục con) */}
          {subCategories.length > 0 && (
              <section>
                  <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                     <FolderOpen size={20} /> Danh mục
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {subCategories.map(cat => (
                          <div 
                            key={cat.id}
                            onClick={() => setCurrentCategoryId(cat.id)}
                            className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 cursor-pointer transition-all group flex flex-col items-center text-center gap-3"
                          >
                              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <Folder size={24} />
                              </div>
                              <div>
                                  <h3 className="font-medium text-gray-200 group-hover:text-white">{cat.name}</h3>
                                  {cat.description && <p className="text-xs text-gray-500 mt-1">{cat.description}</p>}
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          {/* SECTION: BOOKS (Sách trong thư mục) */}
          {currentBooks.length > 0 ? (
            <section>
                <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                     <BookOpen size={20} /> Sách ({currentBooks.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {currentBooks.map((book) => (
                    <div
                    key={book.id}
                    onClick={() => onSelectBook(book)}
                    className="group cursor-pointer flex flex-col items-center"
                    >
                    {/* Giả lập bìa sách */}
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-indigo-900 to-gray-800 rounded-r-lg rounded-l-sm shadow-xl mb-4 relative transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl border-l-4 border-l-gray-700 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10 z-10"></div>
                        <div className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center">
                            <BookOpen size={32} className="text-indigo-400/50 mb-2" />
                            <h3 className="font-serif text-lg font-bold text-gray-200 line-clamp-3 leading-tight">
                                {book.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2 line-clamp-1">{book.author}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-indigo-500/10 transition-colors"></div>
                    </div>

                    <div className="text-center w-full px-2">
                        <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                        {book.title}
                        </h3>
                    </div>
                    </div>
                ))}
                </div>
            </section>
          ) : (
             /* Nếu không có sách và cũng không có danh mục con (Lá rỗng) */
             subCategories.length === 0 && (
                 <div className="text-center py-20 text-gray-500 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                     <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                     <p>Chưa có sách nào trong mục này.</p>
                 </div>
             )
          )}
      </div>
    </div>
  );
};

export default Library;
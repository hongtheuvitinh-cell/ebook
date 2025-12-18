
import React, { useState, useMemo } from 'react';
import { Book, Category } from '../types';
import { BookOpen, Folder, ChevronRight, Home, FolderOpen, Headphones, ImageIcon } from 'lucide-react';

interface LibraryProps {
  books: Book[];
  categories: Category[];
  onSelectBook: (book: Book) => void;
}

const Library: React.FC<LibraryProps> = ({ books, categories, onSelectBook }) => {
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);

  const currentCategory = useMemo(() => 
    categories.find(c => c.id === currentCategoryId), 
  [currentCategoryId, categories]);

  const subCategories = useMemo(() => 
    categories.filter(c => !currentCategoryId ? !c.parentId : c.parentId === currentCategoryId),
  [currentCategoryId, categories]);

  const currentBooks = useMemo(() => 
    books.filter(b => !currentCategoryId ? !b.categoryId : b.categoryId === currentCategoryId),
  [currentCategoryId, books]);

  const breadcrumbs = useMemo(() => {
      const path: Category[] = [];
      let current = currentCategory;
      while (current) {
          path.unshift(current);
          current = categories.find(c => c.id === current.parentId);
      }
      return path;
  }, [currentCategory, categories]);

  return (
    <div className="container mx-auto px-4 py-8 h-full">
      <header className="mb-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300 font-serif leading-tight">
                {currentCategory ? currentCategory.name : 'Kho tàng tri thức'}
              </h1>
              {currentCategory && (
                <p className="text-indigo-400/60 text-sm font-medium pb-1 hidden md:block">
                  — Khám phá không gian văn hóa đọc
                </p>
              )}
          </div>
          
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-[#252525]/80 backdrop-blur-md p-2 px-4 rounded-full w-fit mx-auto md:mx-0 border border-white/5 shadow-xl">
              <button 
                onClick={() => setCurrentCategoryId(null)} 
                className={`flex items-center gap-1.5 hover:text-indigo-400 transition-colors ${currentCategoryId === null ? 'text-indigo-400' : ''}`}
              >
                <Home size={14} /> Trang chủ
              </button>
              {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                      <ChevronRight size={12} className="text-gray-600" />
                      <button 
                        onClick={() => setCurrentCategoryId(crumb.id)} 
                        className={`hover:text-indigo-400 transition-colors ${currentCategoryId === crumb.id ? 'text-indigo-400' : ''}`}
                      >
                        {crumb.name}
                      </button>
                  </React.Fragment>
              ))}
          </div>
      </header>

      <div className="space-y-12">
          {subCategories.length > 0 && (
              <section className="animate-slide-up">
                  <h2 className="text-[10px] font-black text-indigo-400/80 mb-6 flex items-center gap-3 uppercase tracking-[0.3em]">
                    <div className="h-px w-8 bg-indigo-500/30"></div>
                    Danh mục nổi bật
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {subCategories.map(cat => (
                          <div 
                            key={cat.id} 
                            onClick={() => setCurrentCategoryId(cat.id)} 
                            className="relative overflow-hidden bg-gradient-to-b from-[#2d2d2d] to-[#1e1e1e] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all duration-300 group shadow-lg hover:shadow-indigo-500/10 flex flex-col items-center text-center gap-4 active:scale-95"
                          >
                              {/* Background Glow */}
                              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl group-hover:bg-indigo-600/20 transition-all duration-500"></div>
                              
                              <div className="w-16 h-16 bg-[#363636] rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xl group-hover:rotate-3">
                                <Folder size={28} />
                              </div>
                              
                              <div>
                                  <h3 className="font-bold text-gray-100 group-hover:text-white text-sm md:text-base mb-1">{cat.name}</h3>
                                  <p className="text-[10px] text-gray-500 font-medium line-clamp-1 group-hover:text-indigo-300/60">
                                    {cat.description || 'Khám phá ngay'}
                                  </p>
                              </div>

                              <div className="absolute bottom-0 left-0 h-1 w-0 bg-indigo-500 group-hover:w-full transition-all duration-500"></div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-[10px] font-black text-indigo-400/80 mb-6 flex items-center gap-3 uppercase tracking-[0.3em]">
                <div className="h-px w-8 bg-indigo-500/30"></div>
                {currentCategory ? `Tác phẩm trong ${currentCategory.name}` : 'Tác phẩm mới nhất'}
              </h2>
              
              {currentBooks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                {currentBooks.map((book) => (
                    <div key={book.id} onClick={() => onSelectBook(book)} className="group cursor-pointer flex flex-col items-center">
                    <div className="w-full aspect-[2/3] bg-[#2a2a2a] rounded-xl shadow-2xl mb-5 relative transform transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-indigo-500/20 overflow-hidden border border-white/5">
                        
                        {/* Cover image placeholder / background */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                        
                        {/* Type Indicator Icon */}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xl p-2 rounded-xl z-20 border border-white/10 shadow-lg">
                            {book.contentType === 'audio' ? <Headphones size={14} className="text-indigo-400" /> : book.contentType === 'image' ? <ImageIcon size={14} className="text-green-400" /> : <BookOpen size={14} className="text-red-400" />}
                        </div>

                        <div className="absolute inset-0 p-6 flex flex-col justify-end items-center text-center z-20">
                            <h3 className="font-serif text-sm md:text-base font-bold text-white line-clamp-3 leading-snug group-hover:text-indigo-200 transition-colors mb-1">{book.title}</h3>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{book.author}</p>
                        </div>

                        {/* Decoration line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/40 to-transparent z-20"></div>
                    </div>
                    </div>
                ))}
                </div>
              ) : (
                subCategories.length === 0 && (
                    <div className="text-center py-24 bg-[#252525]/30 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 text-gray-700">
                           <BookOpen size={40} />
                        </div>
                        <p className="text-gray-500 font-serif italic">Không gian này hiện chưa có tác phẩm nào.</p>
                        <button 
                          onClick={() => setCurrentCategoryId(null)}
                          className="mt-6 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-300"
                        >
                          Quay lại trang chủ
                        </button>
                    </div>
                )
              )}
          </section>
      </div>
    </div>
  );
};

export default Library;

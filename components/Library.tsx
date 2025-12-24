
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
    <div className="container mx-auto px-4 py-10 h-full">
      <header className="mb-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-5">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white font-serif leading-tight tracking-tight">
                {currentCategory ? currentCategory.name : 'Thư viện Tri thức'}
              </h1>
              {currentCategory && (
                <p className="text-indigo-400 text-xs font-bold pb-1.5 hidden md:block uppercase tracking-widest opacity-70">
                  — Khám phá chuyên mục
                </p>
              )}
          </div>
          
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900/60 backdrop-blur-md p-1.5 px-3.5 rounded-full w-fit mx-auto md:mx-0 border border-white/10 shadow-xl">
              <button 
                onClick={() => setCurrentCategoryId(null)} 
                className={`flex items-center gap-1.5 hover:text-indigo-400 transition-colors ${currentCategoryId === null ? 'text-indigo-400' : ''}`}
              >
                <Home size={12} /> Home
              </button>
              {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                      <ChevronRight size={8} className="text-slate-600" />
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
                  <h2 className="text-[9px] font-black text-slate-500 mb-6 flex items-center gap-3 uppercase tracking-[0.4em]">
                    <div className="h-[1px] w-10 bg-indigo-500/40"></div>
                    Chuyên mục
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {subCategories.map(cat => (
                          <div 
                            key={cat.id} 
                            onClick={() => setCurrentCategoryId(cat.id)} 
                            className="relative overflow-hidden bg-slate-900/40 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all duration-500 group shadow-lg flex flex-col items-center text-center gap-3 active:scale-95 hover:bg-slate-900/80"
                          >
                              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-xl group-hover:scale-105">
                                <Folder size={22} />
                              </div>
                              
                              <div className="relative z-10">
                                  <h3 className="font-bold text-slate-200 group-hover:text-white text-xs md:text-sm mb-0.5 transition-colors">{cat.name}</h3>
                                  <p className="text-[8px] text-slate-500 font-bold line-clamp-1 group-hover:text-indigo-300/80 transition-colors uppercase tracking-tight">
                                    {cat.description || 'Khám phá'}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-[9px] font-black text-slate-500 mb-8 flex items-center gap-3 uppercase tracking-[0.4em]">
                <div className="h-[1px] w-10 bg-indigo-500/40"></div>
                {currentCategory ? `Tác phẩm trong ${currentCategory.name}` : 'Mới cập nhật'}
              </h2>
              
              {currentBooks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8">
                {currentBooks.map((book) => (
                    <div key={book.id} onClick={() => onSelectBook(book)} className="group cursor-pointer flex flex-col items-center">
                        <div className="w-full aspect-[2/3] bg-slate-800 rounded-xl shadow-2xl mb-4 relative transform transition-all duration-700 group-hover:-translate-y-3 group-hover:shadow-indigo-500/20 overflow-hidden border border-white/5 group-hover:rotate-1">
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent z-10"></div>
                            
                            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-lg z-20 border border-white/10 shadow-xl scale-90 group-hover:scale-100 transition-transform duration-500">
                                {book.contentType === 'audio' ? <Headphones size={12} className="text-indigo-400" /> : book.contentType === 'image' ? <ImageIcon size={12} className="text-emerald-400" /> : <BookOpen size={12} className="text-rose-400" />}
                            </div>

                            <div className="absolute inset-0 p-4 flex flex-col justify-end items-center text-center z-20">
                                <h3 className="font-serif text-[13px] md:text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors mb-1.5">{book.title}</h3>
                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-80">{book.author}</p>
                            </div>

                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-indigo-900 opacity-60 z-20"></div>
                        </div>
                    </div>
                ))}
                </div>
              ) : (
                subCategories.length === 0 && (
                    <div className="text-center py-20 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center animate-pulse">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-700">
                           <BookOpen size={32} />
                        </div>
                        <p className="text-slate-500 font-serif italic text-base">Hiện chưa có tác phẩm nào tại đây.</p>
                        <button 
                          onClick={() => setCurrentCategoryId(null)}
                          className="mt-6 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors"
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

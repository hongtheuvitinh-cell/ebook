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
      <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 font-serif text-center">
             {currentCategory ? currentCategory.name : 'Thư Viện Sách'}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg w-fit mx-auto md:mx-0 border border-gray-700">
              <button onClick={() => setCurrentCategoryId(null)} className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${currentCategoryId === null ? 'text-indigo-400 font-bold' : ''}`}><Home size={16} /> Trang chủ</button>
              {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                      <ChevronRight size={14} className="text-gray-600" />
                      <button onClick={() => setCurrentCategoryId(crumb.id)} className={`hover:text-indigo-400 transition-colors ${currentCategoryId === crumb.id ? 'text-indigo-400 font-bold' : ''}`}>{crumb.name}</button>
                  </React.Fragment>
              ))}
          </div>
      </header>

      <div className="space-y-10">
          {subCategories.length > 0 && (
              <section>
                  <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2"><FolderOpen size={20} /> Danh mục</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {subCategories.map(cat => (
                          <div key={cat.id} onClick={() => setCurrentCategoryId(cat.id)} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-indigo-500 hover:bg-gray-750 cursor-pointer transition-all group flex flex-col items-center text-center gap-3">
                              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Folder size={24} /></div>
                              <div>
                                  <h3 className="font-medium text-gray-200 group-hover:text-white">{cat.name}</h3>
                                  {cat.description && <p className="text-xs text-gray-500 mt-1">{cat.description}</p>}
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          {currentBooks.length > 0 ? (
            <section>
                <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2"><BookOpen size={20} /> Sách ({currentBooks.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {currentBooks.map((book) => (
                    <div key={book.id} onClick={() => onSelectBook(book)} className="group cursor-pointer flex flex-col items-center">
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-indigo-900 to-gray-800 rounded-r-lg rounded-l-sm shadow-xl mb-4 relative transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl border-l-4 border-l-gray-700 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10 z-10"></div>
                        
                        {/* Type Indicator Icon */}
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full z-20 border border-white/10">
                            {book.contentType === 'audio' ? <Headphones size={14} className="text-indigo-400" /> : book.contentType === 'image' ? <ImageIcon size={14} className="text-green-400" /> : <BookOpen size={14} className="text-red-400" />}
                        </div>

                        <div className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center">
                            {book.contentType === 'audio' ? <Headphones size={32} className="text-indigo-400/50 mb-2" /> : <BookOpen size={32} className="text-indigo-400/50 mb-2" />}
                            <h3 className="font-serif text-sm md:text-base font-bold text-gray-200 line-clamp-3 leading-tight">{book.title}</h3>
                            <p className="text-[10px] text-gray-400 mt-2 line-clamp-1 uppercase tracking-tighter">{book.author}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-indigo-500/10 transition-colors"></div>
                    </div>
                    <div className="text-center w-full px-2">
                        <h3 className="text-xs font-semibold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">{book.title}</h3>
                    </div>
                    </div>
                ))}
                </div>
            </section>
          ) : (
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

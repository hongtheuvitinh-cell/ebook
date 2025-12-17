import React, { useState, useEffect } from 'react';
import { Book, Category } from './types';
import BookReader from './components/BookReader';
import Library from './components/Library';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, User, LogOut, Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  // --- STATE ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // view: 'library' | 'reader' | 'admin'
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'admin'>('library');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (catError) throw catError;

      const mappedCats: Category[] = (catData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        parentId: c.parent_id // Map snake_case from DB to camelCase
      }));
      setCategories(mappedCats);

      // 2. Fetch Books with Chapters
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`
          *,
          chapters (
            id, title, page_number, url
          )
        `)
        .order('upload_date', { ascending: false });

      if (bookError) throw bookError;

      const mappedBooks: Book[] = (bookData || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        url: b.url,
        coverUrl: b.cover_url,
        categoryId: b.category_id, // Map snake_case
        uploadDate: b.upload_date,
        isVisible: b.is_visible,
        chapters: (b.chapters || []).map((ch: any) => ({
          id: ch.id,
          title: ch.title,
          pageNumber: ch.page_number,
          url: ch.url
        })).sort((a: any, b: any) => a.pageNumber - b.pageNumber) // Sort chapters by page
      }));
      setBooks(mappedBooks);

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Không thể tải dữ liệu từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLERS ---
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reader');
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    setCurrentView('library');
  };

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 size={48} className="animate-spin text-indigo-500" />
        <p className="text-gray-400">Đang tải thư viện sách...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans flex flex-col">
      
      {/* 1. THANH ĐIỀU HƯỚNG (HEADER) */}
      {currentView !== 'reader' && (
        <nav className="h-16 border-b border-gray-800 bg-[#252525] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
                <span className="text-indigo-500">Gemini</span>
                <span>E-Book</span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentView('library')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'library' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <User size={16} />
                    <span>Người đọc</span>
                </button>
                <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'admin' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                    <ShieldCheck size={16} />
                    <span>Quản trị (Admin)</span>
                </button>
            </div>
        </nav>
      )}

      {/* 2. NỘI DUNG CHÍNH */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <AdminDashboard 
                    books={books} 
                    setBooks={setBooks} 
                    categories={categories}
                    setCategories={setCategories}
                    onRefresh={fetchData} // Pass refresh trigger
                />
            </div>
        )}

        {/* VIEW: USER LIBRARY */}
        {currentView === 'library' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <Library 
                    books={books.filter(b => b.isVisible)} 
                    categories={categories}
                    onSelectBook={handleSelectBook} 
                />
            </div>
        )}

        {/* VIEW: READER */}
        {currentView === 'reader' && selectedBook && (
            <div className="h-full w-full relative">
                <button 
                    onClick={handleBackToLibrary}
                    className="absolute top-4 left-20 z-50 bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all"
                >
                    <LogOut size={14} />
                    Thoát
                </button>
                <BookReader book={selectedBook} />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;

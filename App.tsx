import React, { useState, useEffect } from 'react';
import { Book, Category } from './types';
import BookReader from './components/BookReader';
import Library from './components/Library';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { ShieldCheck, User, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  // --- STATE ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auth State (Real Supabase Session)
  const [session, setSession] = useState<any>(null);

  // view: 'library' | 'reader' | 'admin'
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'admin'>('library');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // --- INITIALIZE & FETCH DATA ---
  useEffect(() => {
    // 1. Check Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for Auth Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Fetch Data
    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setConnectionError(null);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setConnectionError("Chưa cấu hình kết nối Database. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào biến môi trường.");
      return;
    }

    try {
      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (catError) throw catError;

      const mappedCats: Category[] = (catData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        parentId: c.parent_id
      }));
      setCategories(mappedCats);

      // Fetch Books
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`*, chapters (id, title, page_number, url)`)
        .order('upload_date', { ascending: false });

      if (bookError) throw bookError;

      const mappedBooks: Book[] = (bookData || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        url: b.url,
        coverUrl: b.cover_url,
        categoryId: b.category_id,
        uploadDate: b.upload_date,
        isVisible: b.is_visible,
        chapters: (b.chapters || []).map((ch: any) => ({
          id: ch.id,
          title: ch.title,
          pageNumber: ch.page_number,
          url: ch.url
        })).sort((a: any, b: any) => a.pageNumber - b.pageNumber)
      }));
      setBooks(mappedBooks);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      setConnectionError(error.message || "Không thể tải dữ liệu từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reader');
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    setCurrentView('library');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('library');
  };

  // --- RENDER: LOADING ---
  if (isLoading && !session && !connectionError) {
    // Chỉ hiện loading full screen khi chưa có dữ liệu lần đầu
    return (
      <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 size={48} className="animate-spin text-indigo-500" />
        <p className="text-gray-400">Đang tải thư viện...</p>
      </div>
    );
  }

  // --- RENDER: ERROR STATE ---
  if (connectionError) {
    return (
      <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white p-6">
        <div className="bg-gray-800 p-8 rounded-xl border border-red-500/50 max-w-lg w-full text-center shadow-2xl">
           <AlertTriangle size={64} className="mx-auto text-red-500 mb-6" />
           <h2 className="text-2xl font-bold mb-4 text-red-400">Lỗi Kết Nối</h2>
           <p className="text-gray-300 mb-6 leading-relaxed">{connectionError}</p>
           <button onClick={fetchData} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
             Thử lại
           </button>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans flex flex-col">
      
      {/* 1. HEADER */}
      {currentView !== 'reader' && (
        <nav className="h-16 border-b border-gray-800 bg-[#252525] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide cursor-pointer" onClick={() => setCurrentView('library')}>
                <span className="text-indigo-500">Kho tàng tri thức</span>
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
                    <span>Quản trị</span>
                </button>

                {/* Nút Logout (chỉ hiện khi có session) */}
                {session && (
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-900/20 text-red-400 border border-red-500/20 hover:bg-red-900/40 hover:text-red-300 transition-colors ml-2"
                        title={`Đăng xuất (${session.user.email})`}
                    >
                        <LogOut size={16} />
                    </button>
                )}
            </div>
        </nav>
      )}

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* ADMIN VIEW */}
        {currentView === 'admin' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                {session ? (
                    <AdminDashboard 
                        books={books} 
                        setBooks={setBooks} 
                        categories={categories}
                        setCategories={setCategories}
                        onRefresh={fetchData}
                    />
                ) : (
                    <AdminLogin /> // Không cần props onLoginSuccess nữa, App tự detect session
                )}
            </div>
        )}

        {/* LIBRARY VIEW */}
        {currentView === 'library' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <Library 
                    books={books.filter(b => b.isVisible)} 
                    categories={categories}
                    onSelectBook={handleSelectBook} 
                />
            </div>
        )}

        {/* READER VIEW */}
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

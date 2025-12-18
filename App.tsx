import React, { useState, useEffect, useRef } from 'react';
import { Book, Category } from './types';
import BookReader from './components/BookReader';
import Library from './components/Library';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { ShieldCheck, User, LogOut, Loader2, AlertTriangle, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const hasIncrementedRef = useRef(false);
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'admin'>('library');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchData();
    handleVisitorCounter();
    return () => subscription.unsubscribe();
  }, []);

  const handleVisitorCounter = async () => {
    if (!isSupabaseConfigured || hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;
    try {
      const { data, error } = await supabase.rpc('increment_visit');
      if (error) {
        const { data: stats } = await supabase.from('site_stats').select('val').eq('id', 'total_visits').single();
        if (stats) setVisitorCount(stats.val);
      } else setVisitorCount(data as number);
    } catch (err) {}
  };

  const fetchData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured) { setIsLoading(false); return; }
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      setCategories((catData || []).map((c: any) => ({ id: c.id, name: c.name, description: c.description, parentId: c.parent_id })));

      const { data: bookData } = await supabase.from('books').select(`*, chapters (id, title, page_number, url)`).order('upload_date', { ascending: false });
      setBooks((bookData || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        url: b.url,
        contentType: (b.content_type || 'pdf') as 'pdf' | 'image' | 'audio',
        coverUrl: b.cover_url,
        categoryId: b.category_id,
        uploadDate: b.upload_date,
        isVisible: b.is_visible,
        chapters: (b.chapters || []).map((ch: any) => ({ id: ch.id, title: ch.title, pageNumber: ch.page_number, url: ch.url })).sort((a: any, b: any) => a.pageNumber - b.pageNumber)
      })));
    } catch (error: any) { setConnectionError(error.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans flex flex-col">
      {currentView !== 'reader' && (
        <nav className="h-16 border-b border-gray-800 bg-[#252525] flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide cursor-pointer" onClick={() => setCurrentView('library')}>
                <span className="text-indigo-500">Kho tàng tri thức</span>
                <span>E-Book</span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setCurrentView('library')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'library' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}><User size={16} /> <span>Người đọc</span></button>
                <button onClick={() => setCurrentView('admin')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'admin' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}><ShieldCheck size={16} /> <span>Quản trị</span></button>
                {session && <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-900/20 text-red-400 border border-red-500/20 hover:bg-red-900/40 ml-2"><LogOut size={16} /></button>}
            </div>
        </nav>
      )}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {currentView === 'admin' && ( <div className="h-full overflow-y-auto custom-scrollbar">{session ? <AdminDashboard books={books} setBooks={setBooks} categories={categories} setCategories={setCategories} onRefresh={fetchData} /> : <AdminLogin />}</div> )}
        {currentView === 'library' && ( <div className="h-full overflow-y-auto custom-scrollbar pb-12"><Library books={books.filter(b => b.isVisible)} categories={categories} onSelectBook={b => { setSelectedBook(b); setCurrentView('reader'); }} /></div> )}
        {currentView === 'reader' && selectedBook && (
            <div className="h-full w-full relative">
                <button onClick={() => { setSelectedBook(null); setCurrentView('library'); }} className="absolute top-4 left-20 z-50 bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all"><LogOut size={14} /> Thoát</button>
                <BookReader book={selectedBook} />
            </div>
        )}
        {currentView !== 'reader' && (
            <footer className="h-10 bg-[#151515] border-t border-gray-800 flex items-center justify-between px-6 text-xs text-gray-500 shrink-0 select-none">
                <div>&copy; 2024 Kho tàng tri thức E-Book.</div>
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700"><Users size={12} className="text-indigo-400" /><span className="text-gray-300 font-mono">{visitorCount.toLocaleString()}</span></div>
            </footer>
        )}
      </main>
    </div>
  );
};

export default App;

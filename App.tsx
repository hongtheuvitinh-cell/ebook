
import React, { useState, useEffect, useRef } from 'react';
import { Book, Category } from './types';
import BookReader from './components/BookReader';
import Library from './components/Library';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { ShieldCheck, User, LogOut, Loader2, AlertTriangle, Users, Key } from 'lucide-react';
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

  // Check for API key presence if needed by platform
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchData();
    handleVisitorCounter();
    
    // Check if we need to show API key selection (specific to some interactive environments)
    if (window.aistudio) {
        window.aistudio.hasSelectedApiKey().then(setHasApiKey);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleVisitorCounter = async () => {
    if (!isSupabaseConfigured || hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;
    
    try {
      await supabase.rpc('increment_visit');
      const { data } = await supabase
        .from('site_stats')
        .select('val')
        .eq('id', 'total_visits')
        .single();

      if (data) {
        setVisitorCount(Number(data.val));
      }
    } catch (err) {
      console.error("Visitor error:", err);
      const { data } = await supabase.from('site_stats').select('val').eq('id', 'total_visits').single();
      if (data) setVisitorCount(Number(data.val));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured) { setIsLoading(false); return; }
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      setCategories((catData || []).map((c: any) => ({ id: c.id, name: c.name, description: c.description, parentId: c.parent_id })));

      const { data: bookData } = await supabase.from('books').select(`*, chapters (id, title, page_number, url, parent_id)`).order('upload_date', { ascending: false });
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
        chapters: (b.chapters || []).map((ch: any) => ({ 
          id: ch.id, 
          title: ch.title, 
          pageNumber: ch.page_number, 
          url: ch.url,
          parentId: ch.parent_id 
        })).sort((a: any, b: any) => a.pageNumber - b.pageNumber)
      })));
    } catch (error: any) { setConnectionError(error.message); } finally { setIsLoading(false); }
  };

  const handleOpenKeySelector = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
      }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#020617] text-slate-100 font-sans flex flex-col">
      {currentView !== 'reader' && (
        <nav className="h-14 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight cursor-pointer" onClick={() => setCurrentView('library')}>
                <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <User size={16} className="text-white" />
                </div>
                <span className="text-white">Kho tàng</span>
                <span className="text-indigo-400">E-Book</span>
            </div>
            <div className="flex gap-1.5">
                {!hasApiKey && window.aistudio && (
                    <button 
                        onClick={handleOpenKeySelector}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all mr-2"
                    >
                        <Key size={14} /> <span>Chọn API Key</span>
                    </button>
                )}
                <button onClick={() => setCurrentView('library')} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentView === 'library' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Người đọc</button>
                <button onClick={() => setCurrentView('admin')} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <ShieldCheck size={14} /> <span>Quản trị</span>
                </button>
                {session && <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-red-900/10 text-red-400 border border-red-500/20 hover:bg-red-900/20 ml-2 transition-all"><LogOut size={14} /></button>}
            </div>
        </nav>
      )}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {currentView === 'admin' && ( <div className="h-full overflow-y-auto custom-scrollbar">{session ? <AdminDashboard books={books} setBooks={setBooks} categories={categories} setCategories={setCategories} onRefresh={fetchData} /> : <AdminLogin />}</div> )}
        {currentView === 'library' && ( <div className="h-full overflow-y-auto custom-scrollbar pb-12"><Library books={books.filter(b => b.isVisible)} categories={categories} onSelectBook={b => { setSelectedBook(b); setCurrentView('reader'); }} /></div> )}
        {currentView === 'reader' && selectedBook && (
            <div className="h-full w-full relative">
                <div className="absolute top-4 left-20 z-50 flex gap-2">
                    <button onClick={() => { setSelectedBook(null); setCurrentView('library'); }} className="bg-slate-900/60 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all shadow-xl group">
                    <LogOut size={12} className="group-hover:-translate-x-1 transition-transform" /> Quay lại
                    </button>
                    {!hasApiKey && window.aistudio && (
                        <button onClick={handleOpenKeySelector} className="bg-amber-600/90 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all shadow-xl">
                            <Key size={12} /> API Key
                        </button>
                    )}
                </div>
                <BookReader book={selectedBook} />
            </div>
        )}
        {currentView !== 'reader' && (
            <footer className="h-9 bg-slate-950 border-t border-white/5 flex items-center justify-between px-6 text-[9px] text-slate-500 shrink-0 select-none">
                <div className="font-medium tracking-wide uppercase opacity-70">&copy; 2024 Kho tàng tri thức E-Book • Digital Library Pro</div>
                <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-white/5 shadow-inner">
                   <Users size={10} className="text-indigo-400" />
                   <span className="text-slate-300 font-mono font-bold tracking-tighter">{visitorCount.toLocaleString()}</span>
                </div>
            </footer>
        )}
      </main>
    </div>
  );
};

export default App;

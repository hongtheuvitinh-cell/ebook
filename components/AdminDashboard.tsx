
import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ books, setBooks, categories, setCategories, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'categories'>('books');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [editingChaptersBookId, setEditingChaptersBookId] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState({ title: '', pageNumber: 1, url: '', parentId: '' });

  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' as any });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

  // --- HANDLERS ---
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.url) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('books').insert({
        title: newBook.title, author: newBook.author || 'Chưa rõ',
        url: newBook.url, category_id: newBook.categoryId || null,
        content_type: newBook.contentType, is_visible: true
      });
      if (error) throw error;
      setNewBook({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' });
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parentId || null
      });
      if (error) throw error;
      setNewCategory({ name: '', description: '', parentId: '' });
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm("Xóa danh mục này sẽ ảnh hưởng đến các sách thuộc danh mục đó. Tiếp tục?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddChapter = async (book: Book) => {
    if (!newChapter.title) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        book_id: book.id,
        title: newChapter.title,
        page_number: newChapter.pageNumber || (book.chapters.length + 1),
        url: newChapter.url || null,
        parent_id: newChapter.parentId || null
      });
      if (error) throw error;
      setNewChapter({ title: '', pageNumber: book.chapters.length + 2, url: '', parentId: '' });
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa cuốn sách này?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('book_id', id);
      await supabase.from('books').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const deleteChapter = async (id: string) => {
    if (!window.confirm("Xóa chương/bài này?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const renderAdminChapters = (chapters: Chapter[], parentId: string | null = null, level = 0) => {
    const filtered = chapters.filter(c => c.parentId === parentId).sort((a, b) => a.pageNumber - b.pageNumber);
    return filtered.map(ch => (
      <React.Fragment key={ch.id}>
        <div className="flex items-center justify-between bg-gray-900/40 p-3 rounded-xl border border-white/5 group hover:border-indigo-500/30 transition-all mb-2" style={{ marginLeft: `${level * 28}px` }}>
            <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner ${level === 0 ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
                    {ch.pageNumber}
                </div>
                <div>
                    <span className={`text-sm ${level === 0 ? 'font-black text-white' : 'text-gray-400 font-medium'}`}>{ch.title}</span>
                    {ch.url && <p className="text-[9px] text-indigo-500/50 truncate max-w-[250px] font-mono mt-0.5">{ch.url}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {ch.url && <ExternalLink size={12} className="text-gray-600" />}
                <button onClick={() => deleteChapter(ch.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14}/></button>
            </div>
        </div>
        {renderAdminChapters(chapters, ch.id, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white font-serif tracking-tight">Hệ Thống Quản Trị</h1>
            <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Kho tàng tri thức điện tử</p>
          </div>
        </div>
        <div className="flex bg-[#2a2a2a] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                <BookOpen size={14} /> SÁCH & CHƯƠNG
            </button>
            <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                <LayoutGrid size={14} /> DANH MỤC
            </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#2a2a2a] p-10 rounded-[2.5rem] border border-indigo-500/30 flex flex-col items-center gap-4 shadow-2xl">
                <div className="relative">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                    <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse"></div>
                </div>
                <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Đang đồng bộ hóa...</span>
            </div>
        </div>
      )}

      {errorMessage && (
          <div className="mb-10 p-5 bg-red-900/20 border-l-4 border-red-500 rounded-2xl text-red-200 text-xs flex items-center gap-4 animate-slide-up shadow-xl">
              <AlertCircle size={20} className="text-red-500" />
              <div className="flex-1">
                  <p className="font-black uppercase tracking-widest mb-0.5">Thông báo lỗi</p>
                  <p className="opacity-80 font-medium">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">X</button>
          </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM THÊM SÁCH MỚI */}
          <div className="bg-[#2a2a2a] p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] group-hover:bg-indigo-600/10 transition-all"></div>
            
            <h2 className="text-[10px] font-black mb-8 uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
                <Plus size={16} /> Nhập sách mới vào kho
                <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tiêu đề chính</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white placeholder:text-gray-800 shadow-inner" placeholder="Tên sách đầy đủ..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tên tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white placeholder:text-gray-800 shadow-inner" placeholder="Nhóm tác giả hoặc cá nhân..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Danh mục lưu trữ</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white shadow-inner">
                  <option value="">-- Chọn phân loại --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Liên kết tài nguyên (URL PDF/Audio)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white placeholder:text-gray-800 shadow-inner" placeholder="Link từ Dropbox/G Drive/Server..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Chế độ đọc</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white shadow-inner">
                  <option value="pdf">Sách PDF (Lật trang)</option>
                  <option value="image">Sách Ảnh (Từng trang)</option>
                  <option value="audio">Sách Nói (Nghe)</option>
                </select>
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-xs tracking-[0.3em] shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3">
                <BookPlus size={18} /> XÁC NHẬN LƯU SÁCH
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-indigo-400/50 text-[10px] font-black uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                 Tủ sách thư viện ({books.length})
                 <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.length === 0 ? (
                <div className="py-20 bg-[#252525]/30 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-700">
                    <BookOpen size={48} className="mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Thư viện đang trống</p>
                </div>
            ) : books.map(book => (
              <div key={book.id} className="bg-[#252525] border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-indigo-500/30 group">
                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="w-16 h-20 bg-[#1a1a1a] rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                      {book.contentType === 'pdf' ? <PdfIcon size={28}/> : book.contentType === 'image' ? <ImageIcon size={28}/> : <Headphones size={28}/>}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-black text-xl text-white group-hover:text-indigo-200 transition-colors truncate">{book.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{book.author}</span>
                          <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-600/5 px-2 py-0.5 rounded-lg border border-indigo-500/10">{book.chapters.length} mục</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button 
                        onClick={() => {
                            setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                            setNewChapter({ title: '', pageNumber: book.chapters.length + 1, url: '', parentId: '' });
                        }} 
                        className={`px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-widest transition-all duration-300 border flex items-center gap-2 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white hover:bg-gray-700'}`}
                    >
                        {editingChaptersBookId === book.id ? <><ChevronDown size={14}/> ĐÓNG TRÌNH QUẢN LÝ</> : <><ListPlus size={14}/> QUẢN LÝ MỤC LỤC & BÀI VIẾT</>}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-4 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all shadow-xl" title="Gỡ bỏ sách"><Trash2 size={22}/></button>
                  </div>
                </div>

                {/* PHẦN QUẢN LÝ MỤC LỤC - CHI TIẾT */}
                {editingChaptersBookId === book.id && (
                  <div className="p-8 bg-[#1e1e1e] border-t border-white/5 animate-slide-up relative">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                        <ListPlus size={120} />
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Plus size={18} />
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Cấu trúc nội dung chi tiết</h4>
                    </div>

                    {/* FORM THÊM CHƯƠNG/BÀI MỚI (PHẢI NỔI BẬT) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 bg-[#2a2a2a] p-8 rounded-[2rem] border-2 border-indigo-500/20 shadow-2xl relative z-10">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-indigo-400/80 uppercase ml-2 tracking-widest">Tên bài / Chương / Mục</label>
                            <input 
                                type="text" 
                                placeholder="VD: Chương I: Đại cương..." 
                                value={newChapter.title} 
                                onChange={e => setNewChapter({...newChapter, title: e.target.value})} 
                                className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 text-white shadow-inner" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-400/80 uppercase ml-2 tracking-widest">Số trang / Thứ tự</label>
                            <input 
                                type="number" 
                                placeholder="STT" 
                                value={newChapter.pageNumber} 
                                onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value) || 1})} 
                                className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 text-center text-white font-mono shadow-inner" 
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={() => handleAddChapter(book)} 
                                className="w-full h-[54px] bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-[0_10px_25px_rgba(79,70,229,0.3)] active:scale-95"
                            >
                                <Plus size={18}/> THÊM VÀO SƠ ĐỒ
                            </button>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-indigo-400/80 uppercase ml-2 tracking-widest">Nằm trong (Cấp cha)</label>
                            <select 
                                value={newChapter.parentId} 
                                onChange={e => setNewChapter({...newChapter, parentId: e.target.value})} 
                                className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 text-white shadow-inner"
                            >
                                <option value="">-- Là mục chính (Cấp 1) --</option>
                                {book.chapters.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-indigo-400/80 uppercase ml-2 tracking-widest">URL Tài liệu riêng (Nếu bài này ở file khác)</label>
                            <input 
                                type="text" 
                                placeholder="https://... (Bỏ trống nếu dùng chung link sách)" 
                                value={newChapter.url} 
                                onChange={e => setNewChapter({...newChapter, url: e.target.value})} 
                                className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 text-white shadow-inner" 
                            />
                        </div>
                    </div>

                    {/* DANH SÁCH BÀI ĐÃ THÊM */}
                    <div className="space-y-1 bg-[#151515] p-6 rounded-[2rem] border border-white/5 max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                        <div className="px-4 py-2 border-b border-white/5 mb-4">
                            <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Xem trước sơ đồ mục lục</h5>
                        </div>
                        {book.chapters.length === 0 ? (
                            <div className="text-center py-20 text-gray-800 italic text-[10px] uppercase tracking-[0.3em] font-black">
                                <List className="mx-auto mb-4 opacity-10" size={40} />
                                Chưa có sơ đồ nội dung
                            </div>
                        ) : renderAdminChapters(book.chapters)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-[#2a2a2a] p-8 rounded-[2.5rem] border-2 border-indigo-500/20 shadow-2xl sticky top-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Layers size={100} />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-10 relative z-10">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-600/30">
                            <FolderPlus size={20} />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Quản lý danh mục</h2>
                    </div>
                    
                    <form onSubmit={handleAddCategory} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-300/60 uppercase ml-2 tracking-widest">Tên phân loại</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white placeholder:text-gray-800 shadow-inner" placeholder="VD: Lịch sử, IT, Văn học..." required />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-300/60 uppercase ml-2 tracking-widest">Nhánh cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white shadow-inner">
                                <option value="">-- Là danh mục chính --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-300/60 uppercase ml-2 tracking-widest">Giới thiệu thể loại</label>
                            <textarea value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all h-32 resize-none text-white placeholder:text-gray-800 shadow-inner" placeholder="Mô tả tóm tắt..."></textarea>
                        </div>
                        
                        <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.4em] shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3">
                            <FolderPlus size={18} /> CẬP NHẬT PHÂN LOẠI
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-indigo-400/50 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                        Sơ đồ phân loại hiện hữu
                        <div className="h-px w-20 bg-white/5"></div>
                    </h3>
                </div>

                {categories.length === 0 ? (
                    <div className="py-24 bg-[#252525]/40 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-800">
                        <Folder size={64} className="mb-6 opacity-5" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Dữ liệu phân loại trống</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categories.map(cat => {
                            const parent = categories.find(p => p.id === cat.parentId);
                            const bookCount = books.filter(b => b.categoryId === cat.id).length;
                            
                            return (
                                <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-7 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/50 transition-all duration-500 group shadow-2xl relative overflow-hidden">
                                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors"></div>
                                    
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="p-3.5 bg-indigo-600/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                            <Folder size={24} />
                                        </div>
                                        <button onClick={() => deleteCategory(cat.id)} className="p-3 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <h4 className="font-black text-white text-xl mb-1.5 group-hover:text-indigo-200 transition-colors">{cat.name}</h4>
                                        {parent ? (
                                            <div className="flex items-center gap-2 mb-3">
                                                <ChevronRight size={12} className="text-indigo-500" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60">Nhánh của {parent.name}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mb-3 opacity-40">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Gốc hệ thống</span>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-500 line-clamp-2 h-10 leading-relaxed mb-6 group-hover:text-gray-300 transition-colors">
                                            {cat.description || 'Hệ thống chưa có mô tả cho mục này.'}
                                        </p>
                                        
                                        <div className="flex items-center justify-between pt-5 border-t border-white/5 mt-2">
                                            <div className="flex items-center gap-2">
                                                <BookOpen size={14} className="text-indigo-500" />
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{bookCount} Tác phẩm</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-black text-indigo-500 border border-white/5">
                                                {cat.name.charAt(0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

// Icon bổ trợ
const ShieldCheck = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
);

const BookPlus = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 10h6"/><path d="M12 7v6"/>
    </svg>
);

export default AdminDashboard;

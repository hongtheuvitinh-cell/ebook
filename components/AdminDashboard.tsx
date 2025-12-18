
import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, Subtitles
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
  const [selectedParentTitle, setSelectedParentTitle] = useState<string | null>(null);

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
      // Giữ nguyên parentId nếu người dùng đang thêm liên tiếp vào cùng một chương
      setNewChapter(prev => ({ ...prev, title: '', pageNumber: prev.pageNumber + 1 }));
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
        <div className={`flex items-center justify-between p-3 rounded-xl border group transition-all mb-2 ${level === 0 ? 'bg-indigo-600/5 border-indigo-500/10' : 'bg-gray-900/40 border-white/5'}`} style={{ marginLeft: `${level * 32}px` }}>
            <div className="flex items-center gap-3">
                {level > 0 && <CornerDownRight size={14} className="text-gray-700" />}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                    {ch.pageNumber}
                </div>
                <div>
                    <span className={`text-sm ${level === 0 ? 'font-black text-white uppercase tracking-wide' : 'text-gray-400 font-medium italic'}`}>{ch.title}</span>
                    {ch.url && <p className="text-[9px] text-indigo-500/50 truncate max-w-[200px] font-mono">{ch.url}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {level === 0 && (
                    <button 
                        onClick={() => {
                            setNewChapter({ ...newChapter, parentId: ch.id });
                            setSelectedParentTitle(ch.title);
                            window.scrollTo({ top: 0, behavior: 'smooth' }); // Cuộn lên form nếu cần
                        }} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all"
                    >
                        <Plus size={12} /> THÊM BÀI CON
                    </button>
                )}
                <button onClick={() => deleteChapter(ch.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14}/></button>
            </div>
        </div>
        {renderAdminChapters(chapters, ch.id, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
             <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white font-serif tracking-tight">Quản Trị Hệ Thống</h1>
            <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Xây dựng cây tri thức số</p>
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
                <Loader2 className="animate-spin text-indigo-500" size={48} />
                <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Đang lưu thay đổi...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM THÊM SÁCH */}
          <div className="bg-[#2a2a2a] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
            <h2 className="text-[10px] font-black mb-8 uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
                <Plus size={16} /> Nhập sách mới
                <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Tiêu đề</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="Tên sách..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="Tên tác giả..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">URL Sách</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="https://..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Định dạng</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white">
                  <option value="pdf">PDF (Mặc định)</option>
                  <option value="image">Hình ảnh</option>
                  <option value="audio">Âm thanh</option>
                </select>
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-xs tracking-[0.3em] shadow-xl">
                LƯU TÁC PHẨM
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-indigo-400/50 text-[10px] font-black uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                 Thư viện quản lý
                 <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.map(book => (
              <div key={book.id} className="bg-[#252525] border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-indigo-500/20 group">
                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="w-16 h-20 bg-[#1a1a1a] rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner">
                      {book.contentType === 'pdf' ? <PdfIcon size={28}/> : book.contentType === 'image' ? <ImageIcon size={28}/> : <Headphones size={28}/>}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-white truncate max-w-[300px]">{book.title}</h3>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{book.author} • {book.chapters.length} mục</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button 
                        onClick={() => {
                            setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                            setNewChapter({ title: '', pageNumber: book.chapters.length + 1, url: '', parentId: '' });
                            setSelectedParentTitle(null);
                        }} 
                        className={`px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-widest transition-all border flex items-center gap-2 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white hover:bg-gray-700'}`}
                    >
                        {editingChaptersBookId === book.id ? 'ĐÓNG LẠI' : 'QUẢN LÝ MỤC LỤC'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-4 text-gray-700 hover:text-red-400 transition-all"><Trash2 size={22}/></button>
                  </div>
                </div>

                {/* CHI TIẾT MỤC LỤC */}
                {editingChaptersBookId === book.id && (
                  <div className="p-8 bg-[#1e1e1e] border-t border-white/5 animate-slide-up">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2rem] mb-10 shadow-inner">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus size={16} /> {selectedParentTitle ? `Thêm bài vào: ${selectedParentTitle}` : 'Thêm Chương / Bài mới'}
                            </h4>
                            {selectedParentTitle && (
                                <button 
                                    onClick={() => {
                                        setNewChapter({ ...newChapter, parentId: '' });
                                        setSelectedParentTitle(null);
                                    }} 
                                    className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-tighter"
                                >
                                    [Hủy chọn mục cha]
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tiêu đề mục lục</label>
                                <input type="text" placeholder="Ví dụ: Chương 1 hoặc Bài 1..." value={newChapter.title} onChange={e => setNewChapter({...newChapter, title: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Số trang / Thứ tự</label>
                                <input type="number" value={newChapter.pageNumber} onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value) || 1})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white text-center focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => handleAddChapter(book)} className="w-full h-[54px] bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg">
                                    THÊM VÀO CÂY
                                </button>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Nằm trong (Mục cha)</label>
                                <select value={newChapter.parentId} onChange={e => {
                                    setNewChapter({...newChapter, parentId: e.target.value});
                                    const parent = book.chapters.find(ch => ch.id === e.target.value);
                                    setSelectedParentTitle(parent ? parent.title : null);
                                }} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none">
                                    <option value="">-- Là mục chính (Cấp 1) --</option>
                                    {book.chapters.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Link riêng (Nếu có)</label>
                                <input type="text" placeholder="https://... (Bỏ trống nếu dùng chung link sách)" value={newChapter.url} onChange={e => setNewChapter({...newChapter, url: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151515] p-6 rounded-[2rem] border border-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <div className="px-4 py-2 border-b border-white/5 mb-6 flex items-center justify-between">
                            <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Cấu trúc phân cấp hiện tại</h5>
                            <span className="text-[9px] text-gray-600 italic">Mẹo: Nhấn "Thêm bài con" để tự động chọn cha</span>
                        </div>
                        {book.chapters.length === 0 ? (
                            <div className="text-center py-20 text-gray-800 font-black uppercase tracking-widest text-[10px]">Chưa có dữ liệu mục lục</div>
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
                <div className="bg-[#2a2a2a] p-8 rounded-[2.5rem] border-2 border-indigo-500/20 shadow-2xl sticky top-8">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-8 flex items-center gap-3">
                        <FolderPlus size={20} className="text-indigo-400" /> Quản lý danh mục
                    </h2>
                    <form onSubmit={handleAddCategory} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tên danh mục</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none" placeholder="Văn học, IT, Ngoại ngữ..." required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Mục cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none">
                                <option value="">-- Danh mục gốc --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.3em] shadow-xl">
                            CẬP NHẬT
                        </button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-7 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3.5 bg-indigo-600/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Folder size={24} />
                            </div>
                            <button onClick={() => deleteCategory(cat.id)} className="p-3 text-gray-700 hover:text-red-400 transition-all"><Trash2 size={18} /></button>
                        </div>
                        <h4 className="font-black text-white text-xl mb-1">{cat.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hệ thống phân loại tri thức</p>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;



import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid
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
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
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
        <div className="flex items-center justify-between bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 group hover:border-indigo-500/50 transition-all mb-1" style={{ marginLeft: `${level * 24}px` }}>
            <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${level === 0 ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-700 text-gray-500'}`}>
                    {ch.pageNumber}
                </div>
                <div>
                    <span className={`text-sm ${level === 0 ? 'font-bold text-white' : 'text-gray-300'}`}>{ch.title}</span>
                    {ch.url && <p className="text-[9px] text-gray-500 truncate max-w-[200px]">{ch.url}</p>}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {ch.url && <ExternalLink size={12} className="text-gray-600 mr-2" />}
                <button onClick={() => deleteChapter(ch.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"><Trash2 size={14}/></button>
            </div>
        </div>
        {renderAdminChapters(chapters, ch.id, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-white font-serif tracking-tight">Quản Trị Hệ Thống</h1>
          <p className="text-gray-500 text-xs font-medium mt-1">Quản lý kho sách, mục lục và phân cấp nội dung</p>
        </div>
        <div className="flex bg-[#252525] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400 hover:text-white'}`}>
                <BookOpen size={14} /> Sách & Chương
            </button>
            <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-400 hover:text-white'}`}>
                <LayoutGrid size={14} /> Danh Mục
            </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#2a2a2a] p-8 rounded-3xl border border-indigo-500/30 flex flex-col items-center gap-4 animate-pulse shadow-2xl">
                <Loader2 className="animate-spin text-indigo-400" size={40} />
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Đang xử lý dữ liệu...</span>
            </div>
        </div>
      )}

      {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-3">
              <AlertCircle size={18} />
              {errorMessage}
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-white font-bold">X</button>
          </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-10">
          <div className="bg-[#2a2a2a] p-8 rounded-3xl border border-white/5 shadow-2xl">
            <h2 className="text-[10px] font-black mb-8 uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
                <div className="w-8 h-px bg-indigo-500/30"></div>
                Thêm Tác Phẩm Mới
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tiêu đề sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="Tên tác phẩm..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="Tên tác giả..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Thuộc danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Đường dẫn URL</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white" placeholder="https://..." required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Định dạng</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none transition-all text-white">
                  <option value="pdf">PDF</option>
                  <option value="image">Hình ảnh</option>
                  <option value="audio">Sách nói</option>
                </select>
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-4 rounded-xl font-bold hover:bg-indigo-500 transition-all text-sm shadow-xl shadow-indigo-600/20 active:scale-95">
                Lưu tác phẩm mới
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Danh sách tác phẩm ({books.length})</h3>
            {books.map(book => (
              <div key={book.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-indigo-500/30">
                <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-indigo-400 border border-white/5">
                      {book.contentType === 'pdf' ? <PdfIcon size={24}/> : book.contentType === 'image' ? <ImageIcon size={24}/> : <Headphones size={24}/>}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{book.title}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{book.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button 
                        onClick={() => {
                            setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                            setNewChapter({ title: '', pageNumber: book.chapters.length + 1, url: '', parentId: '' });
                        }} 
                        className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all border ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white'}`}
                    >
                        {editingChaptersBookId === book.id ? 'XONG' : 'MỤC LỤC'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-2 text-gray-600 hover:text-red-400 transition-all"><Trash2 size={18}/></button>
                  </div>
                </div>

                {editingChaptersBookId === book.id && (
                  <div className="p-6 bg-[#1e1e1e] border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-[#252525] p-4 rounded-xl border border-white/5">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Tên chương/bài</label>
                            <input type="text" value={newChapter.title} onChange={e => setNewChapter({...newChapter, title: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/5 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Trang/STT</label>
                            <input type="number" value={newChapter.pageNumber} onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value) || 1})} className="w-full bg-[#1a1a1a] border border-white/5 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={() => handleAddChapter(book)} className="w-full bg-indigo-600 text-white font-bold rounded-lg py-2.5 text-[10px] uppercase hover:bg-indigo-500 transition-all">
                                Thêm Mục
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                        {renderAdminChapters(book.chapters)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            {/* CỘT TRÁI: FORM THÊM MỚI */}
            <div className="lg:col-span-1">
                <div className="bg-[#2a2a2a] p-6 rounded-3xl border border-indigo-500/20 shadow-2xl sticky top-8">
                    <div className="flex items-center gap-3 mb-6">
                        <PlusCircle className="text-indigo-400" size={20} />
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Thêm danh mục mới</h2>
                    </div>
                    
                    <form onSubmit={handleAddCategory} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tên danh mục</label>
                            <input 
                                type="text" 
                                value={newCategory.name} 
                                onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none transition-all text-white placeholder:text-gray-700" 
                                placeholder="Văn học, Lịch sử..." 
                                required 
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Danh mục cha (Tùy chọn)</label>
                            <select 
                                value={newCategory.parentId} 
                                onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} 
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none transition-all text-white"
                            >
                                <option value="">-- Là danh mục gốc --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mô tả ngắn</label>
                            <textarea 
                                value={newCategory.description} 
                                onChange={e => setNewCategory({...newCategory, description: e.target.value})} 
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none transition-all h-24 resize-none text-white placeholder:text-gray-700" 
                                placeholder="Mô tả về thể loại này..."
                            ></textarea>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 p-4 rounded-xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FolderPlus size={16} /> TẠO DANH MỤC
                        </button>
                    </form>
                </div>
            </div>

            {/* CỘT PHẢI: DANH SÁCH DANH MỤC */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Layers size={14} className="text-indigo-500" />
                        Cấu trúc phân loại hiện tại
                    </h3>
                </div>

                {categories.length === 0 ? (
                    <div className="py-20 bg-[#252525]/30 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600">
                        <Folder size={48} className="mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chưa có dữ liệu danh mục</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.map(cat => {
                            const parent = categories.find(p => p.id === cat.parentId);
                            const bookCount = books.filter(b => b.categoryId === cat.id).length;
                            
                            return (
                                <div key={cat.id} className="bg-[#2a2a2a] p-5 rounded-2xl border border-white/5 hover:border-indigo-500/40 transition-all group shadow-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <Folder size={20} />
                                        </div>
                                        <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-700 hover:text-red-400 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-white text-base mb-1">{cat.name}</h4>
                                    {parent && (
                                        <div className="flex items-center gap-1 mb-2 opacity-50">
                                            <ChevronRight size={10} className="text-indigo-400" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Thuộc {parent.name}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-500 line-clamp-2 mb-4 h-8">
                                        {cat.description || 'Không có mô tả.'}
                                    </p>
                                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                        <BookOpen size={12} className="text-indigo-500" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{bookCount} Tác phẩm</span>
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

export default AdminDashboard;


import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, 
  PlusSquare, ListTree, Link2, Hash, FolderTree, FilePlus, Minus
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
  const [newRootTitle, setNewRootTitle] = useState('');
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newChildItem, setNewChildItem] = useState({ title: '', url: '' });

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

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa sách này và toàn bộ mục lục?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('book_id', id);
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
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
    if (!window.confirm("Xóa danh mục này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddRootChapter = async (bookId: string) => {
    if (!newRootTitle.trim()) return;
    setIsProcessing(true);
    try {
      const currentRoots = books.find(b => b.id === bookId)?.chapters.filter(c => !c.parentId) || [];
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newRootTitle.trim(),
        page_number: currentRoots.length + 1,
        parent_id: null
      });
      if (error) throw error;
      setNewRootTitle('');
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddChildItem = async (bookId: string) => {
    if (!newChildItem.title.trim() || !addingToId) return;
    setIsProcessing(true);
    try {
      const siblings = books.find(b => b.id === bookId)?.chapters.filter(c => c.parentId === addingToId) || [];
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newChildItem.title.trim(),
        page_number: siblings.length + 1,
        url: newChildItem.url.trim() || null,
        parent_id: addingToId
      });
      if (error) throw error;
      setNewChildItem({ title: '', url: '' });
      setAddingToId(null);
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const deleteChapter = async (id: string) => {
    if (!window.confirm("Xóa mục này?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const renderTree = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => c.parentId === parentId).sort((a, b) => a.pageNumber - b.pageNumber);
    
    return (
      <div className={`space-y-3 ${level > 0 ? 'ml-10 border-l-2 border-indigo-500/20 pl-6 my-2' : ''}`}>
        {items.map(item => (
          <div key={item.id} className="relative">
            {/* Connector Line for Level > 0 */}
            {level > 0 && (
              <div className="absolute -left-6 top-5 w-6 h-0.5 bg-indigo-500/20"></div>
            )}
            
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${level === 0 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-[#222] border-white/5 hover:border-indigo-500/30 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400'}`}>
                  {item.pageNumber}
                </div>
                <div>
                  <h5 className={`text-sm ${level === 0 ? 'font-black text-white uppercase tracking-wide' : 'font-semibold text-gray-300'}`}>
                    {item.title}
                  </h5>
                  {item.url && <p className="text-[9px] text-indigo-500/60 font-mono mt-0.5 truncate max-w-[200px]">{item.url}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                {level === 0 && (
                  <button 
                    onClick={() => setAddingToId(addingToId === item.id ? null : item.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-lg active:scale-95"
                  >
                    <Plus size={14} /> Thêm bài
                  </button>
                )}
                <button onClick={() => deleteChapter(item.id)} className="p-2.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>
              </div>
            </div>

            {/* Form thêm bài con trực tiếp ngay dưới Chương */}
            {addingToId === item.id && (
              <div className="ml-10 mt-3 p-5 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl animate-slide-up shadow-inner">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                  <FilePlus size={14} /> Đang thêm bài mới vào: {item.title}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <input 
                      type="text" 
                      placeholder="Tên bài (VD: Bài 1: Mở đầu)" 
                      value={newChildItem.title}
                      onChange={e => setNewChildItem({...newChildItem, title: e.target.value})}
                      className="w-full bg-[#151515] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:border-indigo-500 outline-none shadow-inner"
                      onKeyDown={e => e.key === 'Enter' && handleAddChildItem(book.id)}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <input 
                      type="text" 
                      placeholder="Link PDF riêng (Nếu có)" 
                      value={newChildItem.url}
                      onChange={e => setNewChildItem({...newChildItem, url: e.target.value})}
                      className="w-full bg-[#151515] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button 
                      onClick={() => handleAddChildItem(book.id)}
                      className="w-full h-full bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-tighter hover:bg-indigo-500 shadow-lg active:scale-95"
                    >
                      LƯU BÀI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {renderTree(book, item.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-slide-up">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 rotate-3">
            <FolderTree size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">ADMIN PANEL</h1>
            <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.4em] mt-0.5">Hệ thống quản lý cây nội dung</p>
          </div>
        </div>
        <div className="flex bg-[#2a2a2a] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>
                Sách & Mục lục
            </button>
            <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>
                Danh mục
            </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#2a2a2a] p-12 rounded-[3rem] border border-indigo-500/30 flex flex-col items-center gap-5 shadow-2xl scale-110">
                <Loader2 className="animate-spin text-indigo-500" size={56} />
                <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.3em]">Đang đồng bộ hóa dữ liệu...</span>
            </div>
        </div>
      )}

      {errorMessage && (
          <div className="mb-10 p-6 bg-red-900/20 border-l-4 border-red-500 rounded-3xl text-red-200 text-xs flex items-center gap-5 animate-slide-up shadow-xl">
              <AlertCircle size={24} className="text-red-500" />
              <div className="flex-1">
                  <p className="font-black uppercase tracking-widest mb-1">Lỗi hệ thống</p>
                  <p className="opacity-80 font-medium text-sm">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-white/10 rounded-full font-black text-lg">×</button>
          </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM THÊM SÁCH */}
          <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-[100px] group-hover:bg-indigo-600/10 transition-all duration-700"></div>
            <h2 className="text-[11px] font-black mb-10 uppercase tracking-[0.5em] text-indigo-400 flex items-center gap-4">
              <PlusCircle size={20} /> Tạo tác phẩm mới
              <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
              <div className="md:col-span-5 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tiêu đề sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Tên sách đầy đủ..." required />
              </div>
              <div className="md:col-span-4 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Cá nhân hoặc tổ chức..." />
              </div>
              <div className="md:col-span-3 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Phân loại</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-9 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest flex items-center gap-2"><Link2 size={12}/> Đường dẫn gốc (Toàn bộ sách)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Link từ Drive, Dropbox..." required />
              </div>
              <div className="md:col-span-3 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 h-[62px] rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">Lưu Tác Phẩm</button>
              </div>
            </form>
          </div>

          {/* DANH SÁCH SÁCH */}
          <div className="space-y-8">
            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.6em] ml-2 flex items-center gap-5">
              Thư viện đang quản lý
              <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.map(book => (
              <div key={book.id} className="bg-[#252525] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-indigo-500/30 shadow-2xl group">
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="w-20 h-24 bg-[#1a1a1a] rounded-3xl flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner transition-transform group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white duration-500">
                      {book.contentType === 'pdf' ? <PdfIcon size={40}/> : book.contentType === 'image' ? <ImageIcon size={40}/> : <Headphones size={40}/>}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white group-hover:text-indigo-200 transition-colors tracking-tight">{book.title}</h4>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-2 italic">{book.author} • <span className="text-indigo-500">{book.chapters.length} mục lục đã tạo</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                        setAddingToId(null);
                      }}
                      className={`px-10 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-3 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white hover:bg-gray-700'}`}
                    >
                      {editingChaptersBookId === book.id ? <><ChevronDown size={16}/> Đóng mục lục</> : <><ListPlus size={16}/> Quản lý mục lục</>}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-xl"><Trash2 size={28}/></button>
                  </div>
                </div>

                {/* BIÊN TẬP MỤC LỤC CHI TIẾT */}
                {editingChaptersBookId === book.id && (
                  <div className="p-10 bg-[#1a1a1a] border-t border-white/5 animate-slide-up">
                    <div className="max-w-4xl mx-auto space-y-12">
                      
                      {/* Bước 1: Thêm Chương */}
                      <div className="bg-indigo-600/10 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <PlusSquare size={80} />
                        </div>
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                           <PlusCircle size={18} /> Bước 1: Tạo các đề mục lớn (Chương 1, Chương 2...)
                        </h5>
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            placeholder="Nhập tên chương (VD: Chương Một: Lịch sử loài người)" 
                            value={newRootTitle}
                            onChange={e => setNewRootTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRootChapter(book.id)}
                            className="flex-1 bg-[#111] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-2xl"
                          />
                          <button 
                            onClick={() => handleAddRootChapter(book.id)}
                            className="bg-indigo-600 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                          >
                            Thêm chương
                          </button>
                        </div>
                      </div>

                      {/* Bước 2: Xem và Thêm Bài con */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h5 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                <FolderTree size={16} /> Sơ đồ cây mục lục
                                <div className="h-px w-24 bg-white/5"></div>
                            </h5>
                            <span className="text-[9px] text-indigo-500/60 font-bold italic bg-indigo-500/5 px-4 py-1.5 rounded-full">Bấm "Thêm bài" trên từng chương để nhập bài con</span>
                        </div>

                        <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 min-h-[400px] shadow-inner relative">
                          {book.chapters.length === 0 ? (
                            <div className="text-center py-32 flex flex-col items-center justify-center">
                                <Minus size={48} className="text-gray-800 mb-6" />
                                <p className="text-gray-700 font-black uppercase tracking-widest text-[11px]">Chưa có dữ liệu mục lục cho cuốn sách này</p>
                            </div>
                          ) : renderTree(book)}
                        </div>
                      </div>

                      {/* Thông tin hỗ trợ */}
                      <div className="bg-[#222]/50 p-8 rounded-[2rem] border border-dashed border-white/10 flex items-start gap-6">
                         <div className="w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
                            <Info size={24} />
                         </div>
                         <div className="space-y-2">
                            <h6 className="text-sm font-black text-white">Lưu ý nhỏ dành cho bạn:</h6>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">Bạn nên tạo hết các **Chương** trước, sau đó mới bấm vào nút **"Thêm bài"** ở mỗi chương để điền chi tiết các bài bên trong. Hệ thống sẽ tự động sắp xếp thứ tự 1, 2, 3... cho bạn.</p>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB DANH MỤC */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] p-10 rounded-[3rem] border-2 border-indigo-500/20 shadow-2xl sticky top-8">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-10 flex items-center gap-4">
                        <FolderPlus size={24} className="text-indigo-400" /> Quản lý phân loại
                    </h2>
                    <form onSubmit={handleAddCategory} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tên danh mục</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: Lịch sử, IT..." required />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Mục cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-2xl p-4.5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                                <option value="">-- Danh mục gốc --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.4em] shadow-xl shadow-indigo-600/30 active:scale-95">Cập Nhật Phân Loại</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-8 rounded-[3rem] border border-white/5 hover:border-indigo-500/40 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                <Folder size={28} />
                            </div>
                            <button onClick={() => deleteCategory(cat.id)} className="p-3 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"><Trash2 size={22} /></button>
                        </div>
                        <div className="relative z-10">
                            <h4 className="font-black text-white text-2xl mb-2 group-hover:text-indigo-200 transition-colors">{cat.name}</h4>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em]">Hệ thống tri thức số</p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors"></div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

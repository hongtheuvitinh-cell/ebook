
import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, 
  PlusSquare, ListTree, Link2, Hash, FolderTree, FilePlus, Minus, 
  GitBranch, GitCommit, MoveRight, Eye, EyeOff, CheckCircle2, Send,
  FileCode, Music
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
  const [newChildItem, setNewChildItem] = useState({ title: '', url: '', stt: 0 });

  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' as any, isVisible: false });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

  // --- HANDLERS ---
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.url) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('books').insert({
        title: newBook.title, 
        author: newBook.author || 'Chưa rõ',
        url: newBook.url, 
        category_id: newBook.categoryId || null,
        content_type: newBook.contentType, 
        is_visible: newBook.isVisible
      });
      if (error) throw error;
      setNewBook({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf', isVisible: false });
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const toggleVisibility = async (bookId: string, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_visible: !currentStatus })
        .eq('id', bookId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa sách này và toàn bộ mục lục?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('id', id);
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
      const finalStt = newChildItem.stt > 0 ? newChildItem.stt : siblings.length + 1;
      
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newChildItem.title.trim(),
        page_number: finalStt,
        url: newChildItem.url.trim() || null,
        parent_id: addingToId
      });
      if (error) throw error;
      setNewChildItem({ title: '', url: '', stt: 0 });
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

  const renderTreeDiagram = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => c.parentId === parentId).sort((a, b) => a.pageNumber - b.pageNumber);
    
    return (
      <div className={`flex flex-col gap-4 ${level > 0 ? 'ml-12 border-l-4 border-indigo-500/10 pl-8 my-2 relative' : ''}`}>
        {items.map((item, index) => (
          <div key={item.id} className="relative group">
            {level > 0 && (
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-1 bg-indigo-500/10"></div>
            )}
            
            <div className={`
              flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-300
              ${level === 0 
                ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 border-indigo-500/40 shadow-lg' 
                : 'bg-[#1a1a1a] border-white/5 hover:border-indigo-500/50 shadow-sm'}
              ${addingToId === item.id ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}
            `}>
              <div className="flex items-center gap-5">
                <div className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-2xl shrink-0
                  ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400 border border-white/5'}
                `}>
                  {item.pageNumber}
                </div>
                <div>
                  <h5 className={`tracking-tight ${level === 0 ? 'text-lg font-black text-white uppercase' : 'text-sm font-bold text-gray-300'}`}>
                    {item.title}
                  </h5>
                  {item.url && (
                    <div className="flex items-center gap-1.5 mt-1 text-indigo-400/50">
                      <Link2 size={10} />
                      <span className="text-[9px] font-mono truncate max-w-[250px]">{item.url}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {level === 0 && (
                  <button 
                    onClick={() => {
                        setAddingToId(addingToId === item.id ? null : item.id);
                        const subItems = book.chapters.filter(c => c.parentId === item.id);
                        setNewChildItem({ ...newChildItem, stt: subItems.length + 1 });
                    }}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${addingToId === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl'}
                    `}
                  >
                    {addingToId === item.id ? <><Minus size={14} /> Đóng</> : <><Plus size={14} /> Thêm bài</>}
                  </button>
                )}
                <button onClick={() => deleteChapter(item.id)} className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20}/></button>
              </div>
            </div>

            {addingToId === item.id && (
              <div className="ml-12 mt-4 p-6 bg-indigo-600/10 border-2 border-indigo-500/30 rounded-[2rem] animate-slide-up shadow-2xl relative z-20">
                <div className="flex items-center gap-3 text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-5">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg"><FilePlus size={18} /></div>
                  Nhập bài mới cho: <span className="text-white bg-indigo-600/20 px-3 py-1 rounded-md ml-1">{item.title}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <label className="text-[9px] font-black text-gray-500 uppercase ml-2 mb-1 block">Tên bài (VD: Bài 3: Quang học)</label>
                    <input 
                      type="text" 
                      placeholder="Tiêu đề bài viết..." 
                      value={newChildItem.title}
                      onChange={e => setNewChildItem({...newChildItem, title: e.target.value})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-4">
                     <label className="text-[9px] font-black text-gray-500 uppercase ml-2 mb-1 block">Link PDF riêng (Tùy chọn)</label>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      value={newChildItem.url}
                      onChange={e => setNewChildItem({...newChildItem, url: e.target.value})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-1">
                     <label className="text-[9px] font-black text-gray-500 uppercase ml-2 mb-1 block text-center">STT</label>
                    <input 
                      type="number" 
                      value={newChildItem.stt}
                      onChange={e => setNewChildItem({...newChildItem, stt: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 text-xs text-white text-center focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button 
                      onClick={() => handleAddChildItem(book.id)}
                      className="w-full h-[54px] bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl"
                    >
                      LƯU LẠI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {renderTreeDiagram(book, item.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 group-hover:rotate-6 transition-transform duration-500">
            <LayoutGrid size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Admin Dashboard</h1>
            <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.5em] mt-0.5">Xây dựng & Quản lý tri thức số</p>
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
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center">
            <div className="bg-[#2a2a2a] p-14 rounded-[3.5rem] border border-indigo-500/30 flex flex-col items-center gap-6 shadow-2xl scale-110">
                <Loader2 className="animate-spin text-indigo-500" size={64} />
                <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.5em]">Đang đồng bộ dữ liệu...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM NHẬP SÁCH MỚI */}
          <div className="bg-gradient-to-br from-[#2a2a2a] to-[#151515] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-[100px] group-hover:bg-indigo-600/10 transition-all duration-700"></div>
            <h2 className="text-[12px] font-black mb-10 uppercase tracking-[0.6em] text-indigo-400 flex items-center gap-4">
              <PlusCircle size={22} /> Khởi tạo tác phẩm
              <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
              <div className="md:col-span-4 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tiêu đề chính</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Tên tác phẩm..." required />
              </div>
              <div className="md:col-span-4 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Tác giả / Nhà XB..." />
              </div>
              <div className="md:col-span-4 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-6 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest flex items-center gap-2"><Link2 size={12}/> Link PDF Tổng quát</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="https://drive.google.com/..." required />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest flex items-center gap-2"><FileCode size={12}/> Loại tệp</label>
                <select 
                  value={newBook.contentType} 
                  onChange={e => setNewBook({...newBook, contentType: e.target.value as any})}
                  className="w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm font-black text-indigo-400 uppercase outline-none shadow-inner"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Hình ảnh</option>
                  <option value="audio">Âm thanh</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest flex items-center gap-2"><Eye size={12}/> Trạng thái</label>
                <select 
                  value={newBook.isVisible ? "true" : "false"} 
                  onChange={e => setNewBook({...newBook, isVisible: e.target.value === "true"})}
                  className={`w-full bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 text-sm font-black uppercase outline-none shadow-inner ${newBook.isVisible ? 'text-green-400' : 'text-orange-400'}`}
                >
                  <option value="false" className="bg-[#1a1a1a] text-orange-400">Bản nháp (Ẩn)</option>
                  <option value="true" className="bg-[#1a1a1a] text-green-400">Công bố ngay</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 h-[66px] rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">LƯU SÁCH</button>
              </div>
            </form>
          </div>

          {/* LIST BOOKS & TREE MANAGER */}
          <div className="space-y-8">
            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.8em] ml-2 flex items-center gap-5">
              DANH SÁCH TÁC PHẨM HIỆN CÓ
              <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.map(book => (
              <div key={book.id} className={`bg-[#252525] border rounded-[3rem] overflow-hidden transition-all hover:border-indigo-500/30 shadow-2xl group ${!book.isVisible ? 'border-orange-500/10' : 'border-white/5'}`}>
                <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className={`w-24 h-28 bg-[#1a1a1a] rounded-3xl flex flex-col items-center justify-center border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500 ${!book.isVisible ? 'text-orange-400/60' : 'text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      {book.contentType === 'pdf' ? <PdfIcon size={40}/> : book.contentType === 'image' ? <ImageIcon size={40}/> : <Headphones size={40}/>}
                      <span className="text-[8px] font-black mt-2 tracking-widest uppercase">{book.contentType}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-3xl font-black text-white group-hover:text-indigo-200 transition-colors tracking-tighter leading-none">{book.title}</h4>
                        {!book.isVisible ? (
                          <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                            <EyeOff size={10} /> Bản nháp
                          </span>
                        ) : (
                          <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={10} /> Đã công bố
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.4em]">{book.author} • <span className="text-indigo-500">{book.chapters.length} mục lục</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleVisibility(book.id, book.isVisible)}
                      className={`p-5 rounded-2xl transition-all flex items-center gap-3 border ${book.isVisible ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white' : 'bg-green-600 border-green-500 text-white hover:bg-green-500 shadow-xl shadow-green-600/20'}`}
                      title={book.isVisible ? "Gỡ bỏ khỏi thư viện" : "Công bố ra thư viện"}
                    >
                      {book.isVisible ? <><EyeOff size={24}/> <span className="text-[10px] font-black uppercase">GỠ BỎ</span></> : <><Send size={24}/> <span className="text-[10px] font-black uppercase">CÔNG BỐ</span></>}
                    </button>

                    <button 
                      onClick={() => {
                        setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                        setAddingToId(null);
                      }}
                      className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-3 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white hover:bg-gray-700'}`}
                    >
                      {editingChaptersBookId === book.id ? <><ChevronDown size={18}/> ĐÓNG</> : <><ListTree size={18}/> BIÊN TẬP</>}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-6 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={32}/></button>
                  </div>
                </div>

                {/* --- KHU VỰC HIỂN THỊ SƠ ĐỒ CÂY --- */}
                {editingChaptersBookId === book.id && (
                  <div className="p-12 bg-[#0a0a0a] border-t border-white/5 animate-slide-up">
                    <div className="max-w-5xl mx-auto space-y-16">
                      
                      {!book.isVisible && (
                        <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[2.5rem] flex items-center gap-6 animate-pulse">
                            <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                <Info size={24} />
                            </div>
                            <div>
                                <h6 className="text-orange-400 font-black text-sm uppercase tracking-widest">Đang ở chế độ biên tập ẩn</h6>
                                <p className="text-[11px] text-gray-500 mt-1 font-medium">Bạn có thể tự do thêm bớt nội dung. Sau khi hoàn tất, hãy nhấn nút <b>"CÔNG BỐ"</b> màu xanh phía trên để độc giả có thể nhìn thấy sách này.</p>
                            </div>
                        </div>
                      )}

                      <div className="bg-indigo-600/5 p-10 rounded-[3.5rem] border border-indigo-500/10 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none rotate-12">
                            <GitBranch size={160} />
                        </div>
                        <h5 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                           <PlusSquare size={20} /> Bước 1: Tạo các đầu Chương (Mục gốc)
                        </h5>
                        <div className="flex gap-5">
                          <input 
                            type="text" 
                            placeholder="Nhập tên chương chính (VD: Chương 1, Chương 2...)" 
                            value={newRootTitle}
                            onChange={e => setNewRootTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRootChapter(book.id)}
                            className="flex-1 bg-[#111] border border-white/10 rounded-3xl p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-2xl"
                          />
                          <button 
                            onClick={() => handleAddRootChapter(book.id)}
                            className="bg-indigo-600 px-12 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                          >
                            THÊM CHƯƠNG GỐC
                          </button>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center justify-between px-6">
                            <h5 className="text-[13px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-4">
                                <ListTree size={20} className="text-indigo-500" /> SƠ ĐỒ CÂY MỤC LỤC CHI TIẾT
                                <div className="h-px w-32 bg-indigo-500/20"></div>
                            </h5>
                        </div>

                        <div className="bg-[#111] p-12 rounded-[4rem] border border-white/5 min-h-[500px] shadow-inner relative overflow-hidden">
                          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                          
                          <div className="relative z-10">
                            {book.chapters.length === 0 ? (
                                <div className="text-center py-40 flex flex-col items-center justify-center">
                                    <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-gray-800 border border-white/5 mb-8">
                                        <Minus size={48} />
                                    </div>
                                    <p className="text-gray-700 font-black uppercase tracking-[0.5em] text-[13px]">CHƯA CÓ DỮ LIỆU CÂY MỤC LỤC</p>
                                </div>
                            ) : renderTreeDiagram(book)}
                          </div>
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
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: Lịch sử, IT..." required />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Phân cấp cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                                <option value="">-- Cấp cao nhất --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-6 rounded-2xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.5em] shadow-xl shadow-indigo-600/30 active:scale-95">Cập Nhật Danh Mục</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-8 rounded-[3rem] border border-white/5 hover:border-indigo-500/40 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div className="p-5 bg-indigo-600/10 text-indigo-400 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                <Folder size={32} />
                            </div>
                            <button onClick={() => deleteCategory(cat.id)} className="p-3 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"><Trash2 size={24} /></button>
                        </div>
                        <div className="relative z-10">
                            <h4 className="font-black text-white text-2xl mb-2 group-hover:text-indigo-200 transition-colors tracking-tight">{cat.name}</h4>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.4em]">Kiến trúc tri thức</p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors"></div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

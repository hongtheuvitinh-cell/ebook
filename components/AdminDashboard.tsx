
import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, 
  PlusSquare, ListTree, Link2, Hash, FolderTree, FilePlus, Minus, 
  GitBranch, GitCommit, MoveRight, Eye, EyeOff, CheckCircle2, Send,
  FileCode, Music, AlertTriangle
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
    // SỬA LỖI: Lọc Gốc (Root) một cách linh hoạt hơn, chấp nhận null, undefined hoặc ""
    const items = book.chapters.filter(c => {
        if (parentId === null) return !c.parentId; // Nếu tìm gốc, lấy mọi thứ không có parentId
        return c.parentId === parentId;
    }).sort((a, b) => a.pageNumber - b.pageNumber);
    
    // Nếu là cấp 0 mà không tìm thấy items nào nhưng sách vẫn có chapters, báo lỗi dữ liệu
    if (level === 0 && items.length === 0 && book.chapters.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 rounded-[2rem] border border-red-500/20 px-8 text-center">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h6 className="text-red-400 font-black uppercase text-sm tracking-widest mb-2">Lỗi cấu trúc dữ liệu</h6>
                <p className="text-gray-500 text-xs leading-relaxed max-w-sm">
                    Sách có dữ liệu bài viết nhưng không tìm thấy "Chương Gốc". Có thể toàn bộ bài viết đang bị mồ côi. 
                    Hãy thử tạo một Chương Gốc mới ở phía trên.
                </p>
            </div>
        );
    }

    return (
      <div className={`flex flex-col gap-6 ${level > 0 ? 'ml-14 border-l-2 border-indigo-500/20 pl-10 my-4 relative' : ''}`}>
        {items.map((item, index) => (
          <div key={item.id} className="relative group">
            {/* Đường kẻ nối ngang rực rỡ hơn */}
            {level > 0 && (
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-0.5 bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors"></div>
            )}
            
            <div className={`
              flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-300
              ${level === 0 
                ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-600/5 border-indigo-500/60 shadow-xl' 
                : 'bg-[#151515] border-white/10 hover:border-indigo-500/50 shadow-md'}
              ${addingToId === item.id ? 'ring-4 ring-indigo-500/30 border-indigo-500 bg-indigo-500/10 scale-[1.03]' : ''}
            `}>
              <div className="flex items-center gap-6">
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-2xl shrink-0
                  ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-[#222] text-indigo-400 border border-white/5'}
                `}>
                  {item.pageNumber}
                </div>
                <div>
                  <h5 className={`tracking-tight ${level === 0 ? 'text-xl font-black text-white uppercase' : 'text-base font-bold text-gray-200'}`}>
                    {item.title}
                  </h5>
                  {item.url && (
                    <div className="flex items-center gap-2 mt-2 text-indigo-400/70">
                      <Link2 size={12} />
                      <span className="text-[10px] font-mono truncate max-w-[300px]">{item.url}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {level === 0 && (
                  <button 
                    onClick={() => {
                        setAddingToId(addingToId === item.id ? null : item.id);
                        const subItems = book.chapters.filter(c => c.parentId === item.id);
                        setNewChildItem({ ...newChildItem, stt: subItems.length + 1 });
                    }}
                    className={`
                      flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all
                      ${addingToId === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl'}
                    `}
                  >
                    {addingToId === item.id ? <><Minus size={16} /> Đóng</> : <><Plus size={16} /> Thêm bài</>}
                  </button>
                )}
                <button onClick={() => deleteChapter(item.id)} className="p-4 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={24}/></button>
              </div>
            </div>

            {/* FORM NHẬP BÀI MỚI TRỰC TIẾP TRONG CÂY */}
            {addingToId === item.id && (
              <div className="ml-14 mt-6 p-8 bg-indigo-600/10 border-4 border-indigo-500/30 rounded-[2.5rem] animate-slide-up shadow-2xl relative z-20">
                <div className="flex items-center gap-4 text-xs font-black text-indigo-300 uppercase tracking-widest mb-6">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FilePlus size={22} /></div>
                  Soạn thảo bài viết mới cho: <span className="text-white bg-indigo-600/30 px-4 py-2 rounded-xl ml-1">{item.title}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-3 mb-2 block tracking-widest">Tiêu đề bài viết</label>
                    <input 
                      type="text" 
                      placeholder="VD: Bài 3: Nguyên lý làm việc..." 
                      value={newChildItem.title}
                      onChange={e => setNewChildItem({...newChildItem, title: e.target.value})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.25rem] p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-4">
                     <label className="text-[10px] font-black text-gray-500 uppercase ml-3 mb-2 block tracking-widest">Link PDF riêng</label>
                    <input 
                      type="text" 
                      placeholder="https://drive.google.com/..." 
                      value={newChildItem.url}
                      onChange={e => setNewChildItem({...newChildItem, url: e.target.value})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.25rem] p-5 text-sm text-white focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-1">
                     <label className="text-[10px] font-black text-gray-500 uppercase ml-3 mb-2 block text-center tracking-widest">STT</label>
                    <input 
                      type="number" 
                      value={newChildItem.stt}
                      onChange={e => setNewChildItem({...newChildItem, stt: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.25rem] p-5 text-sm text-white text-center font-bold focus:border-indigo-500 outline-none shadow-inner"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button 
                      onClick={() => handleAddChildItem(book.id)}
                      className="w-full h-[62px] bg-indigo-600 text-white font-black rounded-[1.25rem] text-[11px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all active:scale-95"
                    >
                      LƯU BÀI VIẾT
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
            <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.5em] mt-0.5">Hệ thống quản lý dữ liệu cây</p>
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
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center">
            <div className="bg-[#1a1a1a] p-16 rounded-[4rem] border border-indigo-500/30 flex flex-col items-center gap-8 shadow-2xl scale-110">
                <div className="relative">
                    <Loader2 className="animate-spin text-indigo-500" size={80} />
                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20"></div>
                </div>
                <span className="text-[12px] font-black text-indigo-300 uppercase tracking-[0.6em] animate-pulse">Đang đồng bộ cây tri thức...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM NHẬP SÁCH MỚI */}
          <div className="bg-gradient-to-br from-[#2a2a2a] to-[#151515] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-[100px] group-hover:bg-indigo-600/10 transition-all duration-700"></div>
            <h2 className="text-[13px] font-black mb-12 uppercase tracking-[0.6em] text-indigo-400 flex items-center gap-5">
              <PlusCircle size={24} /> Khởi tạo tác phẩm mới
              <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
              <div className="md:col-span-4 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em]">Tiêu đề chính</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Tên tác phẩm..." required />
              </div>
              <div className="md:col-span-4 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em]">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Tác giả / Nhà XB..." />
              </div>
              <div className="md:col-span-4 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em]">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-6 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em] flex items-center gap-2"><Link2 size={14}/> Link PDF Tổng quát</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="https://drive.google.com/..." required />
              </div>
              <div className="md:col-span-2 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em] flex items-center gap-2"><FileCode size={14}/> Loại tệp</label>
                <select 
                  value={newBook.contentType} 
                  onChange={e => setNewBook({...newBook, contentType: e.target.value as any})}
                  className="w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm font-black text-indigo-400 uppercase outline-none shadow-inner"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Hình ảnh</option>
                  <option value="audio">Âm thanh</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-4">
                <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em] flex items-center gap-2"><Eye size={14}/> Trạng thái</label>
                <select 
                  value={newBook.isVisible ? "true" : "false"} 
                  onChange={e => setNewBook({...newBook, isVisible: e.target.value === "true"})}
                  className={`w-full bg-[#0d0d0d] border border-white/10 rounded-[1.5rem] p-6 text-sm font-black uppercase outline-none shadow-inner ${newBook.isVisible ? 'text-green-400' : 'text-orange-400'}`}
                >
                  <option value="false" className="bg-[#1a1a1a] text-orange-400">Bản nháp (Ẩn)</option>
                  <option value="true" className="bg-[#1a1a1a] text-green-400">Công bố ngay</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 h-[74px] rounded-[1.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">LƯU SÁCH</button>
              </div>
            </form>
          </div>

          {/* LIST BOOKS & TREE MANAGER */}
          <div className="space-y-10">
            <h3 className="text-gray-500 text-[11px] font-black uppercase tracking-[0.8em] ml-3 flex items-center gap-6">
              KHO DỮ LIỆU HIỆN CÓ
              <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.map(book => (
              <div key={book.id} className={`bg-[#1e1e1e] border rounded-[3.5rem] overflow-hidden transition-all hover:border-indigo-500/30 shadow-2xl group ${!book.isVisible ? 'border-orange-500/10' : 'border-white/5'}`}>
                <div className="p-12 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex items-center gap-10 w-full md:w-auto">
                    <div className={`w-28 h-32 bg-[#151515] rounded-[2rem] flex flex-col items-center justify-center border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500 ${!book.isVisible ? 'text-orange-400/60' : 'text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      {book.contentType === 'pdf' ? <PdfIcon size={44}/> : book.contentType === 'image' ? <ImageIcon size={44}/> : <Headphones size={44}/>}
                      <span className="text-[9px] font-black mt-3 tracking-widest uppercase">{book.contentType}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <h4 className="text-4xl font-black text-white group-hover:text-indigo-200 transition-colors tracking-tighter leading-none">{book.title}</h4>
                        {!book.isVisible ? (
                          <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2">
                            <EyeOff size={12} /> Bản nháp
                          </span>
                        ) : (
                          <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={12} /> Đã công bố
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-gray-500 font-black uppercase tracking-[0.5em]">{book.author} • <span className="text-indigo-500">{book.chapters.length} mục dữ liệu</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <button 
                      onClick={() => toggleVisibility(book.id, book.isVisible)}
                      className={`p-6 rounded-[1.5rem] transition-all flex items-center gap-4 border ${book.isVisible ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white' : 'bg-green-600 border-green-500 text-white hover:bg-green-500 shadow-xl shadow-green-600/20'}`}
                    >
                      {book.isVisible ? <><EyeOff size={24}/> <span className="text-[11px] font-black uppercase tracking-widest">GỠ BỎ</span></> : <><Send size={24}/> <span className="text-[11px] font-black uppercase tracking-widest">CÔNG BỐ</span></>}
                    </button>

                    <button 
                      onClick={() => {
                        setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                        setAddingToId(null);
                      }}
                      className={`px-12 py-6 rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.3em] border transition-all flex items-center gap-4 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl' : 'bg-[#2a2a2a] text-gray-400 border-white/5 hover:text-white hover:bg-gray-700'}`}
                    >
                      {editingChaptersBookId === book.id ? <><ChevronDown size={20}/> ĐÓNG</> : <><ListTree size={20}/> BIÊN TẬP CÂY</>}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-7 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-[1.5rem] transition-all"><Trash2 size={36}/></button>
                  </div>
                </div>

                {/* --- KHU VỰC HIỂN THỊ SƠ ĐỒ CÂY --- */}
                {editingChaptersBookId === book.id && (
                  <div className="p-16 bg-[#0d0d0d] border-t border-white/5 animate-slide-up">
                    <div className="max-w-5xl mx-auto space-y-20">
                      
                      {!book.isVisible && (
                        <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[3rem] flex items-center gap-8 animate-pulse shadow-2xl shadow-orange-500/5">
                            <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center shrink-0 shadow-xl">
                                <Info size={32} />
                            </div>
                            <div>
                                <h6 className="text-orange-400 font-black text-lg uppercase tracking-widest mb-1">Chế độ biên tập nội bộ</h6>
                                <p className="text-[13px] text-gray-500 leading-relaxed font-medium">Bạn có thể tự do xây dựng mục lục, chỉnh sửa STT mà không ảnh hưởng tới người đọc. Sau khi hoàn tất cây, hãy nhấn <b>"CÔNG BỐ"</b> ở phía trên.</p>
                            </div>
                        </div>
                      )}

                      <div className="bg-indigo-600/5 p-12 rounded-[4rem] border border-indigo-500/10 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12">
                            <GitBranch size={200} />
                        </div>
                        <h5 className="text-[14px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-5">
                           <PlusSquare size={24} /> BƯỚC 1: TẠO GỐC (CHƯƠNG CHÍNH)
                        </h5>
                        <div className="flex gap-6 relative z-10">
                          <input 
                            type="text" 
                            placeholder="Tên chương chính (VD: Chương 1: Cơ học cổ điển...)" 
                            value={newRootTitle}
                            onChange={e => setNewRootTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRootChapter(book.id)}
                            className="flex-1 bg-[#151515] border border-white/10 rounded-[2rem] p-8 text-base text-white focus:border-indigo-500 outline-none shadow-2xl transition-all"
                          />
                          <button 
                            onClick={() => handleAddRootChapter(book.id)}
                            className="bg-indigo-600 px-16 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all"
                          >
                            THÊM GỐC
                          </button>
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div className="flex items-center justify-between px-10">
                            <h5 className="text-[15px] font-black text-white uppercase tracking-[0.6em] flex items-center gap-6">
                                <ListTree size={28} className="text-indigo-500" /> SƠ ĐỒ CÂY TRI THỨC
                                <div className="h-px w-40 bg-indigo-500/20"></div>
                            </h5>
                        </div>

                        <div className="bg-[#0a0a0a] p-16 rounded-[5rem] border border-white/5 min-h-[600px] shadow-[inset_0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                          {/* Hiệu ứng lưới Grid */}
                          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#6366f1 1.5px, transparent 1.5px), linear-gradient(90deg, #6366f1 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }}></div>
                          
                          <div className="relative z-10">
                            {book.chapters.length === 0 ? (
                                <div className="text-center py-52 flex flex-col items-center justify-center animate-fade-in">
                                    <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center text-gray-800 border border-white/5 mb-10 shadow-2xl">
                                        <Minus size={64} />
                                    </div>
                                    <p className="text-gray-700 font-black uppercase tracking-[0.8em] text-lg">CHƯA CÓ DỮ LIỆU CÂY</p>
                                    <p className="text-gray-800 text-sm mt-6 max-w-sm tracking-wide font-medium">Bắt đầu bằng cách tạo Chương Gốc ở bước 1 phía trên để kích hoạt sơ đồ.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] p-12 rounded-[4rem] border-2 border-indigo-500/20 shadow-2xl sticky top-8">
                    <h2 className="text-base font-black uppercase tracking-[0.4em] text-white mb-12 flex items-center gap-5">
                        <FolderPlus size={32} className="text-indigo-400" /> QUẢN LÝ PHÂN LOẠI
                    </h2>
                    <form onSubmit={handleAddCategory} className="space-y-10">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em]">Tên danh mục</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: Vật Lý Học, CNTT..." required />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-gray-500 uppercase ml-3 tracking-[0.2em]">Phân cấp cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                                <option value="">-- Cấp cao nhất --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-7 rounded-[1.5rem] font-black hover:bg-indigo-500 transition-all text-[12px] tracking-[0.5em] shadow-2xl shadow-indigo-600/30 active:scale-95">CẬP NHẬT PHÂN LOẠI</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-10 rounded-[4rem] border border-white/5 hover:border-indigo-500/40 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-12 relative z-10">
                            <div className="p-7 bg-indigo-600/10 text-indigo-400 rounded-[2.5rem] group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner group-hover:rotate-6">
                                <Folder size={40} />
                            </div>
                            <button onClick={() => deleteCategory(cat.id)} className="p-4 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"><Trash2 size={28} /></button>
                        </div>
                        <div className="relative z-10">
                            <h4 className="font-black text-white text-3xl mb-3 group-hover:text-indigo-200 transition-colors tracking-tighter">{cat.name}</h4>
                            <p className="text-[11px] text-indigo-500 font-black uppercase tracking-[0.6em] italic">Kiến trúc tri thức</p>
                        </div>
                        <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-indigo-600/5 rounded-full blur-[100px] group-hover:bg-indigo-600/10 transition-colors"></div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, 
  PlusSquare, ListTree, Link2, Hash, FolderTree, FilePlus, Minus, 
  GitBranch, GitCommit, MoveRight, Eye, EyeOff, CheckCircle2, Send,
  FileCode, Music, AlertTriangle, ChevronRightCircle, Save, X as CloseIcon
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
  
  const [editingChaptersBookId, setEditingChaptersBookId] = useState<string | null>(null);
  const [newRootTitle, setNewRootTitle] = useState('');
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newChildItem, setNewChildItem] = useState({ title: '', url: '', stt: 0 });

  // State cho việc chỉnh sửa trực tiếp (Inline Editing)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', url: '', stt: 0 });

  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' as any, isVisible: false });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

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
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleUpdateChapter = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editFormData.title,
          url: editFormData.url || null,
          page_number: editFormData.stt
        })
        .eq('id', id);
      if (error) throw error;
      setEditingItemId(null);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const toggleVisibility = async (bookId: string, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      await supabase.from('books').update({ is_visible: !currentStatus }).eq('id', bookId);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa sách này và toàn bộ mục lục?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('book_id', id);
      await supabase.from('books').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    setIsProcessing(true);
    try {
      await supabase.from('categories').insert({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parentId || null
      });
      setNewCategory({ name: '', description: '', parentId: '' });
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
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
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
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
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const deleteChapter = async (id: string) => {
    if (!window.confirm("Xóa mục này và các mục con?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const renderTreeDiagram = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => {
        if (parentId === null) return !c.parentId || c.parentId === "";
        return c.parentId === parentId;
    }).sort((a, b) => a.pageNumber - b.pageNumber);
    
    if (level === 0 && items.length === 0 && book.chapters.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-red-500/5 rounded-[2.5rem] border border-red-500/20 px-8 text-center">
                <AlertTriangle size={40} className="text-red-500 mb-4" />
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Dữ liệu mồ côi (Không tìm thấy chương gốc)</p>
            </div>
        );
    }

    return (
      <div className={`flex flex-col gap-4 ${level > 0 ? 'ml-10 border-l-2 border-dashed border-indigo-500/20 pl-8 my-2' : ''}`}>
        {items.map((item) => {
          const isEditing = editingItemId === item.id;
          
          return (
            <div key={item.id} className="relative group">
              {/* Box chứa thông tin mục */}
              <div className={`
                flex items-center justify-between p-4 rounded-2xl border transition-all duration-300
                ${level === 0 
                  ? 'bg-gradient-to-r from-indigo-600/10 to-transparent border-indigo-500/40 shadow-lg' 
                  : level === 1
                  ? 'bg-[#1a1a1a] border-white/10 hover:border-indigo-500/30'
                  : 'bg-[#111] border-white/5 opacity-80'}
                ${isEditing ? 'ring-2 ring-yellow-500/50 border-yellow-500 bg-yellow-500/5' : ''}
              `}>
                
                {/* Phần hiển thị / Form sửa */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0
                    ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400'}
                  `}>
                    {isEditing ? (
                        <input 
                            type="number" 
                            className="w-full bg-transparent text-center outline-none" 
                            value={editFormData.stt} 
                            onChange={e => setEditFormData({...editFormData, stt: parseInt(e.target.value) || 0})}
                        />
                    ) : item.pageNumber}
                  </div>
                  
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                         <input 
                            type="text" 
                            className="bg-[#0d0d0d] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-yellow-500 w-full"
                            value={editFormData.title}
                            onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                         />
                         <input 
                            type="text" 
                            placeholder="Link tài liệu..."
                            className="bg-[#0d0d0d] border border-white/10 rounded-lg p-2 text-[10px] text-gray-400 outline-none focus:border-yellow-500 w-full"
                            value={editFormData.url}
                            onChange={e => setEditFormData({...editFormData, url: e.target.value})}
                         />
                      </div>
                    ) : (
                      <>
                        <h5 className={`tracking-tight ${level === 0 ? 'text-sm font-black text-white' : 'text-xs font-bold text-gray-300'}`}>
                          {item.title}
                        </h5>
                        {item.url && (
                          <div className="flex items-center gap-1 mt-1 text-indigo-400/50 text-[9px] font-mono">
                            <Link2 size={10} /> <span className="truncate max-w-[200px]">{item.url}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Các nút điều khiển */}
                <div className="flex items-center gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleUpdateChapter(item.id)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500" title="Lưu thay đổi"><Save size={14} /></button>
                      <button onClick={() => setEditingItemId(null)} className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600" title="Hủy"><CloseIcon size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                            setAddingToId(addingToId === item.id ? null : item.id);
                            const subItems = book.chapters.filter(c => c.parentId === item.id);
                            setNewChildItem({ title: '', url: '', stt: subItems.length + 1 });
                        }}
                        className={`p-2 rounded-lg transition-all border ${addingToId === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`}
                        title="Thêm mục con"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditFormData({ title: item.title, url: item.url || '', stt: item.pageNumber });
                        }}
                        className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all"
                        title="Sửa"
                      >
                        <PencilLine size={14} />
                      </button>
                      <button onClick={() => deleteChapter(item.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Xóa"><Trash2 size={14}/></button>
                    </>
                  )}
                </div>
              </div>

              {/* Form thêm mục con (Xuất hiện ngay dưới mục cha) */}
              {addingToId === item.id && (
                <div className="ml-10 mt-3 p-5 bg-indigo-600/5 border border-indigo-500/30 rounded-2xl animate-slide-up shadow-xl relative z-10">
                   <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                      <CornerDownRight size={14} /> Thêm bài cho: <span className="text-white italic">{item.title}</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <input 
                          type="text" placeholder="Tên bài mới..." 
                          value={newChildItem.title}
                          onChange={e => setNewChildItem({...newChildItem, title: e.target.value})}
                          className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <input 
                          type="text" placeholder="Link PDF (Tùy chọn)..." 
                          value={newChildItem.url}
                          onChange={e => setNewChildItem({...newChildItem, url: e.target.value})}
                          className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <input 
                          type="number" 
                          value={newChildItem.stt}
                          onChange={e => setNewChildItem({...newChildItem, stt: parseInt(e.target.value) || 0})}
                          className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white text-center font-bold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button onClick={() => handleAddChildItem(book.id)} className="w-full h-full bg-indigo-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all">LƯU BÀI</button>
                      </div>
                   </div>
                </div>
              )}

              {/* Đệ quy vẽ tiếp các cấp con */}
              {renderTreeDiagram(book, item.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 group-hover:rotate-6 transition-transform duration-500">
            <LayoutGrid size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Admin Console</h1>
            <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.5em] mt-0.5">Xây dựng cây thư mục tri thức</p>
          </div>
        </div>
        <div className="flex bg-[#2a2a2a] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Tác phẩm & Mục lục</button>
            <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Danh mục</button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#1a1a1a] p-10 rounded-[2.5rem] border border-indigo-500/30 flex flex-col items-center gap-4 shadow-2xl">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Đang cập nhật hệ thống...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* FORM NHẬP SÁCH */}
          <div className="bg-[#222] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <h2 className="text-[11px] font-black mb-8 uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-3">
              <PlusSquare size={20} /> Khởi tạo sách mới
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" required />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none">
                  <option value="">-- Chọn --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Trạng thái</label>
                <select value={newBook.isVisible ? "true" : "false"} onChange={e => setNewBook({...newBook, isVisible: e.target.value === "true"})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none">
                  <option value="false">Bản nháp</option>
                  <option value="true">Công bố</option>
                </select>
              </div>
              <div className="md:col-span-10 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Link PDF Tổng quát</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" required />
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="w-full h-[54px] bg-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all">Lưu sách</button>
              </div>
            </form>
          </div>

          {/* DANH SÁCH SÁCH */}
          <div className="space-y-6">
            {books.map(book => (
              <div key={book.id} className="bg-[#1a1a1a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-20 bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5">
                      <BookOpen size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white">{book.title}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{book.author} • {book.chapters.length} mục dữ liệu</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      {editingChaptersBookId === book.id ? 'Đóng mục lục' : 'Quản lý mục lục'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20}/></button>
                  </div>
                </div>

                {editingChaptersBookId === book.id && (
                  <div className="p-8 bg-[#0d0d0d] border-t border-white/5 animate-slide-up">
                    <div className="max-w-4xl mx-auto space-y-12">
                      {/* Thêm chương gốc */}
                      <div className="bg-indigo-600/5 p-8 rounded-[2rem] border border-indigo-500/20">
                         <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                           <ListPlus size={18} /> Bước 1: Tạo các Chương Chính
                         </h5>
                         <div className="flex gap-4">
                            <input 
                              type="text" placeholder="Nhập tên chương (VD: Chương 1...)" 
                              value={newRootTitle}
                              onChange={e => setNewRootTitle(e.target.value)}
                              className="flex-1 bg-black border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none shadow-inner"
                            />
                            <button onClick={() => handleAddRootChapter(book.id)} className="bg-indigo-600 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">Thêm Chương Gốc</button>
                         </div>
                      </div>

                      {/* Sơ đồ cây */}
                      <div className="space-y-6">
                         <h5 className="text-[11px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-4">
                            <ListTree size={20} className="text-indigo-500" /> Sơ đồ cây đa tầng (Cha - Con - Cháu)
                         </h5>
                         <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 min-h-[300px]">
                            {renderTreeDiagram(book)}
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

      {/* DANH MỤC TAB */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-[#222] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl sticky top-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white mb-8 flex items-center gap-3"><FolderPlus size={20} className="text-indigo-400" /> Tạo danh mục</h2>
                    <form onSubmit={handleAddCategory} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tên danh mục</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Cấp cha (Tùy chọn)</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none">
                                <option value="">-- Cấp cao nhất --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">Lưu danh mục</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-[#222] p-6 rounded-[2rem] border border-white/5 flex justify-between items-center group shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={24} /></div>
                            <span className="font-bold text-sm">{cat.name}</span>
                        </div>
                        <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-600 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

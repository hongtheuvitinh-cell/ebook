
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

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', url: '', stt: 0 });

  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' as 'pdf' | 'image' | 'audio', isVisible: true });
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
      setNewBook({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf', isVisible: true });
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategory.name.trim(),
        description: newCategory.description || null,
        parent_id: newCategory.parentId || null
      });
      if (error) throw error;
      setNewCategory({ name: '', description: '', parentId: '' });
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleUpdateChapter = async (id: string) => {
    if (!editFormData.title.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editFormData.title.trim(),
          url: editFormData.url || null,
          page_number: editFormData.stt
        })
        .eq('id', id);
      if (error) throw error;
      setEditingItemId(null);
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
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newChildItem.title.trim(),
        page_number: newChildItem.stt,
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
    if (!window.confirm("Xóa mục này?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa toàn bộ sách và mục lục?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('chapters').delete().eq('book_id', id);
      await supabase.from('books').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm("Xóa danh mục này?")) return;
    setIsProcessing(true);
    try {
      await supabase.from('categories').delete().eq('id', id);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const renderTreeDiagram = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => {
        if (parentId === null) return !c.parentId || c.parentId === "";
        return c.parentId === parentId;
    }).sort((a, b) => a.pageNumber - b.pageNumber);
    
    return (
      <div className={`flex flex-col gap-4 ${level > 0 ? 'ml-12 border-l-2 border-indigo-500/20 pl-8 my-2 relative' : ''}`}>
        {items.map((item) => {
          const isEditing = editingItemId === item.id;
          return (
            <div key={item.id} className="relative group">
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${level === 0 ? 'bg-gradient-to-r from-indigo-600/15 to-transparent border-indigo-500/40 shadow-lg' : 'bg-[#1a1a1a] border-white/10 hover:border-indigo-500/30'} ${isEditing ? 'ring-2 ring-yellow-500 border-yellow-500 bg-yellow-500/5' : ''}`}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-inner ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400 border border-white/5'}`}>
                    {isEditing ? <input type="number" className="w-full bg-transparent text-center outline-none" value={editFormData.stt} onChange={e => setEditFormData({...editFormData, stt: parseInt(e.target.value) || 0})} /> : item.pageNumber}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-yellow-500" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} />
                        <input type="text" placeholder="Link PDF (Nếu có)..." className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg p-2 text-[10px] text-gray-500 outline-none" value={editFormData.url} onChange={e => setEditFormData({...editFormData, url: e.target.value})} />
                      </div>
                    ) : (
                      <>
                        <h5 className={`tracking-tight ${level === 0 ? 'text-base font-black text-white' : 'text-sm font-bold text-gray-300'}`}>{item.title}</h5>
                        {item.url && <div className="flex items-center gap-1 mt-1 text-indigo-400/40 text-[9px] font-mono"><Link2 size={10} /> <span className="truncate max-w-[200px]">{item.url}</span></div>}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleUpdateChapter(item.id)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500"><Save size={14} /></button>
                      <button onClick={() => setEditingItemId(null)} className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><CloseIcon size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { const isOpening = addingToId !== item.id; setAddingToId(isOpening ? item.id : null); if (isOpening) { const existingChildren = book.chapters.filter(c => c.parentId === item.id); setNewChildItem({ title: '', url: '', stt: existingChildren.length + 1 }); } }} className={`p-2 rounded-lg transition-all border ${addingToId === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`} title="Thêm mục con"><Plus size={14} /></button>
                      <button onClick={() => { setEditingItemId(item.id); setEditFormData({ title: item.title, url: item.url || '', stt: item.pageNumber }); }} className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all" title="Sửa mục này"><PencilLine size={14} /></button>
                      <button onClick={() => deleteChapter(item.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Xóa"><Trash2 size={14}/></button>
                    </>
                  )}
                </div>
              </div>
              {addingToId === item.id && (
                <div className="ml-10 mt-3 p-5 bg-indigo-600/5 border border-indigo-500/30 rounded-2xl animate-slide-up shadow-2xl relative z-10">
                   <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4"><CornerDownRight size={14} /> Thêm bài cho: <span className="text-white italic">{item.title}</span></div>
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <label className="text-[8px] font-black text-gray-500 uppercase ml-2 mb-1 block">Tên bài mới</label>
                        <input type="text" placeholder="Nhập tên bài..." value={newChildItem.title} onChange={e => setNewChildItem({...newChildItem, title: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[8px] font-black text-gray-500 uppercase ml-2 mb-1 block">Link PDF (Tùy chọn)</label>
                        <input type="text" placeholder="Link PDF..." value={newChildItem.url} onChange={e => setNewChildItem({...newChildItem, url: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase ml-2 mb-1 block text-center">STT</label>
                        <input type="number" value={newChildItem.stt} onChange={e => setNewChildItem({...newChildItem, stt: parseInt(e.target.value) || 0})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-xs text-white text-center font-bold" />
                      </div>
                      <div className="md:col-span-2 flex items-end">
                        <button onClick={() => handleAddChildItem(book.id)} className="w-full h-[46px] bg-indigo-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all">LƯU BÀI</button>
                      </div>
                   </div>
                </div>
              )}
              {renderTreeDiagram(book, item.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-6 group">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
            <LayoutGrid size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Admin Console</h1>
            <p className="text-indigo-400/50 text-[10px] font-black uppercase tracking-[0.4em] mt-0.5">Xây dựng cây thư mục tri thức</p>
          </div>
        </div>
        <div className="flex bg-[#2a2a2a] p-1 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500'}`}>Sách & Mục lục</button>
            <button onClick={() => setActiveTab('categories')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500'}`}>Danh mục</button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#1a1a1a] p-10 rounded-[2.5rem] border border-indigo-500/30 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Đang cập nhật cây dữ liệu...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-10 animate-slide-up">
          <div className="bg-[#222] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <h2 className="text-[11px] font-black mb-8 uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-3">
              <PlusSquare size={20} /> Khởi tạo tác phẩm mới
              <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
              <div className="md:col-span-4 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" placeholder="Tên tác phẩm..." required />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" placeholder="Tên tác giả..." />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Loại Nội dung</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value as any})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-indigo-400 font-black outline-none">
                  <option value="pdf">📄 Sách PDF</option>
                  <option value="image">🖼️ Hình ảnh / Slide</option>
                  <option value="audio">🎧 Audio / Podcast</option>
                </select>
              </div>
              <div className="md:col-span-8 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Link File Tổng quát</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-indigo-500 outline-none" placeholder="https://drive.google.com/..." required />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Hiển thị</label>
                <select value={newBook.isVisible ? 'true' : 'false'} onChange={e => setNewBook({...newBook, isVisible: e.target.value === 'true'})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none">
                  <option value="true">Công khai (Public)</option>
                  <option value="false">Riêng tư (Hidden)</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="w-full h-[50px] bg-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all">Lưu sách</button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            {books.map(book => (
              <div key={book.id} className="bg-[#1a1a1a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-18 bg-gray-800 rounded-2xl flex flex-col items-center justify-center text-indigo-400 border border-white/5">
                      {book.contentType === 'audio' ? <Music size={24} /> : book.contentType === 'image' ? <ImageIcon size={24} /> : <PdfIcon size={24} />}
                      <span className="text-[7px] font-black uppercase mt-1">{book.contentType}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white">{book.title} {!book.isVisible && <span className="text-[8px] bg-red-600 px-2 py-0.5 rounded text-white ml-2 uppercase tracking-widest">Đang ẩn</span>}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{book.author} • {book.chapters.length} mục dữ liệu</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id)}
                      className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-800 text-gray-400 hover:text-white border border-white/5'}`}
                    >
                      {editingChaptersBookId === book.id ? 'Đóng biên tập' : 'Biên tập mục lục'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20}/></button>
                  </div>
                </div>

                {editingChaptersBookId === book.id && (
                  <div className="p-10 bg-[#0d0d0d] border-t border-white/5 animate-slide-up">
                    <div className="max-w-4xl mx-auto space-y-12">
                      <div className="bg-indigo-600/5 p-8 rounded-[2rem] border border-indigo-500/20">
                         <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><ListPlus size={18} /> Bước 1: Tạo các Chương Chính (Cấp 1)</h5>
                         <div className="flex gap-4">
                            <input type="text" placeholder="VD: Chương 1: Giới thiệu..." value={newRootTitle} onChange={e => setNewRootTitle(e.target.value)} className="flex-1 bg-black border border-white/10 rounded-xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" />
                            <button onClick={() => handleAddRootChapter(book.id)} className="bg-indigo-600 px-10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">Thêm Gốc</button>
                         </div>
                      </div>
                      <div className="space-y-8">
                         <h5 className="text-[12px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-4"><ListTree size={20} className="text-indigo-500" /> Sơ đồ cây đa tầng<div className="h-px flex-1 bg-white/5"></div></h5>
                         <div className="bg-[#050505] p-10 rounded-[3.5rem] border border-white/5 min-h-[400px] shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                            <div className="relative z-10">
                                {book.chapters.length === 0 ? <div className="text-center py-40 flex flex-col items-center justify-center"><div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-gray-800 border border-white/5 mb-8"><Minus size={32} /></div><p className="text-gray-700 font-black uppercase tracking-[0.4em] text-[12px]">Chưa có dữ liệu mục lục</p></div> : renderTreeDiagram(book)}
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

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-[#222] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl sticky top-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white mb-8 flex items-center gap-3"><FolderPlus size={20} className="text-indigo-400" /> Tạo danh mục</h2>
                    <form onSubmit={handleAddCategory} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tên danh mục</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-xs text-white outline-none" required />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">Lưu danh mục</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-[#222] p-6 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-indigo-500/30 transition-all shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={22} /></div>
                            <span className="font-bold text-sm tracking-tight">{cat.name}</span>
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

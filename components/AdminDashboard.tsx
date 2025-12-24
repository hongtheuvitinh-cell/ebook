
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

  const toggleBookVisibility = async (bookId: string, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('books').update({ is_visible: !currentStatus }).eq('id', bookId);
      if (error) throw error;
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
      const { error } = await supabase.from('chapters').update({ title: editFormData.title.trim(), url: editFormData.url || null, page_number: editFormData.stt }).eq('id', id);
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
      const { error } = await supabase.from('chapters').insert({ book_id: bookId, title: newRootTitle.trim(), page_number: currentRoots.length + 1, parent_id: null });
      if (error) throw error;
      setNewRootTitle('');
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleAddChildItem = async (bookId: string) => {
    if (!newChildItem.title.trim() || !addingToId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('chapters').insert({ book_id: bookId, title: newChildItem.title.trim(), page_number: newChildItem.stt, url: newChildItem.url.trim() || null, parent_id: addingToId });
      if (error) throw error;
      setNewChildItem({ title: '', url: '', stt: 0 });
      setAddingToId(null);
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const deleteChapter = async (id: string) => {
    if (!window.confirm("Xóa mục này?")) return;
    setIsProcessing(true);
    try { await supabase.from('chapters').delete().eq('id', id); onRefresh(); } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const renderTreeDiagram = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => (parentId === null ? !c.parentId || c.parentId === "" : c.parentId === parentId)).sort((a, b) => a.pageNumber - b.pageNumber);
    return (
      <div className={`flex flex-col gap-3 ${level > 0 ? 'ml-10 border-l border-indigo-500/10 pl-6 my-1.5' : ''}`}>
        {items.map((item) => {
          const isEditing = editingItemId === item.id;
          return (
            <div key={item.id} className="relative group">
              <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${level === 0 ? 'bg-indigo-600/5 border-indigo-500/20' : 'bg-slate-900 border-white/5'} ${isEditing ? 'ring-1 ring-yellow-500/50 bg-yellow-500/5' : ''}`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${level === 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-indigo-400 border border-white/5'}`}>
                    {isEditing ? <input type="number" className="w-full bg-transparent text-center outline-none" value={editFormData.stt} onChange={e => setEditFormData({...editFormData, stt: parseInt(e.target.value) || 0})} /> : item.pageNumber}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input type="text" className="w-full bg-black border border-white/10 rounded-md p-1.5 text-xs text-white outline-none" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} />
                        <input type="text" placeholder="Link (Tùy chọn)..." className="w-full bg-black border border-white/10 rounded-md p-1.5 text-[10px] text-gray-400 outline-none" value={editFormData.url} onChange={e => setEditFormData({...editFormData, url: e.target.value})} />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className={`tracking-tight ${level === 0 ? 'text-[13px] font-black text-white' : 'text-xs font-bold text-slate-300'}`}>{item.title}</span>
                        {item.url && <span className="text-[9px] text-slate-500 font-mono truncate max-w-[150px]">{item.url}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleUpdateChapter(item.id)} className="p-1.5 bg-green-600 text-white rounded-md"><Save size={12} /></button>
                      <button onClick={() => setEditingItemId(null)} className="p-1.5 bg-slate-700 text-white rounded-md"><CloseIcon size={12} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setAddingToId(addingToId === item.id ? null : item.id); setNewChildItem({ title: '', url: '', stt: book.chapters.filter(c => c.parentId === item.id).length + 1 }); }} className={`p-1.5 rounded-md border ${addingToId === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`}><Plus size={12} /></button>
                      <button onClick={() => { setEditingItemId(item.id); setEditFormData({ title: item.title, url: item.url || '', stt: item.pageNumber }); }} className="p-1.5 text-slate-500 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-md transition-all"><PencilLine size={12} /></button>
                      <button onClick={() => deleteChapter(item.id)} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"><Trash2 size={12}/></button>
                    </>
                  )}
                </div>
              </div>
              {addingToId === item.id && (
                <div className="ml-8 mt-2 p-4 bg-indigo-600/5 border border-indigo-500/20 rounded-xl animate-slide-up relative z-10 shadow-2xl">
                   <div className="flex items-center gap-1.5 text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-3"><CornerDownRight size={12} /> Bài mới cho: {item.title}</div>
                   <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6"><input type="text" placeholder="Tên bài..." value={newChildItem.title} onChange={e => setNewChildItem({...newChildItem, title: e.target.value})} className="w-full bg-black border border-white/5 rounded-lg p-2.5 text-xs text-white outline-none" /></div>
                      <div className="col-span-4"><input type="text" placeholder="Link PDF..." value={newChildItem.url} onChange={e => setNewChildItem({...newChildItem, url: e.target.value})} className="w-full bg-black border border-white/5 rounded-lg p-2.5 text-[11px] text-white outline-none" /></div>
                      <div className="col-span-2"><button onClick={() => handleAddChildItem(book.id)} className="w-full h-full bg-indigo-600 text-white font-black rounded-lg text-[9px] uppercase hover:bg-indigo-500">THÊM</button></div>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-10">
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-2xl transition-transform">
            <LayoutGrid size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Admin Console</h1>
            <p className="text-indigo-400/50 text-[8px] font-black uppercase tracking-[0.4em] mt-1.5">Hệ thống quản lý bài giảng</p>
          </div>
        </div>
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>Sách & Bài giảng</button>
            <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>Chuyên mục</button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-slate-900 p-8 rounded-[2rem] border border-indigo-500/20 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Đang cập nhật...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-8 animate-slide-up">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl relative group">
            <h2 className="text-[9px] font-black mb-6 uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-3">
              <PlusSquare size={16} /> Tạo bài giảng mới
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-12 gap-4 relative z-10">
              <div className="col-span-4 space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tiêu đề</label><input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" required /></div>
              <div className="col-span-3 space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tác giả</label><input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" /></div>
              <div className="col-span-3 space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase ml-1">Loại</label><select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value as any})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-indigo-400 font-bold outline-none"><option value="pdf">📄 PDF</option><option value="image">🖼️ Ảnh / Slide</option><option value="audio">🎧 Audio</option></select></div>
              <div className="col-span-2 flex items-end"><button type="submit" className="w-full h-[45px] bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-lg">Lưu lại</button></div>
              <div className="col-span-8 space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase ml-1">Đường dẫn chính (Google Drive / Link file)</label><input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" required /></div>
              <div className="col-span-4 space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase ml-1">Chuyên mục</label><select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"><option value="">-- Mặc định --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </form>
          </div>

          <div className="space-y-4">
            {books.map(book => (
              <div key={book.id} className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-white/10 transition-colors">
                <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-12 bg-slate-800 rounded-xl flex flex-col items-center justify-center text-indigo-400 border border-white/5">
                      {book.contentType === 'audio' ? <Music size={18} /> : book.contentType === 'image' ? <ImageIcon size={18} /> : <PdfIcon size={18} />}
                      <span className="text-[6px] font-black uppercase mt-1 opacity-50">{book.contentType}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h4 className="text-base font-black text-white">{book.title}</h4>
                         {!book.isVisible && <span className="text-[7px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-widest font-black border border-red-500/20">Ẩn</span>}
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{book.author} • {book.chapters.length} bài học</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleBookVisibility(book.id, book.isVisible)} className={`p-2 rounded-lg transition-all border ${!book.isVisible ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-white/5 hover:text-white'}`}>{!book.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                    <button onClick={() => setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id)} className={`px-5 h-10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'}`}>{editingChaptersBookId === book.id ? 'Đóng' : 'Mục lục'}</button>
                    <button onClick={() => { if(window.confirm("Xóa bài giảng?")) supabase.from('books').delete().eq('id', book.id).then(onRefresh); }} className="p-2 text-slate-500 hover:text-red-500 rounded-lg transition-all"><Trash2 size={16}/></button>
                  </div>
                </div>

                {editingChaptersBookId === book.id && (
                  <div className="p-6 bg-black/40 border-t border-white/5 animate-slide-up">
                    <div className="max-w-3xl mx-auto space-y-8">
                      <div className="bg-indigo-600/5 p-5 rounded-2xl border border-indigo-500/10">
                         <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListPlus size={14} /> Thêm Chương chính</h5>
                         <div className="flex gap-2">
                            <input type="text" placeholder="Tên chương chính..." value={newRootTitle} onChange={e => setNewRootTitle(e.target.value)} className="flex-1 bg-black border border-white/5 rounded-xl p-3 text-xs text-white outline-none shadow-inner" />
                            <button onClick={() => handleAddRootChapter(book.id)} className="bg-indigo-600 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">THÊM</button>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">Cấu trúc đa tầng<div className="h-[1px] flex-1 bg-white/5"></div></h5>
                         <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 min-h-[300px] shadow-inner relative">
                            {book.chapters.length === 0 ? <div className="text-center py-20 opacity-30 uppercase tracking-widest text-[10px]">Trống</div> : renderTreeDiagram(book)}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl sticky top-8">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 flex items-center gap-2"><FolderPlus size={16} /> Tạo chuyên mục</h2>
                    <form onSubmit={handleAddCategory} className="space-y-4">
                        <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} placeholder="Tên chuyên mục..." className="w-full bg-black border border-white/5 rounded-xl p-3.5 text-xs text-white outline-none" required />
                        <button type="submit" className="w-full bg-indigo-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl transition-all">Lưu lại</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-slate-800 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={18} /></div>
                            <span className="font-bold text-xs tracking-tight">{cat.name}</span>
                        </div>
                        <button onClick={() => { if(window.confirm("Xóa chuyên mục?")) supabase.from('categories').delete().eq('id', cat.id).then(onRefresh); }} className="p-1.5 text-slate-500 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

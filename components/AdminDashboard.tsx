
import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, FileText as PdfIcon, Headphones, AlertCircle, Loader2, BookOpen, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
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

  // Helper để hiển thị phân cấp chương trong Admin
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400 font-serif">Quản Trị Hệ Thống</h1>
          <p className="text-gray-500 text-xs mt-1">Quản lý kho sách, mục lục và phân cấp nội dung</p>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 shadow-inner">
            <button onClick={() => setActiveTab('books')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Sách & Chương</button>
            <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Danh Mục</button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-indigo-500/30">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-sm font-bold text-indigo-300">Đang xử lý dữ liệu...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8 shadow-xl">
            <h2 className="text-sm font-bold mb-6 uppercase tracking-widest text-indigo-300 flex items-center gap-2"><Plus size={18}/> Thêm Sách Mới</h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Ví dụ: Lược sử thời gian" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Stephen Hawking" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Đường dẫn file gốc (PDF/Bìa/Audio)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none" placeholder="https://..." required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Loại nội dung</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none">
                  <option value="pdf">Tài liệu PDF</option>
                  <option value="image">Sách Hình (Từng tấm ảnh)</option>
                  <option value="audio">Sách Nói (File âm thanh)</option>
                </select>
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-4 rounded-xl font-bold hover:bg-indigo-500 transition-all text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.98]">LƯU SÁCH VÀO HỆ THỐNG</button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">Danh sách sách hiện có</h3>
            {books.map(book => (
              <div key={book.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-gray-600">
                <div className="p-5 flex items-center justify-between gap-4 bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-indigo-400 shadow-inner">
                      {book.contentType === 'pdf' ? <PdfIcon size={24}/> : book.contentType === 'image' ? <ImageIcon size={24}/> : <Headphones size={24}/>}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{book.title}</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{book.author} • {book.chapters.length} mục lục</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id);
                            setNewChapter({ title: '', pageNumber: book.chapters.length + 1, url: '', parentId: '' });
                        }} 
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all border ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-gray-700 text-gray-300 border-gray-600 hover:text-white hover:bg-gray-600'}`}
                    >
                        {editingChaptersBookId === book.id ? 'ĐÓNG QUẢN LÝ' : 'QUẢN LÝ MỤC LỤC'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Xóa sách"><Trash2 size={18}/></button>
                  </div>
                </div>

                {editingChaptersBookId === book.id && (
                  <div className="p-6 bg-gray-900/60 border-t border-gray-700 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2"><List size={14}/> Thiết lập mục lục phân cấp</h4>
                        <span className="text-[9px] text-gray-500 italic">Mục không chọn Cha sẽ nằm ở cấp cao nhất</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold ml-1">Tiêu đề (Chương/Bài)</label>
                            <input type="text" placeholder="Ví dụ: Chương 1 hoặc Bài 1..." value={newChapter.title} onChange={e => setNewChapter({...newChapter, title: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded p-2.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold ml-1">Thứ tự (STT)</label>
                            <input type="number" placeholder="STT" value={newChapter.pageNumber} onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-700 rounded p-2.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={() => handleAddChapter(book)} className="w-full bg-indigo-600 text-white font-bold rounded-lg p-2.5 text-[10px] flex items-center justify-center gap-1 hover:bg-indigo-500 transition-all shadow-lg active:scale-95"><Plus size={14}/> THÊM VÀO MỤC LỤC</button>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold ml-1">Nằm trong (Chương cha)</label>
                            <select value={newChapter.parentId} onChange={e => setNewChapter({...newChapter, parentId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded p-2.5 text-xs outline-none focus:border-indigo-500">
                                <option value="">-- Là Chương gốc (Không có cha) --</option>
                                {book.chapters.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold ml-1">Đường dẫn riêng cho mục này (Nếu có)</label>
                            <input type="text" placeholder="https://... (Bỏ trống nếu dùng chung link sách)" value={newChapter.url} onChange={e => setNewChapter({...newChapter, url: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded p-2.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                    </div>

                    <div className="space-y-1 bg-gray-950/30 p-4 rounded-xl border border-gray-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {book.chapters.length === 0 ? (
                            <div className="text-center py-10 text-gray-600 italic text-[10px] uppercase">Chưa có dữ liệu mục lục</div>
                        ) : renderAdminChapters(book.chapters)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tương tự cho CATEGORIES tab nếu cần */}
    </div>
  );
};

export default AdminDashboard;

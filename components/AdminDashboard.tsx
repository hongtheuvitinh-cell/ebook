import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { Plus, Trash2, List, FolderPlus, Folder, Database, Image as ImageIcon, FileText as PdfIcon, Headphones, AlertCircle, Loader2, Code, Copy, Check, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
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
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // State quản lý việc mở rộng phần thêm chương
  const [editingChaptersBookId, setEditingChaptersBookId] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState({ title: '', pageNumber: 1, url: '' });

  // --- SQL FOR FIXING ---
  const FIX_SQL = `ALTER TABLE "public"."books" ADD COLUMN IF NOT EXISTS "content_type" text DEFAULT 'pdf';`;

  // --- BOOK STATE ---
  const [newBook, setNewBook] = useState({ 
    title: '', 
    author: '', 
    url: '', 
    categoryId: '', 
    contentType: 'pdf' as 'pdf' | 'image' | 'audio' 
  });

  // --- CATEGORY STATE ---
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(FIX_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- HANDLERS FOR BOOKS ---
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.url) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from('books').insert({
        title: newBook.title,
        author: newBook.author || 'Chưa rõ',
        url: newBook.url,
        category_id: newBook.categoryId || null,
        content_type: newBook.contentType,
        is_visible: true
      });

      if (error) throw error;
      setNewBook({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      if (err.message.includes('content_type')) {
        setShowSqlHelp(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa cuốn sách này và toàn bộ chương liên quan?")) return;
    setIsProcessing(true);
    try {
      // Supabase thường tự cascade delete nếu bạn cấu hình FK, 
      // nếu không ta xóa chapters trước
      await supabase.from('chapters').delete().eq('book_id', id);
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  // --- HANDLERS FOR CHAPTERS ---
  const handleAddChapter = async (bookId: string) => {
    if (!newChapter.title) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newChapter.title,
        page_number: newChapter.pageNumber,
        url: newChapter.url || null
      });
      if (error) throw error;
      setNewChapter({ title: '', pageNumber: 1, url: '' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!window.confirm("Xóa chương này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLERS FOR CATEGORIES ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parentId || null
      });

      if (error) throw error;
      setNewCategory({ name: '', description: '', parentId: '' });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const hasBooks = books.some(b => b.categoryId === id);
    if (hasBooks) {
      alert("Không thể xóa danh mục này vì vẫn còn sách bên trong.");
      return;
    }

    if (!window.confirm("Xóa danh mục này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400 font-serif">Quản Trị Hệ Thống</h1>
          <p className="text-gray-500 text-sm">Quản lý kho sách và nội dung đa bài học</p>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 shadow-inner">
            <button 
              onClick={() => setActiveTab('books')} 
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <BookOpen size={16}/> Sách & Chương
            </button>
            <button 
              onClick={() => setActiveTab('categories')} 
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Folder size={16}/> Danh Mục
            </button>
        </div>
      </div>

      {/* --- ERROR MESSAGE --- */}
      {errorMessage && (
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-6">
           <div className="flex items-center gap-3 text-red-400 mb-2 font-bold"><AlertCircle size={20} /> Lỗi: {errorMessage}</div>
           {showSqlHelp && (
             <div className="mt-4 bg-black/40 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-gray-300 mb-2">Chạy lệnh này trong SQL Editor:</p>
                <code className="block bg-gray-900 p-2 rounded text-indigo-400 text-xs mb-3">{FIX_SQL}</code>
                <button onClick={copyToClipboard} className="text-[10px] bg-gray-800 px-3 py-1.5 rounded uppercase font-bold">{copied ? 'Đã chép' : 'Chép SQL'}</button>
             </div>
           )}
           <button onClick={() => setErrorMessage(null)} className="mt-2 text-[10px] opacity-50 underline">Đóng</button>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 p-4 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-500">
                <Loader2 className="animate-spin text-indigo-500" />
                <span className="font-bold">Đang lưu dữ liệu...</span>
            </div>
        </div>
      )}

      {/* --- TAB: BOOKS --- */}
      {activeTab === 'books' && (
        <>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300"><Plus size={20}/> Thêm Sách Mới</h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Tên sách" required />
              <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Tác giả" />
              <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500">
                <option value="">-- Danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="md:col-span-2 bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Link file (PDF/Img/Audio)" required />
              <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                  {['pdf', 'image', 'audio'].map(type => (
                    <button key={type} type="button" onClick={() => setNewBook({...newBook, contentType: type as any})} className={`flex-1 text-[10px] font-bold py-2 rounded uppercase transition-all ${newBook.contentType === type ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>{type}</button>
                  ))}
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-500 flex items-center justify-center gap-2">XÁC NHẬN THÊM SÁCH</button>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase ml-1">Danh sách sách & Chương bài</h3>
            {books.map(book => (
              <div key={book.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg transition-all">
                <div className="p-4 flex items-center justify-between gap-4 bg-gray-800/80">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center text-indigo-400">
                      {book.contentType === 'pdf' ? <PdfIcon /> : book.contentType === 'image' ? <ImageIcon /> : <Headphones />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{book.title}</h3>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{book.author} • {book.chapters.length} chương</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id)} 
                      className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                    >
                      <List size={16}/> {editingChaptersBookId === book.id ? 'Đóng' : 'Quản lý chương'}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40"><Trash2 size={16}/></button>
                  </div>
                </div>

                {/* --- CHAPTERS MANAGEMENT AREA --- */}
                {editingChaptersBookId === book.id && (
                  <div className="p-4 bg-gray-900/50 border-t border-gray-700 animate-slide-up">
                    <h4 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2"><List size={14}/> Danh sách bài học / Chương</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6 bg-gray-800 p-3 rounded-xl border border-gray-700">
                        <input 
                          type="text" 
                          placeholder="Tên chương/bài" 
                          value={newChapter.title} 
                          onChange={e => setNewChapter({...newChapter, title: e.target.value})}
                          className="md:col-span-2 bg-gray-900 border border-gray-700 rounded p-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <input 
                          type="number" 
                          placeholder="Trang số" 
                          value={newChapter.pageNumber} 
                          onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value) || 1})}
                          className="bg-gray-900 border border-gray-700 rounded p-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <button 
                          onClick={() => handleAddChapter(book.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded p-2 text-xs flex items-center justify-center gap-2"
                        >
                          <Plus size={14}/> THÊM BÀI
                        </button>
                        <input 
                          type="text" 
                          placeholder="Link riêng cho chương này (nếu có, nếu không sẽ dùng link sách)" 
                          value={newChapter.url} 
                          onChange={e => setNewChapter({...newChapter, url: e.target.value})}
                          className="md:col-span-4 bg-gray-900 border border-gray-700 rounded p-2 text-xs outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        {book.chapters.length === 0 ? (
                          <p className="text-center text-xs text-gray-600 py-4">Chưa có chương nào được tạo.</p>
                        ) : (
                          book.chapters.map((ch, idx) => (
                            <div key={ch.id} className="flex items-center justify-between bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 group">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-indigo-900/50 text-indigo-400 text-[10px] font-bold rounded-full flex items-center justify-center border border-indigo-500/20">{idx + 1}</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">{ch.title}</p>
                                        <p className="text-[10px] text-gray-500">Trang: {ch.pageNumber} {ch.url && '• Có link riêng'}</p>
                                    </div>
                                </div>
                                <button onClick={() => deleteChapter(ch.id)} className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                          ))
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- TAB: CATEGORIES --- */}
      {activeTab === 'categories' && (
        <div className="animate-slide-up">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300"><FolderPlus size={20}/> Tạo Danh Mục Mới</h2>
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Tên danh mục" required />
              <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500">
                <option value="">-- Danh mục cha --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="md:col-span-2 bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Mô tả danh mục" />
              <button type="submit" className="md:col-span-2 bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-500 flex items-center justify-center gap-2">TẠO DANH MỤC</button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {categories.map(cat => (
              <div key={cat.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Folder className="text-indigo-400" size={20}/>
                    <div>
                      <h3 className="font-bold text-white text-sm">{cat.name}</h3>
                      <p className="text-[10px] text-gray-500">{books.filter(b => b.categoryId === cat.id).length} sách</p>
                    </div>
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
              </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

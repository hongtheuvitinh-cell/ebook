import React, { useState } from 'react';
import { Book, Category } from '../types';
import { Plus, Trash2, Eye, EyeOff, Book as BookIcon, List, FileText, X, FolderPlus, Folder, Layers, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onRefresh: () => void; // Trigger reload data in App
}

// CẬP NHẬT SQL: Chia quyền rõ ràng (Public Read, Admin Write)
const RLS_SQL_FIX = `
-- COPY TOÀN BỘ đoạn này và chạy trong Supabase SQL Editor --

-- 1. Bảng Categories
alter table "public"."categories" enable row level security;
-- Xóa policy cũ
drop policy if exists "Enable all access for categories" on "public"."categories";
drop policy if exists "Public Read Categories" on "public"."categories";
drop policy if exists "Admin Write Categories" on "public"."categories";
-- Tạo policy mới
create policy "Public Read Categories" on "public"."categories" for select to public using (true);
create policy "Admin Write Categories" on "public"."categories" for all to authenticated using (true) with check (true);

-- 2. Bảng Books
alter table "public"."books" enable row level security;
drop policy if exists "Enable all access for books" on "public"."books";
drop policy if exists "Public Read Books" on "public"."books";
drop policy if exists "Admin Write Books" on "public"."books";
create policy "Public Read Books" on "public"."books" for select to public using (true);
create policy "Admin Write Books" on "public"."books" for all to authenticated using (true) with check (true);

-- 3. Bảng Chapters
alter table "public"."chapters" enable row level security;
drop policy if exists "Enable all access for chapters" on "public"."chapters";
drop policy if exists "Public Read Chapters" on "public"."chapters";
drop policy if exists "Admin Write Chapters" on "public"."chapters";
create policy "Public Read Chapters" on "public"."chapters" for select to public using (true);
create policy "Admin Write Chapters" on "public"."chapters" for all to authenticated using (true) with check (true);
`;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ books, setBooks, categories, setCategories, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'categories'>('books');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State lỗi RLS
  const [showRlsHelp, setShowRlsHelp] = useState(false);

  // --- BOOK STATE ---
  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '' });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState({ title: '', pageNumber: 1, url: '' });

  // --- CATEGORY STATE ---
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

  // Helper handle error
  const handleError = (err: any) => {
      console.error(err);
      if (err.message && (err.message.includes('row-level security') || err.code === '42501')) {
          setShowRlsHelp(true);
      } else {
          alert("Lỗi: " + err.message);
      }
  };

  // ================= BOOK HANDLERS (SUPABASE) =================

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
        is_visible: true
      });

      if (error) throw error;
      
      setNewBook({ title: '', author: '', url: '', categoryId: '' });
      onRefresh(); // Reload data
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVisibility = async (book: Book) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_visible: !book.isVisible })
        .eq('id', book.id);

      if (error) throw error;
      
      // Optimistic Update (Cập nhật giao diện ngay lập tức cho mượt)
      setBooks(books.map(b => b.id === book.id ? { ...b, isVisible: !b.isVisible } : b));
    } catch (err: any) {
      handleError(err);
      onRefresh(); // Revert on error
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuốn sách này không?")) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      
      setBooks(books.filter(b => b.id !== id)); // Optimistic UI
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddChapter = async (bookId: string) => {
    if (!newChapter.title) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase.from('chapters').insert({
        book_id: bookId,
        title: newChapter.title,
        page_number: Number(newChapter.pageNumber) || 1,
        url: newChapter.url.trim() !== '' ? newChapter.url.trim() : null
      });

      if (error) throw error;

      setNewChapter({ title: '', pageNumber: 1, url: '' });
      onRefresh(); // Cần reload để lấy ID mới của chapter
    } catch (err: any) {
      handleError(err);
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
       handleError(err);
    } finally {
       setIsProcessing(false);
    }
  };

  // ================= CATEGORY HANDLERS (SUPABASE) =================

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
      } catch (err: any) {
        handleError(err);
      } finally {
        setIsProcessing(false);
      }
  };

  const handleDeleteCategory = async (id: string) => {
      const hasChildren = categories.some(c => c.parentId === id);
      const hasBooks = books.some(b => b.categoryId === id);

      if (hasChildren || hasBooks) {
          if (!window.confirm("Danh mục này đang chứa Sách hoặc Danh mục con. Bạn có chắc chắn muốn xóa? (Sách sẽ mất phân loại)")) {
              return;
          }
      } else {
          if (!window.confirm("Xóa danh mục này?")) return;
      }
      
      setIsProcessing(true);
      try {
          const { error } = await supabase.from('categories').delete().eq('id', id);
          if (error) throw error;
          onRefresh(); // Refresh để update lại danh sách sách (mất category)
      } catch (err: any) {
          handleError(err);
      } finally {
          setIsProcessing(false);
      }
  };

  const getParentName = (parentId?: string) => {
      if (!parentId) return "Gốc (Root)";
      const parent = categories.find(c => c.id === parentId);
      return parent ? parent.name : "Không xác định";
  };

  // ================= RENDER =================

  return (
    <div className="container mx-auto px-4 py-8 text-white relative">
      
      {/* RLS ERROR MODAL */}
      {showRlsHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border border-red-500 rounded-xl max-w-2xl w-full shadow-2xl p-6">
                  <div className="flex items-center gap-3 text-red-500 mb-4">
                      <AlertTriangle size={32} />
                      <h2 className="text-xl font-bold">Lỗi Quyền Truy Cập (Row Level Security)</h2>
                  </div>
                  <p className="text-gray-300 mb-4">
                      Supabase đang chặn bạn ghi dữ liệu vì chưa có "Policy". Hãy chạy lệnh SQL sau trong <strong>Supabase SQL Editor</strong> để mở quyền truy cập cho Admin:
                  </p>
                  
                  <div className="bg-black rounded-lg p-4 border border-gray-700 font-mono text-xs text-green-400 overflow-x-auto mb-6 relative group">
                      <pre>{RLS_SQL_FIX}</pre>
                      <button 
                        onClick={() => navigator.clipboard.writeText(RLS_SQL_FIX)}
                        className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          Copy
                      </button>
                  </div>

                  <div className="flex justify-end">
                      <button 
                        onClick={() => setShowRlsHelp(false)}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                          Đã hiểu, đóng lại
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-indigo-400">Trang Quản Trị (Admin)</h1>
        
        {/* TABS */}
        <div className="flex bg-gray-800 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('books')}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <BookIcon size={16} /> Quản Lý Sách
            </button>
            <button 
                onClick={() => setActiveTab('categories')}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <Layers size={16} /> Quản Lý Danh Mục
            </button>
        </div>
      </div>

      {isProcessing && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-3 shadow-xl border border-gray-700">
                 <Loader2 className="animate-spin text-indigo-500" />
                 <span>Đang xử lý dữ liệu...</span>
             </div>
         </div>
      )}

      {/* ================= TAB: BOOKS ================= */}
      {activeTab === 'books' && (
          <>
            {/* Form Thêm Sách */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-10 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} /> Thêm sách mới
                </h2>
                <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                    type="text"
                    placeholder="Tên sách"
                    value={newBook.title}
                    onChange={e => setNewBook({...newBook, title: e.target.value})}
                    className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                    required
                />
                <input
                    type="text"
                    placeholder="Tác giả"
                    value={newBook.author}
                    onChange={e => setNewBook({...newBook, author: e.target.value})}
                    className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                />
                
                {/* Chọn danh mục */}
                <select 
                    value={newBook.categoryId} 
                    onChange={e => setNewBook({...newBook, categoryId: e.target.value})}
                    className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                >
                    <option value="">-- Không chọn danh mục --</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name} {c.parentId ? '(Mục con)' : '(Mục gốc)'}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="URL File PDF (Bắt buộc)"
                    value={newBook.url}
                    onChange={e => setNewBook({...newBook, url: e.target.value})}
                    className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                    required
                />
                <button type="submit" disabled={isProcessing} className="md:col-span-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg p-3 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                    <Plus size={18} /> Thêm vào kho
                </button>
                </form>
            </div>

            {/* Danh sách sách */}
            <h2 className="text-xl font-semibold mb-4">Danh sách sách trong Database</h2>
            <div className="space-y-4">
                {books.length === 0 && <p className="text-gray-500 italic">Chưa có sách nào.</p>}
                {books.map(book => (
                <div key={book.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-900/50">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-12 bg-gray-700 flex items-center justify-center rounded shrink-0">
                                <BookIcon size={20} className="text-gray-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">{book.title}</h3>
                                <p className="text-sm text-gray-400">
                                    {book.author} • {book.chapters.length} mục
                                    {book.categoryId && (
                                        <span className="ml-2 px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 text-xs border border-indigo-700/50">
                                            {categories.find(c => c.id === book.categoryId)?.name || 'Unknown Cat'}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => toggleVisibility(book)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                book.isVisible 
                                    ? 'bg-green-900/30 text-green-400 border-green-700 hover:bg-green-900/50' 
                                    : 'bg-red-900/30 text-red-400 border-red-700 hover:bg-red-900/50'
                                }`}
                            >
                                {book.isVisible ? <><Eye size={14} /> Hiện</> : <><EyeOff size={14} /> Ẩn</>}
                            </button>
                            
                            <button 
                                onClick={() => setEditingBookId(editingBookId === book.id ? null : book.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    editingBookId === book.id
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                                }`}
                            >
                                <List size={14} /> Quản lý Tập/Chương
                            </button>

                            <button onClick={() => deleteBook(book.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Khu vực quản lý chương (Expandable) */}
                    {editingBookId === book.id && (
                        <div className="p-4 bg-gray-800/80 border-t border-gray-700 animate-slide-up">
                            <h4 className="font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                                <FileText size={16} /> Danh sách các phần của sách
                            </h4>
                            
                            {/* List chapters */}
                            <div className="space-y-2 mb-4">
                                {book.chapters.length === 0 && <p className="text-sm text-gray-500 italic">Chưa có mục nào.</p>}
                                {book.chapters.map(chapter => (
                                    <div key={chapter.id} className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-700">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-gray-200">{chapter.title}</div>
                                            <div className="text-xs text-gray-500">
                                                {chapter.url ? <span className="text-green-400">Link riêng</span> : 'Dùng file gốc'} 
                                                {' • '} Trang bắt đầu: {chapter.pageNumber}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteChapter(chapter.id)} className="text-gray-500 hover:text-red-400 p-1">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Chapter Form */}
                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">Thêm mục mới</h5>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                    <div className="md:col-span-4">
                                        <input 
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                                            placeholder="Tên (VD: Tập 1, Chương 1...)"
                                            value={newChapter.title}
                                            onChange={e => setNewChapter({...newChapter, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input 
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                                            placeholder="Trang số"
                                            type="number"
                                            min="1"
                                            value={newChapter.pageNumber}
                                            onChange={e => setNewChapter({...newChapter, pageNumber: parseInt(e.target.value)})}
                                        />
                                    </div>
                                    <div className="md:col-span-5">
                                        <input 
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                                            placeholder="URL PDF (để trống nếu dùng file gốc)"
                                            value={newChapter.url}
                                            onChange={e => setNewChapter({...newChapter, url: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <button 
                                            onClick={() => handleAddChapter(book.id)}
                                            className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center justify-center"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                ))}
            </div>
          </>
      )}

      {/* ================= TAB: CATEGORIES ================= */}
      {activeTab === 'categories' && (
          <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-10 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FolderPlus size={20} /> Tạo danh mục mới
                </h2>
                <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Tên danh mục (VD: Truyện tranh)"
                        value={newCategory.name}
                        onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                        className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                        required
                    />
                    
                    <select
                        value={newCategory.parentId}
                        onChange={e => setNewCategory({...newCategory, parentId: e.target.value})}
                        className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                    >
                        <option value="">-- Là danh mục Gốc --</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Mô tả ngắn"
                        value={newCategory.description}
                        onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                        className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                    />

                    <button type="submit" disabled={isProcessing} className="md:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg p-3 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                        <Plus size={18} /> Tạo danh mục
                    </button>
                </form>
            </div>

            <h2 className="text-xl font-semibold mb-4">Cấu trúc danh mục hiện tại</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900 text-gray-200 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-3">Tên danh mục</th>
                            <th className="px-6 py-3">Danh mục cha</th>
                            <th className="px-6 py-3">Mô tả</th>
                            <th className="px-6 py-3 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {categories.map(cat => (
                            <tr key={cat.id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                    <Folder size={16} className={cat.parentId ? "text-gray-500 ml-4" : "text-indigo-400"} />
                                    {cat.name}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs border ${cat.parentId ? 'bg-gray-700 border-gray-600' : 'bg-indigo-900/30 border-indigo-700/30 text-indigo-300'}`}>
                                        {getParentName(cat.parentId)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{cat.description || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 transition-colors"
                                        title="Xóa danh mục"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center italic text-gray-500">Chưa có danh mục nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </>
      )}

    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { Book, Category } from '../types';
import { Plus, Trash2, Eye, EyeOff, Book as BookIcon, List, FileText, X, FolderPlus, Folder, Layers, Loader2, Database, Image as ImageIcon, FileText as PdfIcon, Headphones } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onRefresh: () => void;
}

const RLS_SQL_FIX = `-- Cập nhật cấu trúc bảng cho loại sách mới
ALTER TABLE "public"."books" ADD COLUMN IF NOT EXISTS "content_type" text DEFAULT 'pdf';

-- SQL Setup commands...
-- 1. Bảng Categories
alter table "public"."categories" enable row level security;
create policy "Public Read Categories" on "public"."categories" for select to public using (true);
create policy "Admin Write Categories" on "public"."categories" for all to authenticated using (true) with check (true);

-- 2. Bảng Books
alter table "public"."books" enable row level security;
create policy "Public Read Books" on "public"."books" for select to public using (true);
create policy "Admin Write Books" on "public"."books" for all to authenticated using (true) with check (true);`;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ books, setBooks, categories, setCategories, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'categories'>('books');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRlsHelp, setShowRlsHelp] = useState(false);

  const [newBook, setNewBook] = useState({ 
    title: '', 
    author: '', 
    url: '', 
    categoryId: '', 
    contentType: 'pdf' as 'pdf' | 'image' | 'audio' 
  });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

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
        is_visible: true
      });

      if (error) throw error;
      setNewBook({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' });
      onRefresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa cuốn sách này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-400 font-serif">Quản Trị Hệ Thống</h1>
        <div className="flex bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setActiveTab('books')} className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Sách</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>Danh Mục</button>
        </div>
      </div>

      {activeTab === 'books' && (
        <>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300"><Plus size={20}/> Thêm Sách Mới</h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="VD: Đắc Nhân Tâm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="VD: Dale Carnegie" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Đường dẫn file (PDF/Ảnh/Audio MP3)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="https://..." required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Loại nội dung</label>
                <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700 h-[50px]">
                    <button type="button" onClick={() => setNewBook({...newBook, contentType: 'pdf'})} className={`flex-1 flex items-center justify-center gap-1 rounded-md transition-all text-[10px] font-bold ${newBook.contentType === 'pdf' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                        <PdfIcon size={14}/> PDF
                    </button>
                    <button type="button" onClick={() => setNewBook({...newBook, contentType: 'image'})} className={`flex-1 flex items-center justify-center gap-1 rounded-md transition-all text-[10px] font-bold ${newBook.contentType === 'image' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                        <ImageIcon size={14}/> HÌNH
                    </button>
                    <button type="button" onClick={() => setNewBook({...newBook, contentType: 'audio'})} className={`flex-1 flex items-center justify-center gap-1 rounded-md transition-all text-[10px] font-bold ${newBook.contentType === 'audio' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                        <Headphones size={14}/> NÓI
                    </button>
                </div>
              </div>
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg">
                <Plus size={20}/> XÁC NHẬN THÊM VÀO KHO
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {books.map(book => (
              <div key={book.id} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-colors">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-16 rounded flex items-center justify-center shadow-lg ${
                      book.contentType === 'pdf' ? 'bg-red-900/30 text-red-500' : 
                      book.contentType === 'image' ? 'bg-green-900/30 text-green-500' : 
                      'bg-indigo-900/30 text-indigo-500'
                    }`}>
                      {book.contentType === 'pdf' ? <PdfIcon /> : book.contentType === 'image' ? <ImageIcon /> : <Headphones />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{book.title}</h3>
                      <p className="text-xs text-gray-500">{book.author} • <span className="uppercase text-indigo-400 font-bold">{book.contentType}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingBookId(editingBookId === book.id ? null : book.id)} className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"><List size={18}/></button>
                    <button onClick={() => deleteBook(book.id)} className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

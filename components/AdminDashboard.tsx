import React, { useState } from 'react';
import { Book, Category } from '../types';
import { Plus, Trash2, List, FolderPlus, Folder, Database, Image as ImageIcon, FileText as PdfIcon, Headphones, AlertCircle, Loader2 } from 'lucide-react';
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

  // --- HANDLERS FOR BOOKS ---
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

  // --- HANDLERS FOR CATEGORIES ---
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
      alert("Lỗi khi thêm danh mục: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const hasBooks = books.some(b => b.categoryId === id);
    if (hasBooks) {
      alert("Không thể xóa danh mục này vì vẫn còn sách bên trong. Hãy chuyển sách sang danh mục khác trước.");
      return;
    }

    if (!window.confirm("Xóa danh mục này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400 font-serif">Quản Trị Hệ Thống</h1>
          <p className="text-gray-500 text-sm">Quản lý kho sách, danh mục và nội dung đa phương tiện</p>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 shadow-inner">
            <button 
              onClick={() => setActiveTab('books')} 
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'books' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={16}/> Sách
            </button>
            <button 
              onClick={() => setActiveTab('categories')} 
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Folder size={16}/> Danh Mục
            </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-gray-800 p-4 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-500/50">
                <Loader2 className="animate-spin text-indigo-500" />
                <span className="font-bold text-sm">Đang xử lý...</span>
            </div>
        </div>
      )}

      {/* --- TAB: BOOKS --- */}
      {activeTab === 'books' && (
        <>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 shadow-lg">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300"><Plus size={20}/> Thêm Sách Mới</h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" placeholder="VD: Đắc Nhân Tâm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Tác giả</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" placeholder="VD: Dale Carnegie" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Danh mục</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Đường dẫn file (PDF/Ảnh/Audio MP3)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" placeholder="https://..." required />
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
              <button type="submit" className="md:col-span-3 bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg active:scale-95">
                <Plus size={20}/> XÁC NHẬN THÊM SÁCH
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <h3 className="text-gray-400 text-xs font-bold uppercase ml-1">Danh sách sách hiện có ({books.length})</h3>
            {books.map(book => (
              <div key={book.id} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-colors group">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-16 rounded flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
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
                    <button onClick={() => deleteBook(book.id)} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition-colors shadow-sm" title="Xóa sách"><Trash2 size={18}/></button>
                  </div>
                </div>
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
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Tên danh mục</label>
                <input 
                  type="text" 
                  value={newCategory.name} 
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="VD: Kỹ năng sống, Văn học..." 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Danh mục cha (nếu có)</label>
                <select 
                  value={newCategory.parentId} 
                  onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- Không có (Danh mục gốc) --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Mô tả ngắn</label>
                <input 
                  type="text" 
                  value={newCategory.description} 
                  onChange={e => setNewCategory({...newCategory, description: e.target.value})} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Mô tả sơ lược về danh mục này..." 
                />
              </div>
              <button type="submit" className="md:col-span-2 bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg active:scale-95">
                <FolderPlus size={20}/> TẠO DANH MỤC
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {categories.length === 0 ? (
               <div className="col-span-full py-12 text-center bg-gray-800/20 border border-dashed border-gray-700 rounded-xl text-gray-500 italic">
                  Chưa có danh mục nào được tạo.
               </div>
             ) : (
               categories.map(cat => {
                 const bookCount = books.filter(b => b.categoryId === cat.id).length;
                 const parent = categories.find(c => c.id === cat.parentId);
                 return (
                  <div key={cat.id} className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl flex flex-col justify-between group hover:border-indigo-500/50 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                           <div className="p-2 bg-indigo-900/30 text-indigo-400 rounded-lg"><Folder size={20}/></div>
                           <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/10 rounded transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">{cat.name}</h3>
                        {parent && <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Cha: {parent.name}</span>}
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{cat.description || 'Không có mô tả.'}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{bookCount} Sách</span>
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      </div>
                  </div>
                 )
               })
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { Book, Category, Chapter } from '../types';
import { 
  Plus, Trash2, List, FolderPlus, Folder, Image as ImageIcon, 
  FileText as PdfIcon, Headphones, AlertCircle, Loader2, 
  BookOpen, ExternalLink, ChevronRight, ChevronDown, Layers, Info,
  PlusCircle, LayoutGrid, PencilLine, FilePlus2, ListPlus, CornerDownRight, 
  PlusSquare, ListTree, Link2, Hash
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
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingToParentId, setAddingToParentId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ title: '', url: '', pageNumber: 0 });

  const [newBook, setNewBook] = useState({ title: '', author: '', url: '', categoryId: '', contentType: 'pdf' as any });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });

  // --- HANDLERS ---

  // Fix: Added missing deleteBook function
  const deleteBook = async (id: string) => {
    if (!window.confirm("Xóa sách này và toàn bộ mục lục?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  // Fix: Added missing handleAddCategory function
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

  // Fix: Added missing deleteCategory function
  const deleteCategory = async (id: string) => {
    if (!window.confirm("Xóa danh mục này?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

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

  const handleQuickAddChapter = async (book: Book) => {
    if (!newChapterTitle.trim()) return;
    setIsProcessing(true);
    try {
      const maxPage = book.chapters.filter(c => !c.parentId).reduce((max, c) => Math.max(max, c.pageNumber), 0);
      const { error } = await supabase.from('chapters').insert({
        book_id: book.id,
        title: newChapterTitle.trim(),
        page_number: maxPage + 1,
        parent_id: null
      });
      if (error) throw error;
      setNewChapterTitle('');
      onRefresh();
    } catch (err: any) { setErrorMessage(err.message); } finally { setIsProcessing(false); }
  };

  const handleQuickAddLesson = async (book: Book) => {
    if (!newLesson.title.trim() || !addingToParentId) return;
    setIsProcessing(true);
    try {
      const siblings = book.chapters.filter(c => c.parentId === addingToParentId);
      const autoPage = newLesson.pageNumber || (siblings.length + 1);
      
      const { error } = await supabase.from('chapters').insert({
        book_id: book.id,
        title: newLesson.title.trim(),
        page_number: autoPage,
        url: newLesson.url.trim() || null,
        parent_id: addingToParentId
      });
      if (error) throw error;
      setNewLesson({ title: '', url: '', pageNumber: 0 });
      setAddingToParentId(null);
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

  const renderAdminTree = (book: Book, parentId: string | null = null, level = 0) => {
    const items = book.chapters.filter(c => c.parentId === parentId).sort((a, b) => a.pageNumber - b.pageNumber);
    
    return (
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="group">
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${level === 0 ? 'bg-indigo-600/10 border-indigo-500/20 shadow-sm' : 'bg-gray-800/40 border-white/5 ml-8 border-l-2 border-l-indigo-500/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${level === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  {item.pageNumber}
                </div>
                <div>
                  <h5 className={`text-sm ${level === 0 ? 'font-black text-white uppercase tracking-tight' : 'font-medium text-gray-300'}`}>
                    {item.title}
                  </h5>
                  {item.url && <p className="text-[9px] text-indigo-400/50 font-mono truncate max-w-[200px] mt-0.5">{item.url}</p>}
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {level === 0 && (
                  <button 
                    onClick={() => {
                      setAddingToParentId(addingToParentId === item.id ? null : item.id);
                      setNewLesson(prev => ({ ...prev, pageNumber: book.chapters.filter(c => c.parentId === item.id).length + 1 }));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-lg"
                  >
                    <Plus size={12} /> THÊM BÀI
                  </button>
                )}
                <button onClick={() => deleteChapter(item.id)} className="p-2 text-gray-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
              </div>
            </div>

            {/* Form thêm bài con nhanh ngay dưới chương */}
            {addingToParentId === item.id && (
              <div className="ml-8 mt-2 p-4 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl animate-slide-up flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                  <PlusSquare size={14} /> Thêm bài mới vào {item.title}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5 relative">
                    <input 
                      type="text" 
                      placeholder="Tên bài (VD: Bài 1: Đại cương...)" 
                      value={newLesson.title}
                      onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                      className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <input 
                      type="text" 
                      placeholder="Link riêng (Nếu có)" 
                      value={newLesson.url}
                      onChange={e => setNewLesson({...newLesson, url: e.target.value})}
                      className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input 
                      type="number" 
                      placeholder="STT" 
                      value={newLesson.pageNumber || ''}
                      onChange={e => setNewLesson({...newLesson, pageNumber: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-xs text-white text-center focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button 
                      onClick={() => handleQuickAddLesson(book)}
                      className="w-full h-full bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase hover:bg-indigo-500"
                    >
                      LƯU BÀI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {renderAdminTree(book, item.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white max-w-6xl min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 italic">
            <ListTree className="text-indigo-500" size={36} /> DASHBOARD
          </h1>
          <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Hệ thống biên tập tri thức</p>
        </div>
        <div className="flex bg-[#2a2a2a] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('books')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'books' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                SÁCH & MỤC LỤC
            </button>
            <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                DANH MỤC
            </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#2a2a2a] p-10 rounded-[2.5rem] border border-indigo-500/30 flex flex-col items-center gap-4 shadow-2xl">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Đang cập nhật...</span>
            </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-12 animate-slide-up">
          {/* PHẦN THÊM SÁCH MỚI */}
          <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h2 className="text-[11px] font-black mb-8 uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-3">
              <Plus size={18} /> Nhập sách vào kho
              <div className="h-px flex-1 bg-white/5"></div>
            </h2>
            <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tên sách</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: Vật Lý 12 - Chân trời sáng tạo" required />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tác giả / Nhà XB</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: CTST" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Phân loại</label>
                <select value={newBook.categoryId} onChange={e => setNewBook({...newBook, categoryId: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Định dạng</label>
                <select value={newBook.contentType} onChange={e => setNewBook({...newBook, contentType: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner">
                  <option value="pdf">Sách PDF</option>
                  <option value="image">Sách Ảnh</option>
                  <option value="audio">Sách Nói</option>
                </select>
              </div>
              <div className="md:col-span-10 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest flex items-center gap-2"><Link2 size={12}/> Link file gốc (Drive/Dropbox...)</label>
                <input type="text" value={newBook.url} onChange={e => setNewBook({...newBook, url: e.target.value})} className="w-full bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="https://..." required />
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 h-[54px] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-500 transition-all active:scale-95">LƯU SÁCH</button>
              </div>
            </form>
          </div>

          {/* DANH SÁCH SÁCH ĐANG QUẢN LÝ */}
          <div className="space-y-6">
            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.5em] ml-2 flex items-center gap-4">
              DANH SÁCH TÁC PHẨM
              <div className="h-px flex-1 bg-white/5"></div>
            </h3>
            
            {books.map(book => (
              <div key={book.id} className="bg-[#252525] border border-white/5 rounded-[2rem] overflow-hidden transition-all hover:border-indigo-500/30 shadow-2xl group">
                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="w-16 h-20 bg-[#1a1a1a] rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner">
                      {book.contentType === 'pdf' ? <PdfIcon size={32}/> : book.contentType === 'image' ? <ImageIcon size={32}/> : <Headphones size={32}/>}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white group-hover:text-indigo-200 transition-colors leading-tight">{book.title}</h4>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1.5">{book.author} • <span className="text-indigo-500">{book.chapters.length} mục lục</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEditingChaptersBookId(editingChaptersBookId === book.id ? null : book.id)}
                      className={`px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-widest border transition-all flex items-center gap-2 ${editingChaptersBookId === book.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl' : 'bg-[#333] text-gray-400 border-white/5 hover:text-white'}`}
                    >
                      {editingChaptersBookId === book.id ? <><ChevronDown size={14}/> ĐÓNG</> : <><ListTree size={14}/> QUẢN LÝ MỤC LỤC</>}
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="p-4 text-gray-700 hover:text-red-500 transition-all"><Trash2 size={24}/></button>
                  </div>
                </div>

                {/* KHU VỰC BIÊN TẬP MỤC LỤC CHI TIẾT */}
                {editingChaptersBookId === book.id && (
                  <div className="p-8 bg-[#1e1e1e] border-t border-white/5 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Cột trái: Thêm Chương mới */}
                      <div className="space-y-6">
                        <div className="bg-indigo-600/10 p-6 rounded-[2rem] border border-indigo-500/20 shadow-inner">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <PlusSquare size={16} /> Bước 1: Thêm Chương (Mục chính)
                          </h5>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              placeholder="Nhập tên chương (VD: Chương 1)" 
                              value={newChapterTitle}
                              onChange={e => setNewChapterTitle(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleQuickAddChapter(book)}
                              className="flex-1 bg-[#151515] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none shadow-inner"
                            />
                            <button 
                              onClick={() => handleQuickAddChapter(book)}
                              className="bg-indigo-600 px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-500 shadow-lg"
                            >
                              THÊM CHƯƠNG
                            </button>
                          </div>
                          <p className="text-[9px] text-gray-600 mt-4 italic">* Hệ thống sẽ tự động đánh số thứ tự tiếp theo cho chương mới.</p>
                        </div>
                        
                        <div className="bg-[#151515] p-6 rounded-[2.5rem] border border-white/5 min-h-[400px]">
                          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Xem trước Cây thư mục</h5>
                            <span className="text-[9px] text-indigo-500/50 italic">Kéo thả để sắp xếp (Sắp ra mắt)</span>
                          </div>
                          {book.chapters.length === 0 ? (
                            <div className="text-center py-24 text-gray-800 uppercase font-black tracking-widest text-[10px]">Thư mục đang trống</div>
                          ) : renderAdminTree(book)}
                        </div>
                      </div>

                      {/* Cột phải: Hướng dẫn */}
                      <div className="bg-[#2a2a2a]/40 p-10 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col justify-center">
                         <div className="w-16 h-16 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center mb-6">
                            <Info size={32} />
                         </div>
                         <h5 className="text-xl font-black text-white mb-4">Mẹo quản lý nhanh</h5>
                         <ul className="space-y-4 text-sm text-gray-400 font-medium">
                            <li className="flex gap-3">
                              <div className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">1</div>
                              <span>Nhấn <b>"THÊM CHƯƠNG"</b> để tạo các đề mục lớn (Chương 1, Chương 2...).</span>
                            </li>
                            <li className="flex gap-3">
                              <div className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">2</div>
                              <span>Bên dưới mỗi chương hiện ra, nhấn nút <b>"THÊM BÀI"</b> để bắt đầu nhập bài con vào chương đó.</span>
                            </li>
                            <li className="flex gap-3">
                              <div className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">3</div>
                              <span>Hệ thống tự đếm số thứ tự. Nếu muốn chèn vào giữa, hãy nhập số <b>STT</b> bạn muốn, chương trình sẽ tự đẩy các bài sau xuống.</span>
                            </li>
                         </ul>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-slide-up">
            <div className="lg:col-span-1">
                <div className="bg-[#2a2a2a] p-8 rounded-[2.5rem] border-2 border-indigo-500/20 shadow-2xl sticky top-8">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-8 flex items-center gap-3">
                        <FolderPlus size={20} className="text-indigo-400" /> Quản lý danh mục
                    </h2>
                    <form onSubmit={handleAddCategory} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tên phân loại</label>
                            <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none" placeholder="VD: Lịch sử, IT..." required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Nhánh cha</label>
                            <select value={newCategory.parentId} onChange={e => setNewCategory({...newCategory, parentId: e.target.value})} className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none">
                                <option value="">-- Cấp cao nhất --</option>
                                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all text-[11px] tracking-[0.3em] shadow-xl">CẬP NHẬT</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] p-7 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all group shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3.5 bg-indigo-600/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Folder size={24} />
                            </div>
                            <button onClick={() => deleteCategory(cat.id)} className="p-3 text-gray-700 hover:text-red-400 transition-all"><Trash2 size={18} /></button>
                        </div>
                        <h4 className="font-black text-white text-xl mb-1">{cat.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hệ thống tri thức</p>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

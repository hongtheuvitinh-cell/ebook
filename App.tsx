import React, { useState } from 'react';
import { Book, Category } from './types';
import BookReader from './components/BookReader';
import Library from './components/Library';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, User, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE DANH MỤC (Cây thư mục) ---
  const [categories, setCategories] = useState<Category[]>([
    // Cấp 1
    { id: 'cat_sgk', name: 'Sách Giáo Khoa', description: 'Tài liệu học tập chính quy' },
    { id: 'cat_truyen', name: 'Truyện & Tiểu Thuyết', description: 'Văn học giải trí' },
    { id: 'cat_nhatky', name: 'Nhật Ký & Hồi Ký', description: 'Ghi chép cá nhân' },
    
    // Cấp 2 - Con của SGK
    { id: 'cat_sgk_hs', name: 'SGK Học Sinh', parentId: 'cat_sgk' },
    { id: 'cat_sgk_gv', name: 'Sách Giáo Viên', parentId: 'cat_sgk' },
    { id: 'cat_sgk_bt', name: 'Sách Bài Tập', parentId: 'cat_sgk' },

    // Cấp 2 - Con của Truyện
    { id: 'cat_truyen_ngan', name: 'Truyện Ngắn', parentId: 'cat_truyen' },
    { id: 'cat_tieu_thuyet', name: 'Tiểu Thuyết Dài Kỳ', parentId: 'cat_truyen' },
  ]);

  // --- STATE DỮ LIỆU SÁCH ---
  // Gán categoryId cho sách để test
  const [books, setBooks] = useState<Book[]>([
    {
      id: 'demo-1',
      title: 'Toán Học - Lớp 1 (Demo)',
      author: 'Bộ Giáo Dục',
      uploadDate: new Date().toISOString(),
      categoryId: 'cat_sgk_hs', // Thuộc SGK Học Sinh
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf', 
      chapters: [
        { id: 'c1', title: 'Giới thiệu', pageNumber: 1 },
        { id: 'c2', title: 'Chương 1: Phép cộng', pageNumber: 3 },
      ],
      isVisible: true 
    },
    {
      id: 'demo-3',
      title: 'Dế Mèn Phiêu Lưu Ký',
      author: 'Tô Hoài',
      uploadDate: new Date().toISOString(),
      categoryId: 'cat_truyen_ngan', // Thuộc Truyện Ngắn
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf', 
      chapters: [
        { id: 'tap1', title: 'Chương 1: Tôi sống độc lập', pageNumber: 1 },
      ],
      isVisible: true
    },
    {
      id: 'demo-2',
      title: 'Tài liệu mật (Ẩn)',
      author: 'Admin',
      uploadDate: new Date().toISOString(),
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf', 
      chapters: [],
      isVisible: false 
    },
    {
      id: 'demo-4',
      title: 'Hướng Dẫn Giảng Dạy Toán',
      author: 'Bộ Giáo Dục',
      uploadDate: new Date().toISOString(),
      categoryId: 'cat_sgk_gv', // Thuộc SGK Giáo Viên
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf', 
      chapters: [],
      isVisible: true 
    }
  ]);

  // --- STATE ĐIỀU HƯỚNG ---
  // view: 'library' (Thư viện user), 'reader' (Đọc sách), 'admin' (Trang quản trị)
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'admin'>('library');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // --- LOGIC ---
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reader');
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    setCurrentView('library');
  };

  // --- RENDER ---
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans flex flex-col">
      
      {/* 1. THANH ĐIỀU HƯỚNG (HEADER) - Dùng để demo chuyển vai trò */}
      {currentView !== 'reader' && (
        <nav className="h-16 border-b border-gray-800 bg-[#252525] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
                <span className="text-indigo-500">Gemini</span>
                <span>E-Book</span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentView('library')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'library' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <User size={16} />
                    <span>Người đọc</span>
                </button>
                <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentView === 'admin' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                    <ShieldCheck size={16} />
                    <span>Quản trị (Admin)</span>
                </button>
            </div>
        </nav>
      )}

      {/* 2. NỘI DUNG CHÍNH */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <AdminDashboard 
                    books={books} 
                    setBooks={setBooks} 
                    categories={categories}
                    setCategories={setCategories}
                />
            </div>
        )}

        {/* VIEW: USER LIBRARY */}
        {currentView === 'library' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <Library 
                    books={books.filter(b => b.isVisible)} 
                    categories={categories}
                    onSelectBook={handleSelectBook} 
                />
            </div>
        )}

        {/* VIEW: READER */}
        {currentView === 'reader' && selectedBook && (
            <div className="h-full w-full relative">
                <button 
                    onClick={handleBackToLibrary}
                    className="absolute top-4 left-20 z-50 bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all"
                >
                    <LogOut size={14} />
                    Thoát
                </button>
                <BookReader book={selectedBook} />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
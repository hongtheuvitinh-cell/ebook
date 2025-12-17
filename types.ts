export interface Chapter {
  id: string;
  title: string;
  pageNumber: number;
  url?: string; // NEW: Nếu có url, chapter này là một file PDF riêng biệt
}

export interface Category {
  id: string;
  name: string;
  parentId?: string; // Nếu null/undefined thì là Root category
  description?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  url: string; // URL file gốc (hoặc file bìa)
  coverUrl?: string; // Optional cover image
  categoryId?: string; // NEW: ID của danh mục chứa sách này
  uploadDate: string;
  chapters: Chapter[];
  isVisible: boolean; // Trạng thái hiển thị (Admin control)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Re-export specific types needed for Gemini
export enum AISearchType {
  SUMMARIZE = 'SUMMARIZE',
  EXPLAIN = 'EXPLAIN',
  CUSTOM = 'CUSTOM'
}
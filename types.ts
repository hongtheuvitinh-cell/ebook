
export interface Chapter {
  id: string;
  title: string;
  pageNumber: number;
  url?: string;
  parentId?: string; // ID của chương cha
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  url: string;
  contentType: 'pdf' | 'image' | 'audio';
  coverUrl?: string;
  categoryId?: string;
  uploadDate: string;
  chapters: Chapter[];
  isVisible: boolean;
}

// Add ChatMessage interface to support AIAssistant component and fix the missing export error
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

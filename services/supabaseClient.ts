import { createClient } from '@supabase/supabase-js';

// Hàm helper để lấy biến môi trường an toàn, tránh lỗi "process is not defined"
const getEnv = (key: string): string => {
  try {
    // 1. Ưu tiên Vite (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    
    // 2. Fallback sang process.env (cho môi trường Node/CRA cũ)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    console.warn("Error accessing environment variables:", e);
  }
  return '';
};

// Lấy key
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Kiểm tra nếu thiếu key
const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
  console.warn("⚠️ Supabase chưa được cấu hình! Vui lòng kiểm tra file .env hoặc biến môi trường trên Vercel.");
}

// KHÔNG BAO GIỜ để createClient nhận chuỗi rỗng, nó sẽ gây crash ứng dụng ngay lập tức.
// Dùng giá trị giả (dummy) để app vẫn chạy được giao diện, lỗi sẽ được xử lý khi gọi API.
const validUrl = isConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = isConfigured ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(validUrl, validKey);

// Export cờ để App.tsx biết có nên gọi API hay không
export const isSupabaseConfigured = !!isConfigured;

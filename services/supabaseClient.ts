import { createClient } from '@supabase/supabase-js';

// Các biến môi trường này sẽ được cấu hình trên Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Database features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
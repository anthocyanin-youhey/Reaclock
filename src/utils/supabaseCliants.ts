// src/utils/supabaseCliants.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabaseクライアントを作成
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // セッションをCookieに永続化
    detectSessionInUrl: true, // URLでセッションを自動管理
  },
});

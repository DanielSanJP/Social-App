import { createClient } from '@supabase/supabase-js';

// These should be public env vars - safe for browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
}

// Create a Supabase client with the anon key for browser-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
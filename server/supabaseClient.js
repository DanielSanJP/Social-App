import process from 'process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();  // This loads the .env file

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

import process from 'process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();  // This loads the .env file

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing');
}

// Create the default Supabase client with service role key
export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to create a client with user's JWT token for RLS
export const getSupabaseClient = (authToken) => {
  if (!authToken) {
    return supabase; // Fall back to service role client
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
};

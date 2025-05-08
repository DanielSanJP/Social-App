import process from 'process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();  // This loads the .env file

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // This is the service role key in production

// Properly define anon key and service role key
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseKey;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseKey;

// Log the environment in dev mode
const environment = process.env.NODE_ENV || 'development';
if (environment === 'development') {
  console.log('Running in development mode');
} else {
  console.log('Running in production mode');
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing');
}

// For server operations, we should default to the service role client on Railway
// In development, use the key provided by .env
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Creating default Supabase client with ${isProduction ? 'service' : 'regular'} key`);

// Create the default Supabase client
// In production, this will be the service role client
// In development, this will use whatever key is set in .env
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to create a client with user's JWT token for RLS or service role client
export const getSupabaseClient = (authToken, useServiceRole = false) => {
  // If useServiceRole is true, create a service role client that bypasses RLS
  if (useServiceRole) {
    console.log("Creating service role client that bypasses RLS");
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  // If no auth token provided, return the default client
  if (!authToken) {
    console.log("No auth token provided, returning default client");
    return supabase;
  }
  
  // Create a client with the user's JWT token
  console.log("Creating client with user auth token");
  return createClient(supabaseUrl, isProduction ? supabaseAnonKey : supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
};

import { createClient } from '@supabase/supabase-js';
import { TABLE_NAMES } from './tableNames';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  }
});

// Add these helper methods to your supabase client
export const supabaseHelpers = {
  projects: () => supabase.from(TABLE_NAMES.PROJECTS),
  setups: () => supabase.from(TABLE_NAMES.SETUPS),
  designs: () => supabase.from(TABLE_NAMES.DESIGNS),
  flyers: () => supabase.from(TABLE_NAMES.FLYERS),
};

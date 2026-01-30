import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhhzugqimtypijkdxxsm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoaHp1Z3FpbXR5cGlqa2R4eHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDMzNDcsImexHAiOjIwODM2NzkzNDd9.n9-aAw15Obt5hRc2fOcXbz9M39P9e2cpb3stIxct7nc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
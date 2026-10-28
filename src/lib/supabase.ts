import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rxhxicbssmjentlcfgee.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4aHhpY2Jzc21qZW50bGNmZ2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjE3MTIsImV4cCI6MjEwODY5NzcxMn0.kUOJobFzDWwwSWblRstKO7gUdDcKr8eyJh8HvjCXviQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

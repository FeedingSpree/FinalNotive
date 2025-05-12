// utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akkqdachvgeketaiyibj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3FkYWNodmdla2V0YWl5aWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MjkxNTYsImV4cCI6MjA2MjUwNTE1Nn0.VnZ1tE6e0VKtSiMH5KlGMdcid6QFvFP6KT3jy6bXO3g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
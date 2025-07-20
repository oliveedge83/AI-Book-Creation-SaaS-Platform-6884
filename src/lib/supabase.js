import { createClient } from '@supabase/supabase-js'

// Real Supabase configuration from connected project
const SUPABASE_URL = 'https://ogeeglwxiqbephscoebs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZWVnbHd4aXFiZXBoc2NvZWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Nzg1MDUsImV4cCI6MjA2ODM1NDUwNX0.vIbLQeuQm_HU1LRSr1mPDxGZPjgHIwQ0WBhPU3Bq7Lg'

// Create the Supabase client with the real credentials
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

// Database helper functions
export const dbHelpers = {
  // Books
  async getBooks(userId) {
    const { data, error } = await supabase
      .from('books')
      .select('*, chapters:book_chapters(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },
  
  async createBook(bookData) {
    const { data, error } = await supabase
      .from('books')
      .insert([bookData])
      .select()
      .single();
    
    return { data, error };
  },
  
  async updateBook(id, updates) {
    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },
  
  // Chapters
  async createChapter(chapterData) {
    const { data, error } = await supabase
      .from('book_chapters')
      .insert([chapterData])
      .select()
      .single();
    
    return { data, error };
  },
  
  async updateChapter(id, updates) {
    const { data, error } = await supabase
      .from('book_chapters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },
  
  // Topics
  async createTopic(topicData) {
    const { data, error } = await supabase
      .from('chapter_topics')
      .insert([topicData])
      .select()
      .single();
    
    return { data, error };
  },
  
  async updateTopic(id, updates) {
    const { data, error } = await supabase
      .from('chapter_topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },
  
  // API Keys
  async getApiKeys(userId) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId);
    
    return { data, error };
  },
  
  async saveApiKey(userId, provider, encryptedKey) {
    const { data, error } = await supabase
      .from('api_keys')
      .upsert([{
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        has_key: true
      }])
      .select()
      .single();
    
    return { data, error };
  },
  
  // Source Files
  async createSourceFile(fileData) {
    const { data, error } = await supabase
      .from('source_files')
      .insert([fileData])
      .select()
      .single();
    
    return { data, error };
  }
};
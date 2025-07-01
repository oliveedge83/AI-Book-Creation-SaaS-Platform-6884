import { createClient } from '@supabase/supabase-js'

// Temporary demo configuration - replace with your actual Supabase credentials
const SUPABASE_URL = 'https://demo-project.supabase.co'
const SUPABASE_ANON_KEY = 'demo-anon-key'

// For demo purposes, create a mock client that won't throw errors
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback) => {
      // Mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signUp: async (options) => {
      console.log('Demo: Sign up called', options);
      return { 
        data: { 
          user: { 
            id: 'demo-user', 
            email: options.email,
            user_metadata: options.options?.data || {}
          } 
        }, 
        error: null 
      };
    },
    signInWithPassword: async (options) => {
      console.log('Demo: Sign in called', options);
      return { 
        data: { 
          user: { 
            id: 'demo-user', 
            email: options.email,
            user_metadata: { full_name: 'Demo User', role: 'user' }
          } 
        }, 
        error: null 
      };
    },
    signInWithOAuth: async (options) => {
      console.log('Demo: OAuth sign in called', options);
      return { data: null, error: null };
    },
    signOut: async () => {
      console.log('Demo: Sign out called');
      return { error: null };
    },
    resetPasswordForEmail: async (email) => {
      console.log('Demo: Password reset called for', email);
      return { error: null };
    }
  },
  from: (table) => ({
    select: (columns) => ({
      eq: (column, value) => ({
        order: (column, options) => ({
          then: () => Promise.resolve({ data: [], error: null })
        }),
        then: () => Promise.resolve({ data: [], error: null })
      }),
      then: () => Promise.resolve({ data: [], error: null })
    }),
    insert: (data) => ({
      select: () => ({
        single: () => Promise.resolve({ 
          data: { id: 'demo-id', ...data[0] }, 
          error: null 
        }),
        then: () => Promise.resolve({ 
          data: [{ id: 'demo-id', ...data[0] }], 
          error: null 
        })
      }),
      then: () => Promise.resolve({ 
        data: [{ id: 'demo-id', ...data[0] }], 
        error: null 
      })
    }),
    update: (updates) => ({
      eq: (column, value) => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { id: value, ...updates }, 
            error: null 
          })
        })
      })
    }),
    upsert: (data) => ({
      select: () => ({
        single: () => Promise.resolve({ 
          data: { id: 'demo-id', ...data[0] }, 
          error: null 
        })
      })
    })
  })
};

// Database helper functions
export const dbHelpers = {
  // Books
  async getBooks(userId) {
    console.log('Demo: Getting books for user', userId);
    return { 
      data: [
        {
          id: 'demo-book-1',
          title: 'Demo AI Programming Guide',
          target_audience: 'beginners',
          status: 'draft',
          created_at: new Date().toISOString(),
          chapters: [
            {
              id: 'demo-chapter-1',
              title: 'Introduction to AI',
              order_index: 0,
              topics: [
                {
                  id: 'demo-topic-1',
                  title: 'What is Artificial Intelligence?',
                  objectives: 'Learn the basics of AI',
                  content: '<h2>What is Artificial Intelligence?</h2><p>This is demo content about AI...</p>',
                  status: 'completed'
                },
                {
                  id: 'demo-topic-2',
                  title: 'History of AI',
                  objectives: 'Understand AI evolution',
                  content: null,
                  status: 'draft'
                }
              ]
            }
          ]
        }
      ], 
      error: null 
    };
  },

  async createBook(bookData) {
    console.log('Demo: Creating book', bookData);
    return { 
      data: { 
        id: 'demo-book-' + Date.now(), 
        ...bookData,
        created_at: new Date().toISOString()
      }, 
      error: null 
    };
  },

  async updateBook(id, updates) {
    console.log('Demo: Updating book', id, updates);
    return { 
      data: { id, ...updates }, 
      error: null 
    };
  },

  // Chapters
  async createChapter(chapterData) {
    console.log('Demo: Creating chapter', chapterData);
    return { 
      data: { 
        id: 'demo-chapter-' + Date.now(), 
        ...chapterData 
      }, 
      error: null 
    };
  },

  async updateChapter(id, updates) {
    console.log('Demo: Updating chapter', id, updates);
    return { 
      data: { id, ...updates }, 
      error: null 
    };
  },

  // Topics
  async createTopic(topicData) {
    console.log('Demo: Creating topic', topicData);
    return { 
      data: { 
        id: 'demo-topic-' + Date.now(), 
        ...topicData 
      }, 
      error: null 
    };
  },

  async updateTopic(id, updates) {
    console.log('Demo: Updating topic', id, updates);
    return { 
      data: { id, ...updates }, 
      error: null 
    };
  },

  // API Keys
  async getApiKeys(userId) {
    console.log('Demo: Getting API keys for user', userId);
    return { 
      data: [
        { provider: 'openai', has_key: false, created_at: new Date().toISOString() },
        { provider: 'anthropic', has_key: false, created_at: new Date().toISOString() }
      ], 
      error: null 
    };
  },

  async saveApiKey(userId, provider, encryptedKey) {
    console.log('Demo: Saving API key', provider);
    return { 
      data: { 
        user_id: userId, 
        provider, 
        encrypted_key: encryptedKey, 
        has_key: true 
      }, 
      error: null 
    };
  },

  // Source Files
  async createSourceFile(fileData) {
    console.log('Demo: Creating source file', fileData);
    return { 
      data: { 
        id: 'demo-file-' + Date.now(), 
        ...fileData 
      }, 
      error: null 
    };
  }
};
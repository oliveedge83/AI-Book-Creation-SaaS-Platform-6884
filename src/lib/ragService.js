// RAG Service for frontend
class RAGServiceClient {
  constructor() {
    this.baseUrl = '';
  }

  async initializeBookRAG(bookId, bookData, openaiApiKey) {
    try {
      const response = await fetch(`/api/books/${bookId}/init-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookData, openaiApiKey })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result;
    } catch (error) {
      console.error('Error initializing RAG:', error);
      throw error;
    }
  }

  async uploadPDFForRAG(bookId, file, openaiApiKey) {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('openaiApiKey', openaiApiKey);

      const response = await fetch(`/api/books/${bookId}/upload-pdf-rag`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result;
    } catch (error) {
      console.error('Error uploading PDF for RAG:', error);
      throw error;
    }
  }

  async addURLToRAG(bookId, url, openaiApiKey) {
    try {
      const response = await fetch(`/api/books/${bookId}/add-url-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, openaiApiKey })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result;
    } catch (error) {
      console.error('Error adding URL to RAG:', error);
      throw error;
    }
  }

  async generateWithRAG(bookId, prompt, type, openaiApiKey) {
    try {
      const response = await fetch(`/api/books/${bookId}/generate-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, openaiApiKey })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result.content;
    } catch (error) {
      console.error('Error generating with RAG:', error);
      throw error;
    }
  }

  async searchKnowledge(bookId, query, openaiApiKey) {
    try {
      const response = await fetch(`/api/books/${bookId}/search-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, openaiApiKey })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result.results;
    } catch (error) {
      console.error('Error searching knowledge:', error);
      throw error;
    }
  }

  async getRAGInfo(bookId) {
    try {
      const response = await fetch(`/api/books/${bookId}/rag-info`, {
        method: 'GET'
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result;
    } catch (error) {
      console.error('Error getting RAG info:', error);
      throw error;
    }
  }

  async deleteRAG(bookId, openaiApiKey) {
    try {
      const response = await fetch(`/api/books/${bookId}/rag`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result;
    } catch (error) {
      console.error('Error deleting RAG:', error);
      throw error;
    }
  }
}

export const ragServiceClient = new RAGServiceClient();
export default ragServiceClient;
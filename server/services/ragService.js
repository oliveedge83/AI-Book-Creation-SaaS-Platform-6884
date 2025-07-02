import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RAGService {
  constructor() {
    this.openai = null;
    this.assistants = new Map(); // Store assistants per book
    this.threads = new Map(); // Store threads per book
    this.uploadedFiles = new Map(); // Store file IDs per book
  }

  initialize(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async createBookAssistant(bookId, bookData) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Create assistant with specific instructions for the book
      const assistant = await this.openai.beta.assistants.create({
        name: `EbookAI Assistant - ${bookData.title}`,
        instructions: `You are an expert content writer and researcher specializing in creating comprehensive, well-structured educational content for the book "${bookData.title}".

Book Context:
- Title: ${bookData.title}
- Target Audience: ${bookData.target_audience}
- Learning Objectives: ${bookData.learning_objectives}
- Writing Style: ${bookData.writing_style}
- Tone: ${bookData.tone}

Your responsibilities:
1. Generate detailed table of contents based on uploaded research materials
2. Create comprehensive content for each topic using the knowledge from uploaded files
3. Maintain consistency with the book's target audience and learning objectives
4. Reference and cite information from the uploaded research materials
5. Ensure content is engaging, educational, and well-structured

Always use the file search tool to find relevant information from uploaded research materials before generating content.`,
        tools: [
          { type: "file_search" },
          { type: "code_interpreter" }
        ],
        model: "gpt-4o",
        temperature: 0.7
      });

      this.assistants.set(bookId, assistant.id);
      
      // Create a thread for this book
      const thread = await this.openai.beta.threads.create();
      this.threads.set(bookId, thread.id);

      return { assistantId: assistant.id, threadId: thread.id };
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }
  }

  async uploadFileToAssistant(bookId, fileBuffer, fileName, fileType = 'application/pdf') {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Save file temporarily
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempFilePath, fileBuffer);

      // Upload file to OpenAI
      const file = await this.openai.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: 'assistants'
      });

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      // Store file ID for this book
      if (!this.uploadedFiles.has(bookId)) {
        this.uploadedFiles.set(bookId, []);
      }
      this.uploadedFiles.get(bookId).push({
        fileId: file.id,
        fileName,
        fileType
      });

      // Attach file to assistant
      const assistantId = this.assistants.get(bookId);
      if (assistantId) {
        await this.openai.beta.assistants.update(assistantId, {
          tool_resources: {
            file_search: {
              vector_store_ids: [] // Will be updated when creating vector store
            }
          }
        });

        // Create vector store and add files
        await this.createVectorStore(bookId);
      }

      return file.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async createVectorStore(bookId) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const assistantId = this.assistants.get(bookId);
      const files = this.uploadedFiles.get(bookId) || [];

      if (files.length === 0) return;

      // Create vector store
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: `Knowledge Base - Book ${bookId}`,
        expires_after: {
          anchor: "last_active_at",
          days: 30
        }
      });

      // Add files to vector store
      const fileIds = files.map(f => f.fileId);
      await this.openai.beta.vectorStores.fileBatches.create(vectorStore.id, {
        file_ids: fileIds
      });

      // Update assistant with vector store
      await this.openai.beta.assistants.update(assistantId, {
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      });

      return vectorStore.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  async addUrlContentToKnowledge(bookId, url, content, title) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Create a text file with URL content
      const fileName = `url_content_${Date.now()}.txt`;
      const fileContent = `URL: ${url}\nTitle: ${title}\n\nContent:\n${content}`;
      
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempFilePath, fileContent, 'utf8');

      // Upload to OpenAI
      const file = await this.openai.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: 'assistants'
      });

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      // Store file ID
      if (!this.uploadedFiles.has(bookId)) {
        this.uploadedFiles.set(bookId, []);
      }
      this.uploadedFiles.get(bookId).push({
        fileId: file.id,
        fileName: `URL: ${url}`,
        fileType: 'text/plain'
      });

      // Update vector store
      await this.createVectorStore(bookId);

      return file.id;
    } catch (error) {
      console.error('Error adding URL content:', error);
      throw error;
    }
  }

  async generateWithRAG(bookId, prompt, messageType = 'content-generation') {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const assistantId = this.assistants.get(bookId);
      const threadId = this.threads.get(bookId);

      if (!assistantId || !threadId) {
        throw new Error('Assistant or thread not found for this book');
      }

      // Add message to thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: prompt
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        instructions: messageType === 'toc-generation' 
          ? "Focus on creating a comprehensive table of contents. Use the uploaded research materials to inform the structure and ensure all important topics are covered."
          : "Generate detailed, well-researched content using information from the uploaded files. Always reference relevant information from the research materials."
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === 'completed') {
        // Get the latest message
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const latestMessage = messages.data[0];
        
        if (latestMessage.role === 'assistant') {
          return latestMessage.content[0].text.value;
        }
      } else if (runStatus.status === 'failed') {
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message}`);
      }

      throw new Error('Unexpected assistant run status');
    } catch (error) {
      console.error('Error generating with RAG:', error);
      throw error;
    }
  }

  async searchKnowledge(bookId, query) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const assistantId = this.assistants.get(bookId);
      const threadId = this.threads.get(bookId);

      if (!assistantId || !threadId) {
        throw new Error('Assistant or thread not found for this book');
      }

      // Create a search-specific message
      const searchPrompt = `Search the knowledge base for information related to: "${query}". Provide relevant excerpts and sources.`;

      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: searchPrompt
      });

      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        instructions: "Search the uploaded files for relevant information and provide detailed excerpts with context."
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const latestMessage = messages.data[0];
        
        if (latestMessage.role === 'assistant') {
          return latestMessage.content[0].text.value;
        }
      }

      return 'No relevant information found in the knowledge base.';
    } catch (error) {
      console.error('Error searching knowledge:', error);
      throw error;
    }
  }

  async deleteBookAssistant(bookId) {
    try {
      const assistantId = this.assistants.get(bookId);
      const files = this.uploadedFiles.get(bookId) || [];

      // Delete uploaded files
      for (const file of files) {
        try {
          await this.openai.files.del(file.fileId);
        } catch (error) {
          console.error(`Error deleting file ${file.fileId}:`, error);
        }
      }

      // Delete assistant
      if (assistantId) {
        await this.openai.beta.assistants.del(assistantId);
      }

      // Clean up local storage
      this.assistants.delete(bookId);
      this.threads.delete(bookId);
      this.uploadedFiles.delete(bookId);
    } catch (error) {
      console.error('Error deleting book assistant:', error);
      throw error;
    }
  }

  getBookFiles(bookId) {
    return this.uploadedFiles.get(bookId) || [];
  }

  getBookAssistantInfo(bookId) {
    return {
      assistantId: this.assistants.get(bookId),
      threadId: this.threads.get(bookId),
      filesCount: (this.uploadedFiles.get(bookId) || []).length
    };
  }
}

export const ragService = new RAGService();
export default ragService;
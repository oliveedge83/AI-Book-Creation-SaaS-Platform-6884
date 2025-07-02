import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import cheerio from 'cheerio';
import CryptoJS from 'crypto-js';
import OpenAI from 'openai';
import { ragService } from './services/ragService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Encryption key for API keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key';

// Helper functions
const encryptApiKey = (key) => {
  return CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
};

const decryptApiKey = (encryptedKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// API Routes

// Initialize RAG Assistant for a book
app.post('/api/books/:bookId/init-rag', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { bookData, openaiApiKey } = req.body;

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key is required for RAG functionality'
      });
    }

    // Initialize RAG service with API key
    ragService.initialize(openaiApiKey);

    // Create assistant for this book
    const result = await ragService.createBookAssistant(bookId, bookData);

    res.json({
      success: true,
      assistantId: result.assistantId,
      threadId: result.threadId
    });
  } catch (error) {
    console.error('Error initializing RAG:', error);
    res.status(500).json({
      error: 'Failed to initialize RAG assistant'
    });
  }
});

// Upload and process PDF for RAG
app.post('/api/books/:bookId/upload-pdf-rag', upload.single('pdf'), async (req, res) => {
  try {
    const { bookId } = req.params;
    const { openaiApiKey } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'No PDF file uploaded'
      });
    }

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key is required'
      });
    }

    // Initialize RAG service if not already done
    ragService.initialize(openaiApiKey);

    // Parse PDF for text extraction (for fallback)
    const pdfData = await pdfParse(req.file.buffer);

    // Upload file to OpenAI Assistant for RAG
    const fileId = await ragService.uploadFileToAssistant(
      bookId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      fileId,
      fileName: req.file.originalname,
      text: pdfData.text, // For display purposes
      pages: pdfData.numpages,
      ragEnabled: true
    });
  } catch (error) {
    console.error('PDF upload and RAG processing error:', error);
    res.status(500).json({
      error: 'Failed to process PDF for RAG'
    });
  }
});

// Add URL content to RAG knowledge base
app.post('/api/books/:bookId/add-url-rag', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { url, openaiApiKey } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key is required'
      });
    }

    // Initialize RAG service
    ragService.initialize(openaiApiKey);

    // Fetch URL content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, footer, header, .advertisement, .ads').remove();

    // Extract main content
    const title = $('title').text().trim();
    const content = $('main, article, .content, .post, .entry').text() || $('body').text();

    // Clean up the text
    const cleanText = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Add to RAG knowledge base
    const fileId = await ragService.addUrlContentToKnowledge(bookId, url, cleanText, title);

    res.json({
      success: true,
      fileId,
      title,
      content: cleanText,
      url,
      ragEnabled: true
    });
  } catch (error) {
    console.error('URL processing and RAG error:', error);
    res.status(500).json({
      error: 'Failed to process URL for RAG'
    });
  }
});

// Generate content using RAG
app.post('/api/books/:bookId/generate-rag', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { prompt, type, openaiApiKey } = req.body;

    if (!prompt || !openaiApiKey) {
      return res.status(400).json({
        error: 'Prompt and OpenAI API key are required'
      });
    }

    // Initialize RAG service
    ragService.initialize(openaiApiKey);

    // Generate content with RAG
    const content = await ragService.generateWithRAG(bookId, prompt, type);

    res.json({
      success: true,
      content,
      ragEnabled: true
    });
  } catch (error) {
    console.error('RAG content generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content with RAG'
    });
  }
});

// Search knowledge base
app.post('/api/books/:bookId/search-knowledge', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { query, openaiApiKey } = req.body;

    if (!query || !openaiApiKey) {
      return res.status(400).json({
        error: 'Query and OpenAI API key are required'
      });
    }

    // Initialize RAG service
    ragService.initialize(openaiApiKey);

    // Search knowledge base
    const results = await ragService.searchKnowledge(bookId, query);

    res.json({
      success: true,
      results,
      query
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({
      error: 'Failed to search knowledge base'
    });
  }
});

// Get RAG info for a book
app.get('/api/books/:bookId/rag-info', async (req, res) => {
  try {
    const { bookId } = req.params;

    const info = ragService.getBookAssistantInfo(bookId);
    const files = ragService.getBookFiles(bookId);

    res.json({
      success: true,
      assistantId: info.assistantId,
      threadId: info.threadId,
      filesCount: info.filesCount,
      files: files.map(f => ({
        fileName: f.fileName,
        fileType: f.fileType
      }))
    });
  } catch (error) {
    console.error('Error getting RAG info:', error);
    res.status(500).json({
      error: 'Failed to get RAG information'
    });
  }
});

// Delete RAG assistant and files
app.delete('/api/books/:bookId/rag', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { openaiApiKey } = req.body;

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key is required'
      });
    }

    ragService.initialize(openaiApiKey);
    await ragService.deleteBookAssistant(bookId);

    res.json({
      success: true,
      message: 'RAG assistant and files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RAG assistant:', error);
    res.status(500).json({
      error: 'Failed to delete RAG assistant'
    });
  }
});

// Validate API Key
app.post('/api/validate-key', async (req, res) => {
  try {
    const { provider, key } = req.body;

    if (!provider || !key) {
      return res.status(400).json({
        valid: false,
        error: 'Provider and key are required'
      });
    }

    let isValid = false;

    switch (provider) {
      case 'openai':
        try {
          const openai = new OpenAI({ apiKey: key });
          await openai.models.list();
          isValid = true;
        } catch (error) {
          isValid = false;
        }
        break;

      case 'anthropic':
        try {
          const response = await axios.get('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01'
            }
          });
          isValid = response.status === 200;
        } catch (error) {
          isValid = false;
        }
        break;

      case 'openrouter':
        try {
          const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': 'https://ebook-ai.com',
              'X-Title': 'EbookAI'
            }
          });
          isValid = response.status === 200;
        } catch (error) {
          isValid = false;
        }
        break;

      default:
        return res.status(400).json({
          valid: false,
          error: 'Unsupported provider'
        });
    }

    res.json({ valid: isValid });
  } catch (error) {
    console.error('Key validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Validation failed'
    });
  }
});

// Get Available Models
app.post('/api/models', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Provider and API key are required'
      });
    }

    let models = [];

    switch (provider) {
      case 'openai':
        try {
          const openai = new OpenAI({ apiKey });
          const response = await openai.models.list();
          models = response.data
            .filter(model => model.id.includes('gpt') || model.id.includes('o1'))
            .map(model => ({
              id: model.id,
              name: model.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              description: `OpenAI ${model.id}`
            }));
        } catch (error) {
          // Return default models if API call fails
          models = [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model with RAG support' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient with RAG' },
            { id: 'o1-preview', name: 'o1 Preview', description: 'Advanced reasoning' },
            { id: 'o1-mini', name: 'o1 Mini', description: 'Fast reasoning' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance with RAG' }
          ];
        }
        break;

      case 'anthropic':
        models = [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and cost-effective' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' }
        ];
        break;

      case 'openrouter':
        try {
          const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://ebook-ai.com',
              'X-Title': 'EbookAI'
            }
          });
          models = response.data.data.slice(0, 20).map(model => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description || `${model.id} via OpenRouter`
          }));
        } catch (error) {
          models = [
            { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s latest model' },
            { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Meta\'s powerful model' },
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Via OpenRouter' }
          ];
        }
        break;
    }

    res.json({ models });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch models'
    });
  }
});

// Generate Content (Legacy endpoint - will use RAG if available)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { provider, model, prompt, type, apiKey, bookId } = req.body;

    if (!provider || !model || !prompt || !apiKey) {
      return res.status(400).json({
        error: 'Provider, model, prompt, and API key are required'
      });
    }

    let content = '';

    // If OpenAI provider and bookId provided, try RAG first
    if (provider === 'openai' && bookId) {
      try {
        ragService.initialize(apiKey);
        const ragInfo = ragService.getBookAssistantInfo(bookId);
        
        if (ragInfo.assistantId && ragInfo.filesCount > 0) {
          // Use RAG generation
          content = await ragService.generateWithRAG(bookId, prompt, type);
          return res.json({ content, ragEnabled: true });
        }
      } catch (ragError) {
        console.log('RAG generation failed, falling back to standard generation:', ragError.message);
      }
    }

    // Fall back to standard generation
    switch (provider) {
      case 'openai':
        try {
          const openai = new OpenAI({ apiKey });
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert content writer specializing in creating comprehensive, well-structured educational content.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: type === 'toc-generation' ? 2000 : 4000,
            temperature: 0.7
          });

          content = response.choices[0].message.content;
        } catch (error) {
          throw new Error(`OpenAI API error: ${error.message}`);
        }
        break;

      case 'anthropic':
        try {
          const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model,
            max_tokens: type === 'toc-generation' ? 2000 : 4000,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          }, {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            }
          });

          content = response.data.content[0].text;
        } catch (error) {
          throw new Error(`Anthropic API error: ${error.message}`);
        }
        break;

      case 'openrouter':
        try {
          const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert content writer specializing in creating comprehensive, well-structured educational content.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: type === 'toc-generation' ? 2000 : 4000,
            temperature: 0.7
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://ebook-ai.com',
              'X-Title': 'EbookAI',
              'Content-Type': 'application/json'
            }
          });

          content = response.data.choices[0].message.content;
        } catch (error) {
          throw new Error(`OpenRouter API error: ${error.message}`);
        }
        break;

      default:
        throw new Error('Unsupported provider');
    }

    res.json({ content, ragEnabled: false });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate content'
    });
  }
});

// Parse PDF (Legacy endpoint)
app.post('/api/parse-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No PDF file uploaded'
      });
    }

    const pdfData = await pdfParse(req.file.buffer);

    res.json({
      text: pdfData.text,
      pages: pdfData.numpages,
      info: pdfData.info
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse PDF'
    });
  }
});

// Parse URL (Legacy endpoint)
app.post('/api/parse-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, footer, header, .advertisement, .ads').remove();

    // Extract main content
    const title = $('title').text().trim();
    const content = $('main, article, .content, .post, .entry').text() || $('body').text();

    // Clean up the text
    const cleanText = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    res.json({
      title,
      content: cleanText,
      url
    });
  } catch (error) {
    console.error('URL parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse URL'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large'
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
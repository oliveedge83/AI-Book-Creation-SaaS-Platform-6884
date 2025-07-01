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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
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

// Validate API Key
app.post('/api/validate-key', async (req, res) => {
  try {
    const { provider, key } = req.body;

    if (!provider || !key) {
      return res.status(400).json({ valid: false, error: 'Provider and key are required' });
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
          // Updated Anthropic SDK usage
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

      case 'stabilityai':
        try {
          const response = await axios.get('https://api.stability.ai/v1/user/account', {
            headers: {
              'Authorization': `Bearer ${key}`
            }
          });
          isValid = response.status === 200;
        } catch (error) {
          isValid = false;
        }
        break;

      default:
        return res.status(400).json({ valid: false, error: 'Unsupported provider' });
    }

    res.json({ valid: isValid });
  } catch (error) {
    console.error('Key validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// Get Available Models
app.post('/api/models', async (req, res) => {
  try {
    const { userId, providers } = req.body;

    if (!userId || !providers) {
      return res.status(400).json({ error: 'User ID and providers are required' });
    }

    const models = [];

    for (const provider of providers) {
      try {
        // In a real implementation, you would:
        // 1. Get the encrypted API key from database
        // 2. Decrypt it
        // 3. Use it to fetch models from the provider

        switch (provider) {
          case 'openai':
            models.push({
              provider: 'OpenAI',
              models: [
                { id: 'gpt-4', name: 'GPT-4' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
              ]
            });
            break;

          case 'anthropic':
            models.push({
              provider: 'Anthropic',
              models: [
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
              ]
            });
            break;

          case 'openrouter':
            models.push({
              provider: 'OpenRouter',
              models: [
                { id: 'google/gemini-pro', name: 'Gemini Pro' },
                { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' },
                { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' }
              ]
            });
            break;
        }
      } catch (error) {
        console.error(`Error fetching models for ${provider}:`, error);
      }
    }

    res.json({ models });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Parse PDF
app.post('/api/parse-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    
    res.json({
      text: pdfData.text,
      pages: pdfData.numpages,
      info: pdfData.info
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
});

// Parse URL
app.post('/api/parse-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
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
    res.status(500).json({ error: 'Failed to parse URL' });
  }
});

// Generate Content
app.post('/api/generate-content', async (req, res) => {
  try {
    const { bookId, topicId, prompt, model, provider } = req.body;

    if (!bookId || !topicId || !prompt) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // In a real implementation, you would:
    // 1. Get user's API key for the provider
    // 2. Create OpenAI Assistant with RAG files
    // 3. Generate content using the selected model
    // 4. Return the generated content

    // For demo purposes, return a placeholder
    const content = `
      <h2>AI-Generated Content</h2>
      <p>This is a comprehensive section about the topic. The content would be generated using the selected LLM model (${model || 'gpt-4'}) and would incorporate any uploaded PDFs or URLs through RAG.</p>
      
      <h3>Introduction</h3>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      
      <h3>Key Concepts</h3>
      <ul>
        <li>Concept 1: Detailed explanation with examples</li>
        <li>Concept 2: In-depth analysis and applications</li>
        <li>Concept 3: Best practices and recommendations</li>
      </ul>
      
      <h3>Practical Applications</h3>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      
      <h3>Advanced Topics</h3>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
      
      <h3>Conclusion</h3>
      <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
    `;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({ content });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Generate Image
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // In a real implementation, you would use DALL-E or Stability AI
    // For demo, return a placeholder image URL
    const imageUrl = `https://picsum.photos/800/600?random=${Date.now()}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Export Book
app.post('/api/export-book', async (req, res) => {
  try {
    const { bookId, format } = req.body;

    if (!bookId || !format) {
      return res.status(400).json({ error: 'Book ID and format are required' });
    }

    // In a real implementation, you would:
    // 1. Fetch book data from database
    // 2. Generate PDF using jsPDF or similar
    // 3. Return download link or file

    res.json({
      success: true,
      message: `${format} export completed`,
      downloadUrl: `/downloads/book-${bookId}.${format.toLowerCase()}`
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export book' });
  }
});

// Webhook endpoint
app.post('/api/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log('Webhook received:', event, data);

    // Handle different webhook events
    switch (event) {
      case 'book_created':
        // Send notification email
        break;
      case 'generation_complete':
        // Update book status
        break;
      case 'new_reader_subscribed':
        // Add to mailing list
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
// AI Service for LLM integrations with RAG support
import { ragServiceClient } from './ragService.js';

class AIService {
  constructor() {
    this.apiKeys = {};
    this.selectedModels = {};
    this.ragEnabled = new Map(); // Track which books have RAG enabled
  }

  setApiKey(provider, key) {
    this.apiKeys[provider] = key;
  }

  setSelectedModel(provider, model) {
    this.selectedModels[provider] = model;
  }

  async validateApiKey(provider, key) {
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      });
      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async getAvailableModels(provider) {
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: this.apiKeys[provider] })
      });
      const result = await response.json();
      return result.models || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return this.getDefaultModels(provider);
    }
  }

  getDefaultModels(provider) {
    const modelMap = {
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model with RAG support' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient with RAG' },
        { id: 'o1-preview', name: 'o1 Preview', description: 'Advanced reasoning' },
        { id: 'o1-mini', name: 'o1 Mini', description: 'Fast reasoning' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance with RAG' },
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
      ],
      anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and cost-effective' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast responses' }
      ],
      openrouter: [
        { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s latest model' },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Meta\'s powerful model' },
        { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Efficient mixture model' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Via OpenRouter' },
        { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Via OpenRouter' }
      ]
    };
    return modelMap[provider] || [];
  }

  async initializeRAGForBook(bookId, bookData) {
    try {
      if (this.apiKeys.openai) {
        const result = await ragServiceClient.initializeBookRAG(bookId, bookData, this.apiKeys.openai);
        this.ragEnabled.set(bookId, true);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Failed to initialize RAG for book:', error);
      return null;
    }
  }

  async generateTableOfContents(bookData, sourceContent = '', bookId = null) {
    const prompt = `
Based on the following book information and source materials, generate a comprehensive table of contents with chapters and topics.

Book Information:
- Title: ${bookData.title}
- Target Audience: ${bookData.target_audience}
- Learning Objectives: ${bookData.learning_objectives || 'Not specified'}
- Writing Style: ${bookData.writing_style}
- Tone: ${bookData.tone}
- Estimated Pages: ${bookData.estimated_pages}

${sourceContent ? `Source Content Available: Yes (${sourceContent.length} characters)` : 'Source Content: None'}

Please analyze any uploaded research materials and generate a detailed table of contents with:
1. 6-8 chapters that logically progress through the subject
2. 3-5 topics per chapter
3. Each topic should have clear learning objectives
4. Structure should be appropriate for ${bookData.target_audience} level readers
5. Incorporate insights from the research materials if available

Return the response in this JSON format:
{
  "chapters": [
    {
      "title": "Chapter Title",
      "description": "Brief chapter description",
      "topics": [
        {
          "title": "Topic Title",
          "objectives": "What readers will learn",
          "estimated_words": 1500
        }
      ]
    }
  ]
}`;

    return this.generateContent(prompt, 'toc-generation', bookId);
  }

  async generateTopicContent(topic, chapterContext, bookContext, sourceContent = '', bookId = null) {
    const prompt = `
Generate comprehensive content for the following topic in an ebook:

Book Context:
- Title: ${bookContext.title}
- Target Audience: ${bookContext.target_audience}
- Writing Style: ${bookContext.writing_style}
- Tone: ${bookContext.tone}

Chapter Context: ${chapterContext.title}

Topic Details:
- Title: ${topic.title}
- Learning Objectives: ${topic.objectives}
- Estimated Words: ${topic.estimated_words || 1500}

Additional Context: ${topic.additional_context || ''}

${sourceContent ? `Research Materials Available: Yes (${sourceContent.length} characters)` : 'Research Materials: None'}

Requirements:
1. Write engaging, well-structured content appropriate for ${bookContext.target_audience}
2. Include practical examples and actionable insights
3. Use ${bookContext.writing_style} writing style with ${bookContext.tone} tone
4. Include subheadings for better organization
5. Aim for approximately ${topic.estimated_words || 1500} words
6. If research materials are available, reference and incorporate relevant information
7. Format as HTML with proper heading tags (h3, h4) and paragraphs

Generate comprehensive, high-quality content that fulfills the learning objectives and incorporates insights from uploaded research materials.`;

    return this.generateContent(prompt, 'content-generation', bookId);
  }

  async generateContent(prompt, type = 'general', bookId = null) {
    try {
      // Try RAG first if available and using OpenAI
      if (bookId && this.ragEnabled.get(bookId) && this.apiKeys.openai) {
        try {
          const content = await ragServiceClient.generateWithRAG(bookId, prompt, type, this.apiKeys.openai);
          return content;
        } catch (ragError) {
          console.log('RAG generation failed, falling back to standard generation:', ragError.message);
        }
      }

      // Fall back to standard generation
      const providers = ['openai', 'anthropic', 'openrouter'];
      
      for (const provider of providers) {
        if (this.apiKeys[provider] && this.selectedModels[provider]) {
          const response = await fetch('/api/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              model: this.selectedModels[provider],
              prompt,
              type,
              apiKey: this.apiKeys[provider],
              bookId
            })
          });

          if (response.ok) {
            const result = await response.json();
            return result.content;
          }
        }
      }

      // Fallback to demo content if no API keys available
      return this.generateDemoContent(type, prompt);
    } catch (error) {
      console.error('Content generation failed:', error);
      return this.generateDemoContent(type, prompt);
    }
  }

  generateDemoContent(type, prompt) {
    if (type === 'toc-generation') {
      return JSON.stringify({
        chapters: [
          {
            title: "Introduction and Foundations",
            description: "Setting the groundwork for understanding the subject",
            topics: [
              {
                title: "Welcome and Overview",
                objectives: "Understand the scope and goals of this book",
                estimated_words: 1200
              },
              {
                title: "Core Concepts and Terminology",
                objectives: "Master the fundamental vocabulary and concepts",
                estimated_words: 1800
              },
              {
                title: "Historical Context and Evolution",
                objectives: "Learn how this field has developed over time",
                estimated_words: 1500
              }
            ]
          },
          {
            title: "Fundamental Principles",
            description: "Deep dive into the core principles and theories",
            topics: [
              {
                title: "Theoretical Framework",
                objectives: "Understand the underlying theoretical foundation",
                estimated_words: 2000
              },
              {
                title: "Key Methodologies",
                objectives: "Learn the primary approaches and methodologies",
                estimated_words: 1800
              },
              {
                title: "Best Practices and Standards",
                objectives: "Discover industry best practices and standards",
                estimated_words: 1600
              }
            ]
          },
          {
            title: "Practical Applications",
            description: "Real-world implementation and case studies",
            topics: [
              {
                title: "Implementation Strategies",
                objectives: "Learn how to apply concepts in practice",
                estimated_words: 2200
              },
              {
                title: "Case Studies and Examples",
                objectives: "Analyze real-world examples and success stories",
                estimated_words: 1900
              },
              {
                title: "Tools and Technologies",
                objectives: "Master the essential tools and technologies",
                estimated_words: 1700
              }
            ]
          },
          {
            title: "Advanced Techniques",
            description: "Advanced concepts and cutting-edge approaches",
            topics: [
              {
                title: "Advanced Strategies",
                objectives: "Explore sophisticated techniques and approaches",
                estimated_words: 2100
              },
              {
                title: "Optimization and Performance",
                objectives: "Learn how to optimize and improve performance",
                estimated_words: 1800
              },
              {
                title: "Future Trends and Innovations",
                objectives: "Understand emerging trends and future directions",
                estimated_words: 1600
              }
            ]
          }
        ]
      });
    }

    // Demo content generation
    return `
      <h3>Introduction</h3>
      <p>This section provides a comprehensive overview of the topic, designed for readers at all levels. The content has been carefully crafted to be both informative and engaging, incorporating insights from research materials when available.</p>
      
      <h3>Key Concepts</h3>
      <p>Understanding the fundamental concepts is crucial for mastering this subject. Here we explore the core principles that form the foundation of everything that follows.</p>
      
      <h4>Primary Principles</h4>
      <ul>
        <li><strong>Principle 1:</strong> Detailed explanation of the first key principle</li>
        <li><strong>Principle 2:</strong> Comprehensive coverage of the second principle</li>
        <li><strong>Principle 3:</strong> In-depth analysis of the third principle</li>
      </ul>
      
      <h3>Practical Applications</h3>
      <p>Theory becomes valuable when applied to real-world scenarios. This section demonstrates how to implement these concepts in practical situations.</p>
      
      <h4>Implementation Steps</h4>
      <ol>
        <li>Assessment and planning phase</li>
        <li>Initial implementation and setup</li>
        <li>Testing and validation procedures</li>
        <li>Optimization and refinement</li>
      </ol>
      
      <h3>Research Insights</h3>
      <p>Based on analysis of uploaded research materials and current best practices, these insights will help you achieve optimal results:</p>
      
      <blockquote>
        <p>"Success in this field requires a combination of theoretical knowledge and practical experience. The key is to start with solid fundamentals and build upon them systematically."</p>
      </blockquote>
      
      <h3>Common Challenges and Solutions</h3>
      <p>Every practitioner encounters challenges. Here are the most common issues and proven solutions:</p>
      
      <ul>
        <li><strong>Challenge 1:</strong> Detailed description and solution approach</li>
        <li><strong>Challenge 2:</strong> Analysis of the problem and recommended solutions</li>
        <li><strong>Challenge 3:</strong> Step-by-step resolution methodology</li>
      </ul>
      
      <h3>Summary</h3>
      <p>This comprehensive coverage provides you with the knowledge and tools needed to succeed. Remember that mastery comes through practice and continuous learning.</p>
    `;
  }

  async processSourceFiles(files, urls, bookId = null) {
    let combinedContent = '';
    const ragProcessedFiles = [];

    try {
      // Process PDF files
      for (const file of files) {
        if (file.type === 'application/pdf') {
          // Try RAG upload first if available
          if (bookId && this.apiKeys.openai) {
            try {
              const ragResult = await ragServiceClient.uploadPDFForRAG(bookId, file, this.apiKeys.openai);
              ragProcessedFiles.push(ragResult);
              combinedContent += `\n\n--- RAG-processed content from ${file.name} ---\n${ragResult.text}\n`;
              continue;
            } catch (ragError) {
              console.log('RAG processing failed for PDF, using fallback:', ragError.message);
            }
          }

          // Fallback to standard PDF processing
          const formData = new FormData();
          formData.append('pdf', file);
          
          const response = await fetch('/api/parse-pdf', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            combinedContent += `\n\n--- Content from ${file.name} ---\n${result.text}\n`;
          }
        }
      }

      // Process URLs
      for (const url of urls) {
        if (url.trim()) {
          // Try RAG processing first if available
          if (bookId && this.apiKeys.openai) {
            try {
              const ragResult = await ragServiceClient.addURLToRAG(bookId, url.trim(), this.apiKeys.openai);
              ragProcessedFiles.push(ragResult);
              combinedContent += `\n\n--- RAG-processed content from ${url} ---\n${ragResult.content}\n`;
              continue;
            } catch (ragError) {
              console.log('RAG processing failed for URL, using fallback:', ragError.message);
            }
          }

          // Fallback to standard URL processing
          const response = await fetch('/api/parse-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() })
          });
          
          if (response.ok) {
            const result = await response.json();
            combinedContent += `\n\n--- Content from ${url} ---\n${result.content}\n`;
          }
        }
      }

      // If we processed files with RAG, mark this book as RAG-enabled
      if (ragProcessedFiles.length > 0) {
        this.ragEnabled.set(bookId, true);
      }

    } catch (error) {
      console.error('Error processing source files:', error);
    }

    return combinedContent;
  }

  async searchBookKnowledge(bookId, query) {
    try {
      if (this.ragEnabled.get(bookId) && this.apiKeys.openai) {
        return await ragServiceClient.searchKnowledge(bookId, query, this.apiKeys.openai);
      }
      return 'RAG not available for this book';
    } catch (error) {
      console.error('Error searching book knowledge:', error);
      throw error;
    }
  }

  async getRAGInfo(bookId) {
    try {
      return await ragServiceClient.getRAGInfo(bookId);
    } catch (error) {
      console.error('Error getting RAG info:', error);
      return null;
    }
  }

  isRAGEnabled(bookId) {
    return this.ragEnabled.get(bookId) || false;
  }
}

export const aiService = new AIService();
export default aiService;
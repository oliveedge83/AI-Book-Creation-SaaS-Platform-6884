import OpenAI from 'openai';
import { dbHelpers } from './supabase';
import toast from 'react-hot-toast';

class AIService {
  constructor() {
    this.apiKeys = {};
    this.selectedProvider = null;
    this.selectedModel = null;
    this.ragAssistants = new Map(); // Store assistant IDs per book
    this.costEstimator = new CostEstimator();
    this.progressCallbacks = new Map(); // Store progress callbacks per operation
  }

  setApiKey(provider, key) {
    this.apiKeys[provider] = key;
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
    }
  }

  setSelectedModel(provider, modelId) {
    this.selectedProvider = provider;
    this.selectedModel = modelId;
  }

  setProgressCallback(operationId, callback) {
    this.progressCallbacks.set(operationId, callback);
  }

  updateProgress(operationId, progress, message) {
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback({ progress, message, timestamp: new Date().toISOString() });
    }
  }

  // Cost Estimation
  async estimateGenerationCost(bookData, chapters) {
    const totalWords = this.estimateWordCount(bookData, chapters);
    const imagesPerChapter = 1; // Default 1 image per chapter
    const totalImages = chapters.length * imagesPerChapter;
    
    return this.costEstimator.calculateCost({
      provider: this.selectedProvider,
      model: this.selectedModel,
      textTokens: Math.ceil(totalWords * 1.3), // Approximate tokens
      images: totalImages,
      ragEnabled: this.isRAGEnabled(bookData.id)
    });
  }

  estimateWordCount(bookData, chapters) {
    const baseWordsPerPage = 250;
    const estimatedPages = parseInt(bookData.estimated_pages) || 200;
    return estimatedPages * baseWordsPerPage;
  }

  // RAG Setup with OpenAI Assistants
  async initializeRAGForBook(bookId, bookData) {
    if (!this.openai || this.selectedProvider !== 'openai') {
      throw new Error('RAG requires OpenAI API');
    }

    try {
      // Create OpenAI Assistant for this book
      const assistant = await this.openai.beta.assistants.create({
        name: `BookAI Assistant - ${bookData.title}`,
        instructions: `You are an expert book writing assistant specializing in "${bookData.title}". 
        Use the uploaded research materials to generate comprehensive, well-structured content that aligns with the book's learning objectives: ${bookData.learning_objectives}
        
        Target Audience: ${bookData.target_audience}
        Writing Style: ${bookData.writing_style}
        Tone: ${bookData.tone}
        
        Always structure content with proper headers (H1, H2, H3) and include relevant examples from the research materials.`,
        model: this.selectedModel || 'gpt-4-turbo-preview',
        tools: [
          { type: 'retrieval' },
          { type: 'code_interpreter' }
        ]
      });

      this.ragAssistants.set(bookId, assistant.id);
      
      // Store assistant ID in database
      await dbHelpers.updateBook(bookId, {
        openai_assistant_id: assistant.id,
        rag_enabled: true
      });

      return assistant.id;
    } catch (error) {
      console.error('Failed to initialize RAG:', error);
      throw error;
    }
  }

  // Process and upload source files to RAG
  async processSourceFiles(files, urls, bookId) {
    const operationId = `process-sources-${bookId}`;
    this.updateProgress(operationId, 0, 'Starting source file processing...');

    let processedContent = '';
    const totalItems = files.length + urls.length;
    let processed = 0;

    // Process PDFs
    for (const file of files) {
      try {
        this.updateProgress(operationId, (processed / totalItems) * 50, `Processing ${file.name}...`);
        
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        processedContent += `\n\n=== ${file.name} ===\n${result.text}`;
        
        // Upload to OpenAI if RAG is enabled
        if (this.ragAssistants.has(bookId)) {
          await this.uploadToRAG(bookId, file, result.text);
        }
        
        processed++;
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    // Process URLs
    for (const url of urls) {
      try {
        this.updateProgress(operationId, ((processed / totalItems) * 50) + 25, `Processing ${url}...`);
        
        const response = await fetch('/api/parse-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        processedContent += `\n\n=== ${result.title || url} ===\n${result.content}`;
        
        processed++;
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }

    this.updateProgress(operationId, 100, 'Source processing completed!');
    return processedContent;
  }

  async uploadToRAG(bookId, file, content) {
    const assistantId = this.ragAssistants.get(bookId);
    if (!assistantId || !this.openai) return;

    try {
      // Create a file for the assistant
      const uploadedFile = await this.openai.files.create({
        file: new Blob([content], { type: 'text/plain' }),
        purpose: 'assistants'
      });

      // Attach file to assistant
      await this.openai.beta.assistants.files.create(assistantId, {
        file_id: uploadedFile.id
      });
    } catch (error) {
      console.error('Failed to upload to RAG:', error);
    }
  }

  // Enhanced content generation with progress tracking
  async generateTopicContent(bookId, chapterId, topicId, topicData, bookContext) {
    const operationId = `generate-topic-${topicId}`;
    this.updateProgress(operationId, 0, 'Initializing content generation...');

    try {
      // Estimate and display cost
      const costEstimate = await this.estimateTopicCost(topicData);
      this.updateProgress(operationId, 10, `Estimated cost: $${costEstimate.toFixed(4)}`);

      let content = '';
      
      if (this.selectedProvider === 'openai' && this.ragAssistants.has(bookId)) {
        content = await this.generateWithRAG(bookId, topicData, bookContext, operationId);
      } else {
        content = await this.generateWithStandardAPI(topicData, bookContext, operationId);
      }

      // Generate image for the topic
      this.updateProgress(operationId, 90, 'Generating topic image...');
      const imageUrl = await this.generateTopicImage(topicData.title, bookContext);
      
      // Format content with proper headers and image
      const formattedContent = this.formatContentWithImage(content, imageUrl, topicData.title);
      
      this.updateProgress(operationId, 100, 'Content generation completed!');
      return formattedContent;
      
    } catch (error) {
      this.updateProgress(operationId, -1, `Error: ${error.message}`);
      throw error;
    }
  }

  async generateWithRAG(bookId, topicData, bookContext, operationId) {
    const assistantId = this.ragAssistants.get(bookId);
    
    this.updateProgress(operationId, 30, 'Creating conversation thread...');
    
    // Create a thread
    const thread = await this.openai.beta.threads.create();
    
    this.updateProgress(operationId, 40, 'Sending generation request...');
    
    // Add message to thread
    await this.openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Generate comprehensive content for the topic "${topicData.title}" with the following objectives: ${topicData.objectives}

      Please structure the content with:
      - Proper heading hierarchy (H2, H3, H4)
      - Clear introduction and conclusion
      - Practical examples from the research materials
      - Code snippets if relevant
      - Bullet points and numbered lists where appropriate
      
      Target word count: ${topicData.estimated_words || 800} words
      
      Book context: ${JSON.stringify(bookContext)}`
    });

    this.updateProgress(operationId, 50, 'Processing with RAG knowledge base...');
    
    // Run the assistant
    const run = await this.openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    // Poll for completion
    let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
    let progress = 60;
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      this.updateProgress(operationId, Math.min(progress, 85), 'AI generating content...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      progress += 2;
    }

    if (runStatus.status === 'completed') {
      // Get the messages
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      return assistantMessage.content[0].text.value;
    } else {
      throw new Error(`Assistant run failed: ${runStatus.status}`);
    }
  }

  async generateWithStandardAPI(topicData, bookContext, operationId) {
    this.updateProgress(operationId, 40, 'Generating with standard API...');
    
    const prompt = `Generate comprehensive content for the topic "${topicData.title}".

    Objectives: ${topicData.objectives}
    Target audience: ${bookContext.target_audience}
    Writing style: ${bookContext.writing_style}
    Tone: ${bookContext.tone}
    
    Structure the content with proper HTML headers:
    - Use <h2> for main sections
    - Use <h3> for subsections  
    - Use <h4> for sub-subsections
    - Include practical examples and code snippets where relevant
    - Use <ul>, <ol> for lists
    - Use <p> for paragraphs
    - Include <blockquote> for important notes
    
    Target length: ${topicData.estimated_words || 800} words
    
    Return only the HTML content without explanations.`;

    if (this.selectedProvider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.selectedModel || 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      });
      
      return response.choices[0].message.content;
    } else {
      // Fallback demo content with proper formatting
      return this.generateDemoContent(topicData.title);
    }
  }

  // Image generation
  async generateTopicImage(topicTitle, bookContext) {
    try {
      if (this.selectedProvider === 'openai' && this.openai) {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: `Create a professional, educational illustration for the topic "${topicTitle}" in the context of "${bookContext.title}". Style: clean, modern, suitable for a ${bookContext.target_audience} audience. No text in image.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        });
        
        return response.data[0].url;
      } else if (this.apiKeys.stabilityai) {
        return await this.generateWithStabilityAI(topicTitle, bookContext);
      } else {
        // Return placeholder image
        return `https://picsum.photos/800/600?random=${Date.now()}&text=${encodeURIComponent(topicTitle)}`;
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      return `https://picsum.photos/800/600?random=${Date.now()}`;
    }
  }

  async generateWithStabilityAI(topicTitle, bookContext) {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Professional educational illustration for "${topicTitle}" in "${bookContext.title}" context`,
        style: 'digital-art'
      })
    });
    
    const result = await response.json();
    return result.imageUrl;
  }

  formatContentWithImage(content, imageUrl, topicTitle) {
    const imageHtml = `<div class="topic-image" style="text-align: center; margin: 20px 0;">
      <img src="${imageUrl}" alt="${topicTitle}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
      <p style="font-size: 14px; color: #666; margin-top: 8px; font-style: italic;">Figure: ${topicTitle}</p>
    </div>`;
    
    // Insert image after the first heading or at the beginning
    if (content.includes('<h2>')) {
      const firstH2Index = content.indexOf('</h2>');
      return content.slice(0, firstH2Index + 5) + imageHtml + content.slice(firstH2Index + 5);
    } else {
      return imageHtml + content;
    }
  }

  generateDemoContent(topicTitle) {
    return `
      <h2>${topicTitle}</h2>
      <p>This comprehensive section covers the essential aspects of ${topicTitle}, providing both theoretical understanding and practical applications.</p>
      
      <h3>Overview</h3>
      <p>Understanding ${topicTitle} is crucial for mastering the broader concepts presented in this book. This section will guide you through the fundamental principles and their real-world applications.</p>
      
      <h3>Key Concepts</h3>
      <ul>
        <li><strong>Fundamental Principle 1:</strong> Detailed explanation of the core concept</li>
        <li><strong>Fundamental Principle 2:</strong> Advanced applications and use cases</li>
        <li><strong>Fundamental Principle 3:</strong> Best practices and recommendations</li>
      </ul>
      
      <h3>Practical Implementation</h3>
      <p>Let's explore how to implement these concepts in practice:</p>
      
      <h4>Step-by-Step Guide</h4>
      <ol>
        <li>Initial setup and configuration</li>
        <li>Core implementation details</li>
        <li>Testing and validation procedures</li>
        <li>Optimization and performance tuning</li>
      </ol>
      
      <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; font-style: italic; color: #475569;">
        <p><strong>Pro Tip:</strong> Remember to always validate your implementation against the requirements and test thoroughly before deployment.</p>
      </blockquote>
      
      <h3>Common Challenges and Solutions</h3>
      <p>When working with ${topicTitle}, you may encounter several common challenges:</p>
      
      <h4>Challenge 1: Implementation Complexity</h4>
      <p>Break down complex implementations into smaller, manageable components. This approach makes debugging easier and improves code maintainability.</p>
      
      <h4>Challenge 2: Performance Optimization</h4>
      <p>Focus on identifying bottlenecks early in the development process. Use profiling tools and performance metrics to guide optimization efforts.</p>
      
      <h3>Advanced Topics</h3>
      <p>For those ready to dive deeper into ${topicTitle}, consider exploring these advanced concepts:</p>
      <ul>
        <li>Advanced configuration patterns</li>
        <li>Integration with external systems</li>
        <li>Scalability considerations</li>
        <li>Security best practices</li>
      </ul>
      
      <h3>Summary</h3>
      <p>In this section, we've covered the essential aspects of ${topicTitle}, from basic concepts to advanced implementations. The key takeaways include understanding the fundamental principles, following best practices, and being aware of common challenges and their solutions.</p>
      
      <p>In the next section, we'll build upon these concepts to explore more advanced topics and their practical applications.</p>
    `;
  }

  async estimateTopicCost(topicData) {
    const estimatedTokens = (topicData.estimated_words || 800) * 1.3;
    return this.costEstimator.calculateContentCost(this.selectedProvider, this.selectedModel, estimatedTokens);
  }

  // A/B Testing functionality
  async generateContentVariations(topicData, bookContext, variationCount = 2) {
    const variations = [];
    const basePrompt = this.buildContentPrompt(topicData, bookContext);
    
    for (let i = 0; i < variationCount; i++) {
      const variation = {
        id: `variation-${i + 1}`,
        style: i === 0 ? 'detailed' : 'concise',
        temperature: i === 0 ? 0.7 : 0.9
      };
      
      try {
        const content = await this.generateWithVariation(basePrompt, variation);
        variations.push({
          ...variation,
          content,
          metrics: await this.analyzeContent(content)
        });
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
      }
    }
    
    return variations;
  }

  async analyzeContent(content) {
    const wordCount = content.split(/\s+/).length;
    const readabilityScore = this.calculateReadabilityScore(content);
    const structureScore = this.analyzeStructure(content);
    
    return {
      wordCount,
      readabilityScore,
      structureScore,
      overallScore: (readabilityScore + structureScore) / 2
    };
  }

  calculateReadabilityScore(content) {
    // Simplified readability calculation
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Score based on sentence length (ideal: 15-20 words)
    if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
      return 90;
    } else if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) {
      return 75;
    } else {
      return 60;
    }
  }

  analyzeStructure(content) {
    const hasH2 = content.includes('<h2>');
    const hasH3 = content.includes('<h3>');
    const hasList = content.includes('<ul>') || content.includes('<ol>');
    const hasBlockquote = content.includes('<blockquote>');
    
    let score = 50;
    if (hasH2) score += 15;
    if (hasH3) score += 15;
    if (hasList) score += 10;
    if (hasBlockquote) score += 10;
    
    return Math.min(score, 100);
  }

  // Content optimization suggestions
  generateOptimizationSuggestions(content, metrics) {
    const suggestions = [];
    
    if (metrics.wordCount < 300) {
      suggestions.push({
        type: 'length',
        message: 'Consider expanding the content with more examples and details',
        priority: 'high'
      });
    }
    
    if (metrics.readabilityScore < 70) {
      suggestions.push({
        type: 'readability',
        message: 'Try shorter sentences and simpler vocabulary for better readability',
        priority: 'medium'
      });
    }
    
    if (metrics.structureScore < 70) {
      suggestions.push({
        type: 'structure',
        message: 'Add more headings, lists, and callout boxes for better structure',
        priority: 'medium'
      });
    }
    
    if (!content.includes('<h3>')) {
      suggestions.push({
        type: 'structure',
        message: 'Add subsections with H3 headers to improve content organization',
        priority: 'low'
      });
    }
    
    return suggestions;
  }

  isRAGEnabled(bookId) {
    return this.ragAssistants.has(bookId);
  }
}

// Cost estimation class
class CostEstimator {
  constructor() {
    this.pricing = {
      openai: {
        'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'dall-e-3': { image: 0.040 } // per image
      },
      anthropic: {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 }
      },
      stabilityai: {
        'stable-diffusion': { image: 0.018 }
      }
    };
  }

  calculateCost({ provider, model, textTokens, images, ragEnabled }) {
    let totalCost = 0;
    
    // Text generation cost
    if (this.pricing[provider] && this.pricing[provider][model]) {
      const modelPricing = this.pricing[provider][model];
      const inputTokens = textTokens * 0.3; // Approximate input tokens
      const outputTokens = textTokens * 0.7; // Approximate output tokens
      
      totalCost += (inputTokens / 1000) * modelPricing.input;
      totalCost += (outputTokens / 1000) * modelPricing.output;
    }
    
    // Image generation cost
    if (images > 0) {
      if (provider === 'openai') {
        totalCost += images * this.pricing.openai['dall-e-3'].image;
      } else if (provider === 'stabilityai') {
        totalCost += images * this.pricing.stabilityai['stable-diffusion'].image;
      }
    }
    
    // RAG overhead (approximately 20% more tokens for context)
    if (ragEnabled) {
      totalCost *= 1.2;
    }
    
    return totalCost;
  }

  calculateContentCost(provider, model, tokens) {
    if (this.pricing[provider] && this.pricing[provider][model]) {
      const modelPricing = this.pricing[provider][model];
      const inputTokens = tokens * 0.3;
      const outputTokens = tokens * 0.7;
      
      return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
    }
    
    return 0;
  }
}

export const aiService = new AIService();
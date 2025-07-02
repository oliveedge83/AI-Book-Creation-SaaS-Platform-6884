import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import { aiService } from '../lib/aiService';
import SafeIcon from '../common/SafeIcon';
import ModelSelector from '../components/ModelSelector';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiBook, FiUsers, FiTarget, FiFileText, FiUpload, FiLink, FiArrowRight, FiZap, FiSettings, FiDatabase } = FiIcons;

const BookCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [sourceUrls, setSourceUrls] = useState(['']);
  const [apiKeys, setApiKeys] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [generatingTOC, setGeneratingTOC] = useState(false);
  const [ragStatus, setRagStatus] = useState({ enabled: false, processing: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      writingStyle: 'conversational',
      tone: 'professional',
      estimatedPages: '250'
    }
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await dbHelpers.getApiKeys(user.id);
      if (error) throw error;

      const keyMap = {};
      data?.forEach(item => {
        if (item.has_key) {
          keyMap[item.provider] = true; // In real app, decrypt the key
          // Set the first available provider as default
          if (!selectedProvider) {
            setSelectedProvider(item.provider);
          }
        }
      });
      setApiKeys(keyMap);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const addUrl = () => {
    setSourceUrls([...sourceUrls, '']);
  };

  const removeUrl = (index) => {
    setSourceUrls(sourceUrls.filter((_, i) => i !== index));
  };

  const updateUrl = (index, value) => {
    const newUrls = [...sourceUrls];
    newUrls[index] = value;
    setSourceUrls(newUrls);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setSourceFiles([...sourceFiles, ...files]);
  };

  const removeFile = (index) => {
    setSourceFiles(sourceFiles.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    if (!selectedModel && Object.keys(apiKeys).length > 0) {
      toast.error('Please select an AI model for content generation');
      return;
    }

    setLoading(true);
    setGeneratingTOC(true);
    
    try {
      // Create the book first
      const bookData = {
        user_id: user.id,
        title: data.title,
        target_audience: data.targetAudience,
        learning_objectives: data.learningObjectives,
        writing_style: data.writingStyle,
        tone: data.tone,
        estimated_pages: parseInt(data.estimatedPages),
        selected_provider: selectedProvider,
        selected_model: selectedModel?.id,
        status: 'generating_toc',
        created_at: new Date().toISOString()
      };

      const { data: book, error } = await dbHelpers.createBook(bookData);
      if (error) throw error;

      // Set up AI service with API keys
      if (apiKeys.openai) {
        aiService.setApiKey('openai', 'demo-key'); // In real app, use actual key
      }
      if (apiKeys.anthropic) {
        aiService.setApiKey('anthropic', 'demo-key');
      }
      if (apiKeys.openrouter) {
        aiService.setApiKey('openrouter', 'demo-key');
      }
      aiService.setSelectedModel(selectedProvider, selectedModel?.id);

      // Initialize RAG if using OpenAI and have source materials
      const validUrls = sourceUrls.filter(url => url.trim());
      const hasSourceMaterials = sourceFiles.length > 0 || validUrls.length > 0;
      
      if (selectedProvider === 'openai' && hasSourceMaterials) {
        setRagStatus({ enabled: true, processing: true });
        toast.info('Setting up RAG knowledge base with your research materials...');
        
        try {
          await aiService.initializeRAGForBook(book.id, bookData);
          toast.success('RAG knowledge base initialized!');
        } catch (ragError) {
          console.error('RAG initialization failed:', ragError);
          toast.warning('RAG setup failed, but content generation will continue');
        }
      }

      // Process source materials with RAG support
      let sourceContent = '';
      if (hasSourceMaterials) {
        toast.info('Processing source materials with AI analysis...');
        sourceContent = await aiService.processSourceFiles(sourceFiles, validUrls, book.id);
        setRagStatus({ enabled: true, processing: false });
      }

      // Store source files metadata
      for (const file of sourceFiles) {
        await dbHelpers.createSourceFile({
          book_id: book.id,
          type: 'pdf',
          name: file.name,
          url: null,
          size: file.size
        });
      }

      for (const url of validUrls) {
        await dbHelpers.createSourceFile({
          book_id: book.id,
          type: 'url',
          name: url,
          url: url,
          size: null
        });
      }

      // Generate AI-powered table of contents with RAG
      if (selectedModel) {
        toast.info('Generating AI-powered table of contents with research insights...');
        
        try {
          const tocResponse = await aiService.generateTableOfContents(bookData, sourceContent, book.id);
          const tocData = typeof tocResponse === 'string' ? JSON.parse(tocResponse) : tocResponse;

          // Create chapters and topics from AI response
          for (const [chapterIndex, chapter] of tocData.chapters.entries()) {
            const { data: newChapter, error: chapterError } = await dbHelpers.createChapter({
              book_id: book.id,
              title: chapter.title,
              description: chapter.description,
              order_index: chapterIndex
            });
            
            if (chapterError) throw chapterError;

            // Create topics for each chapter
            for (const [topicIndex, topic] of chapter.topics.entries()) {
              const { error: topicError } = await dbHelpers.createTopic({
                chapter_id: newChapter.id,
                title: topic.title,
                objectives: topic.objectives,
                estimated_words: topic.estimated_words,
                order_index: topicIndex,
                status: 'draft'
              });
              
              if (topicError) throw topicError;
            }
          }

          // Update book status
          await dbHelpers.updateBook(book.id, {
            status: 'toc_generated',
            source_content: sourceContent,
            rag_enabled: aiService.isRAGEnabled(book.id)
          });

          toast.success('Book created with AI-generated table of contents and RAG knowledge base!');
          navigate(`/book/${book.id}/toc`);
        } catch (tocError) {
          console.error('TOC generation failed:', tocError);
          toast.error('Failed to generate TOC with AI. You can create it manually.');
          navigate(`/book/${book.id}/toc`);
        }
      } else {
        toast.success('Book created! You can now build the table of contents manually.');
        navigate(`/book/${book.id}/toc`);
      }
      
    } catch (error) {
      toast.error('Failed to create book');
      console.error('Error creating book:', error);
    } finally {
      setLoading(false);
      setGeneratingTOC(false);
      setRagStatus({ enabled: false, processing: false });
    }
  };

  const hasValidApiKeys = Object.keys(apiKeys).length > 0;
  const hasOpenAIKey = apiKeys.openai;
  const hasSourceMaterials = sourceFiles.length > 0 || sourceUrls.some(url => url.trim());

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New AI-Powered Book</h1>
            <p className="text-gray-600 mt-2">
              Configure your book and let AI generate comprehensive content based on your research materials
            </p>
            {hasOpenAIKey && hasSourceMaterials && (
              <div className="mt-3 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <SafeIcon icon={FiDatabase} className="h-4 w-4 mr-1" />
                RAG-Enhanced Generation Available
              </div>
            )}
          </div>

          {!hasValidApiKeys && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <SafeIcon icon={FiSettings} className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">API Keys Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    To use AI-powered content generation, please configure your API keys in{' '}
                    <button
                      onClick={() => navigate('/settings')}
                      className="underline hover:text-yellow-900"
                    >
                      Settings
                    </button>
                    . You can still create books manually without API keys.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasOpenAIKey && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <SafeIcon icon={FiDatabase} className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">RAG-Enhanced Generation</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    OpenAI API detected! Upload PDFs and add URLs to create a knowledge base that AI will use to generate highly relevant, research-backed content for your book.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* AI Model Selection */}
            {hasValidApiKeys && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <SafeIcon icon={FiZap} className="h-6 w-6 text-primary-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">AI Configuration</h2>
                  {ragStatus.enabled && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        <SafeIcon icon={FiDatabase} className="h-3 w-3 mr-1" />
                        RAG Ready
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Provider
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => {
                        setSelectedProvider(e.target.value);
                        setSelectedModel(null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select AI Provider</option>
                      {Object.keys(apiKeys).map(provider => (
                        <option key={provider} value={provider}>
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                          {provider === 'openai' && ' (RAG Supported)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProvider && (
                    <ModelSelector
                      selectedProvider={selectedProvider}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      apiKeys={apiKeys}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiBook} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Book Title *
                  </label>
                  <input
                    {...register('title', {
                      required: 'Book title is required',
                      minLength: {
                        value: 3,
                        message: 'Title must be at least 3 characters'
                      }
                    })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your book title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience *
                    </label>
                    <select
                      {...register('targetAudience', {
                        required: 'Target audience is required'
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select target audience</option>
                      <option value="beginners">Beginners</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="professionals">Professionals</option>
                      <option value="students">Students</option>
                      <option value="general">General Audience</option>
                    </select>
                    {errors.targetAudience && (
                      <p className="mt-1 text-sm text-red-600">{errors.targetAudience.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Pages
                    </label>
                    <select
                      {...register('estimatedPages')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="150">150-200 pages</option>
                      <option value="200">200-250 pages</option>
                      <option value="250">250-300 pages</option>
                      <option value="300">300+ pages</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Objectives *
                  </label>
                  <textarea
                    {...register('learningObjectives', {
                      required: 'Learning objectives are required for AI generation'
                    })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe what readers should learn from this book. Be specific about skills, knowledge, and outcomes. This helps AI generate better content structure and enables RAG to find relevant information."
                  />
                  {errors.learningObjectives && (
                    <p className="mt-1 text-sm text-red-600">{errors.learningObjectives.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Writing Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiFileText} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Writing Style & Tone</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Writing Style
                  </label>
                  <select
                    {...register('writingStyle')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="conversational">Conversational</option>
                    <option value="academic">Academic</option>
                    <option value="technical">Technical</option>
                    <option value="narrative">Narrative</option>
                    <option value="instructional">Instructional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    {...register('tone')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="authoritative">Authoritative</option>
                    <option value="casual">Casual</option>
                    <option value="inspiring">Inspiring</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Source Materials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiUpload} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Research Materials</h2>
                <div className="ml-auto">
                  <span className="text-sm text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                    {hasOpenAIKey ? 'RAG-Enhanced Analysis' : 'Basic AI Analysis'}
                  </span>
                </div>
              </div>

              {ragStatus.processing && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-800 text-sm">Setting up RAG knowledge base...</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Research PDFs
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                    <SafeIcon icon={FiUpload} className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">
                      Drop research PDFs here or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {hasOpenAIKey 
                        ? 'AI will create a searchable knowledge base for precise content generation'
                        : 'AI will extract and analyze content from your PDFs'}
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Choose Files
                    </label>
                  </div>

                  {sourceFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {sourceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <SafeIcon icon={FiFileText} className="h-5 w-5 text-red-500 mr-2" />
                            <div>
                              <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                              <div className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                {hasOpenAIKey && <span className="ml-2 text-blue-600">• RAG Ready</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference URLs
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Add URLs to articles, documentation, or other web content for {hasOpenAIKey ? 'RAG-enhanced' : 'AI'} analysis
                  </p>
                  <div className="space-y-3">
                    {sourceUrls.map((url, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                          <SafeIcon 
                            icon={FiLink} 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
                          />
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => updateUrl(index, e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="https://example.com/article"
                          />
                        </div>
                        {sourceUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUrl(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addUrl}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add another URL
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {generatingTOC ? 'Creating RAG Knowledge Base...' : 'Creating Book...'}
                  </>
                ) : (
                  <>
                    <SafeIcon icon={selectedModel ? (hasOpenAIKey && hasSourceMaterials ? FiDatabase : FiZap) : FiArrowRight} className="h-5 w-5 mr-2" />
                    {selectedModel 
                      ? (hasOpenAIKey && hasSourceMaterials ? 'Create Book with RAG' : 'Create Book with AI')
                      : 'Create Book Manually'}
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default BookCreation;
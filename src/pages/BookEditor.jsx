import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import { aiService } from '../lib/aiService';
import SafeIcon from '../common/SafeIcon';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiBook, FiEdit3, FiSave, FiDownload, FiImage, FiPlay, FiPause, FiCheck, FiClock, FiZap, FiRefreshCw } = FiIcons;

const BookEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  useEffect(() => {
    if (user && id) {
      loadBook();
    }
  }, [user, id]);

  const loadBook = async () => {
    try {
      const { data, error } = await dbHelpers.getBooks(user.id);
      if (error) throw error;

      const currentBook = data.find(b => b.id === id);
      if (!currentBook) {
        toast.error('Book not found');
        return;
      }

      setBook(currentBook);
      setChapters(currentBook.chapters || []);

      // Auto-select first topic if available
      if (currentBook.chapters?.length > 0 && currentBook.chapters[0].topics?.length > 0) {
        setSelectedTopic(currentBook.chapters[0].topics[0]);
      }

      // Set up AI service with book's configuration
      if (currentBook.selected_provider && currentBook.selected_model) {
        // In a real app, you'd decrypt the API key from the database
        aiService.setSelectedModel(currentBook.selected_provider, currentBook.selected_model);
      }
    } catch (error) {
      toast.error('Failed to load book');
      console.error('Error loading book:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTopicContent = async (topic) => {
    setGenerating(true);
    setGeneratingTopicId(topic.id);

    try {
      // Update topic status
      await updateTopicStatus(topic.id, 'generating');

      // Find the chapter context
      const chapter = chapters.find(ch => 
        ch.topics?.some(t => t.id === topic.id)
      );

      // Generate content using AI service
      const content = await aiService.generateTopicContent(
        topic,
        chapter,
        book,
        book.source_content || ''
      );

      // Update topic with generated content
      await updateTopicContent(topic.id, content);
      toast.success(`Content generated for "${topic.title}"!`);
    } catch (error) {
      toast.error('Failed to generate content');
      await updateTopicStatus(topic.id, 'draft');
    } finally {
      setGenerating(false);
      setGeneratingTopicId(null);
    }
  };

  const generateAllContent = async () => {
    setGeneratingAll(true);
    let totalGenerated = 0;
    let totalTopics = 0;

    // Count total topics
    for (const chapter of chapters) {
      totalTopics += chapter.topics?.length || 0;
    }

    if (totalTopics === 0) {
      toast.error('No topics found to generate content for');
      setGeneratingAll(false);
      return;
    }

    try {
      toast.info(`Starting AI content generation for ${totalTopics} topics...`);

      for (const chapter of chapters) {
        if (!chapter.topics) continue;

        for (const topic of chapter.topics) {
          if (!topic.content || topic.content.trim().length < 100) {
            try {
              setGeneratingTopicId(topic.id);
              await updateTopicStatus(topic.id, 'generating');

              const content = await aiService.generateTopicContent(
                topic,
                chapter,
                book,
                book.source_content || ''
              );

              await updateTopicContent(topic.id, content);
              totalGenerated++;
              
              toast.success(`Generated ${totalGenerated}/${totalTopics}: "${topic.title}"`);
              
              // Add a small delay to avoid rate limiting
              if (totalGenerated < totalTopics) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error(`Failed to generate content for topic ${topic.id}:`, error);
              await updateTopicStatus(topic.id, 'draft');
              toast.error(`Failed to generate content for "${topic.title}"`);
            }
          }
        }
      }

      toast.success(`🎉 Book generation complete! Generated content for ${totalGenerated} topics.`);
    } catch (error) {
      toast.error('Content generation process failed');
    } finally {
      setGeneratingAll(false);
      setGeneratingTopicId(null);
    }
  };

  const updateTopicContent = async (topicId, content) => {
    try {
      await dbHelpers.updateTopic(topicId, {
        content,
        status: 'completed',
        updated_at: new Date().toISOString()
      });

      // Update local state
      setChapters(chapters.map(chapter => ({
        ...chapter,
        topics: chapter.topics?.map(topic => 
          topic.id === topicId ? { ...topic, content, status: 'completed' } : topic
        ) || []
      })));

      // Update selected topic if it's the one being edited
      if (selectedTopic?.id === topicId) {
        setSelectedTopic({ ...selectedTopic, content, status: 'completed' });
      }
    } catch (error) {
      toast.error('Failed to save content');
    }
  };

  const updateTopicStatus = async (topicId, status) => {
    try {
      await dbHelpers.updateTopic(topicId, { status });

      setChapters(chapters.map(chapter => ({
        ...chapter,
        topics: chapter.topics?.map(topic => 
          topic.id === topicId ? { ...topic, status } : topic
        ) || []
      })));

      if (selectedTopic?.id === topicId) {
        setSelectedTopic({ ...selectedTopic, status });
      }
    } catch (error) {
      console.error('Failed to update topic status:', error);
    }
  };

  const saveTopicContent = async () => {
    if (!selectedTopic) return;

    setSaving(true);
    try {
      await updateTopicContent(selectedTopic.id, selectedTopic.content);
      toast.success('Content saved!');
    } catch (error) {
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const generateImage = async (topic) => {
    toast.success('Image generation feature coming soon!');
  };

  const exportBook = async (format) => {
    toast.success(`${format} export feature coming soon!`);
  };

  const getTopicStatusIcon = (topic) => {
    if (generatingTopicId === topic.id) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
    }
    
    switch (topic.status) {
      case 'completed':
        return <SafeIcon icon={FiCheck} className="h-4 w-4 text-green-500" />;
      case 'generating':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      default:
        return <SafeIcon icon={FiClock} className="h-4 w-4 text-gray-400" />;
    }
  };

  const getBookProgress = () => {
    let totalTopics = 0;
    let completedTopics = 0;

    chapters.forEach(chapter => {
      if (chapter.topics) {
        totalTopics += chapter.topics.length;
        completedTopics += chapter.topics.filter(topic => 
          topic.status === 'completed' && topic.content && topic.content.trim().length > 100
        ).length;
      }
    });

    return { totalTopics, completedTopics, percentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0 };
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const progress = getBookProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar - Chapter/Topic Navigation */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{book?.title}</h2>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress.completedTopics}/{progress.totalTopics} topics</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => exportBook('PDF')}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <SafeIcon icon={FiDownload} className="h-4 w-4 mr-1" />
                PDF
              </button>
              <button
                onClick={() => exportBook('EPUB')}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <SafeIcon icon={FiDownload} className="h-4 w-4 mr-1" />
                EPUB
              </button>
            </div>

            {book?.selected_model && (
              <button
                onClick={generateAllContent}
                disabled={generatingAll || progress.totalTopics === 0}
                className="w-full inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {generatingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating All...
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiZap} className="h-4 w-4 mr-2" />
                    Generate All Content
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-4">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2 px-2">{chapter.title}</h3>
                <div className="space-y-1">
                  {chapter.topics?.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className={`chapter-item flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                        selectedTopic?.id === topic.id
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{topic.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {topic.content && topic.content.trim().length > 100 
                            ? `${Math.round(topic.content.length / 5)} words` 
                            : 'No content'}
                        </p>
                        {topic.estimated_words && (
                          <p className="text-xs text-blue-600">
                            Target: {topic.estimated_words} words
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTopicStatusIcon(topic)}
                        {(!topic.content || topic.content.trim().length < 100) && book?.selected_model && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateTopicContent(topic);
                            }}
                            disabled={generating || generatingAll}
                            className="p-1 text-primary-600 hover:text-primary-700 disabled:opacity-50"
                          >
                            <SafeIcon icon={FiPlay} className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500 px-2">No topics in this chapter</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {selectedTopic ? (
            <>
              {/* Topic Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h1>
                    <p className="text-gray-600 mt-1">{selectedTopic.objectives}</p>
                    {selectedTopic.estimated_words && (
                      <p className="text-sm text-blue-600 mt-1">
                        Target: {selectedTopic.estimated_words} words
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => generateImage(selectedTopic)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <SafeIcon icon={FiImage} className="h-4 w-4 mr-2" />
                      Generate Image
                    </button>
                    {(!selectedTopic.content || selectedTopic.content.trim().length < 100) && book?.selected_model && (
                      <button
                        onClick={() => generateTopicContent(selectedTopic)}
                        disabled={generating || generatingAll}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {generatingTopicId === selectedTopic.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <SafeIcon icon={FiZap} className="h-4 w-4 mr-2" />
                            Generate Content
                          </>
                        )}
                      </button>
                    )}
                    {selectedTopic.content && selectedTopic.content.trim().length > 100 && book?.selected_model && (
                      <button
                        onClick={() => generateTopicContent(selectedTopic)}
                        disabled={generating || generatingAll}
                        className="inline-flex items-center px-3 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                      >
                        <SafeIcon icon={FiRefreshCw} className="h-4 w-4 mr-2" />
                        Regenerate
                      </button>
                    )}
                    <button
                      onClick={saveTopicContent}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <SafeIcon icon={FiSave} className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 p-6 bg-gray-50">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                  <ReactQuill
                    value={selectedTopic.content || ''}
                    onChange={(content) => setSelectedTopic({ ...selectedTopic, content })}
                    modules={quillModules}
                    className="editor-content h-full"
                    placeholder={book?.selected_model 
                      ? "Click 'Generate Content' to let AI create comprehensive content for this topic, or start writing manually..." 
                      : "Start writing your content here..."}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <SafeIcon icon={FiEdit3} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a topic to start editing
                </h3>
                <p className="text-gray-600 mb-6">
                  Choose a topic from the sidebar to view and edit its content
                </p>
                {book?.selected_model && progress.totalTopics > 0 && (
                  <button
                    onClick={generateAllContent}
                    disabled={generatingAll}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {generatingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating All Content...
                      </>
                    ) : (
                      <>
                        <SafeIcon icon={FiZap} className="h-5 w-5 mr-2" />
                        Generate All Content with AI
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookEditor;
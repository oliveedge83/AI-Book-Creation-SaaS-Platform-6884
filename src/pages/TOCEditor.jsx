import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiPlus, FiEdit3, FiTrash2, FiSave, FiArrowRight, FiMove, FiList, FiFileText, FiLink, FiZap } = FiIcons;

const TOCEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        navigate('/dashboard');
        return;
      }

      setBook(currentBook);
      setChapters(currentBook.chapters || []);

      // If no chapters exist and book has AI model, generate initial TOC
      if ((!currentBook.chapters || currentBook.chapters.length === 0) && 
          currentBook.selected_model) {
        generateInitialTOC(currentBook);
      }
    } catch (error) {
      toast.error('Failed to load book');
      console.error('Error loading book:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialTOC = async (bookData) => {
    setGenerating(true);
    
    try {
      // Generate initial chapter structure based on book details
      const initialChapters = [
        {
          title: 'Introduction and Foundations',
          description: 'Setting the groundwork for understanding the subject',
          topics: [
            { title: 'Welcome and Overview', objectives: 'Understand the scope and goals of this book', estimated_words: 1200 },
            { title: 'Core Concepts and Terminology', objectives: 'Master the fundamental vocabulary and concepts', estimated_words: 1800 },
            { title: 'Historical Context and Evolution', objectives: 'Learn how this field has developed over time', estimated_words: 1500 }
          ]
        },
        {
          title: 'Fundamental Principles',
          description: 'Deep dive into the core principles and theories',
          topics: [
            { title: 'Theoretical Framework', objectives: 'Understand the underlying theoretical foundation', estimated_words: 2000 },
            { title: 'Key Methodologies', objectives: 'Learn the primary approaches and methodologies', estimated_words: 1800 },
            { title: 'Best Practices and Standards', objectives: 'Discover industry best practices and standards', estimated_words: 1600 }
          ]
        },
        {
          title: 'Practical Applications',
          description: 'Real-world implementation and case studies',
          topics: [
            { title: 'Implementation Strategies', objectives: 'Learn how to apply concepts in practice', estimated_words: 2200 },
            { title: 'Case Studies and Examples', objectives: 'Analyze real-world examples and success stories', estimated_words: 1900 },
            { title: 'Tools and Technologies', objectives: 'Master the essential tools and technologies', estimated_words: 1700 }
          ]
        },
        {
          title: 'Advanced Techniques',
          description: 'Advanced concepts and cutting-edge approaches',
          topics: [
            { title: 'Advanced Strategies', objectives: 'Explore sophisticated techniques and approaches', estimated_words: 2100 },
            { title: 'Optimization and Performance', objectives: 'Learn how to optimize and improve performance', estimated_words: 1800 },
            { title: 'Future Trends and Innovations', objectives: 'Understand emerging trends and future directions', estimated_words: 1600 }
          ]
        }
      ];

      const createdChapters = [];
      
      for (const chapter of initialChapters) {
        const { data: newChapter, error } = await dbHelpers.createChapter({
          book_id: bookData.id,
          title: chapter.title,
          description: chapter.description,
          order_index: chapter.order_index
        });
        
        if (error) throw error;

        const chapterTopics = [];
        for (const [topicIndex, topic] of chapter.topics.entries()) {
          const { data: newTopic, error: topicError } = await dbHelpers.createTopic({
            chapter_id: newChapter.id,
            title: topic.title,
            objectives: topic.objectives,
            estimated_words: topic.estimated_words,
            order_index: topicIndex,
            status: 'draft'
          });
          
          if (topicError) throw topicError;
          chapterTopics.push(newTopic);
        }

        createdChapters.push({
          ...newChapter,
          topics: chapterTopics
        });
      }

      setChapters(createdChapters);
      toast.success('Table of contents generated!');
      
    } catch (error) {
      toast.error('Failed to generate TOC');
      console.error('Error generating TOC:', error);
    } finally {
      setGenerating(false);
    }
  };

  const addChapter = async () => {
    try {
      const { data, error } = await dbHelpers.createChapter({
        book_id: id,
        title: 'New Chapter',
        description: '',
        order_index: chapters.length
      });
      
      if (error) throw error;

      const newChapter = { ...data, topics: [] };
      setChapters([...chapters, newChapter]);
      toast.success('Chapter added');
    } catch (error) {
      toast.error('Failed to add chapter');
    }
  };

  const updateChapter = async (chapterId, updates) => {
    try {
      const { error } = await dbHelpers.updateChapter(chapterId, updates);
      if (error) throw error;

      setChapters(chapters.map(chapter => 
        chapter.id === chapterId ? { ...chapter, ...updates } : chapter
      ));
    } catch (error) {
      toast.error('Failed to update chapter');
    }
  };

  const addTopic = async (chapterId) => {
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      const { data, error } = await dbHelpers.createTopic({
        chapter_id: chapterId,
        title: 'New Topic',
        objectives: '',
        estimated_words: 1500,
        order_index: chapter.topics?.length || 0,
        status: 'draft'
      });
      
      if (error) throw error;

      setChapters(chapters.map(chapter => 
        chapter.id === chapterId 
          ? { ...chapter, topics: [...(chapter.topics || []), data] }
          : chapter
      ));
      toast.success('Topic added');
    } catch (error) {
      toast.error('Failed to add topic');
    }
  };

  const updateTopic = async (topicId, updates) => {
    try {
      const { error } = await dbHelpers.updateTopic(topicId, updates);
      if (error) throw error;

      setChapters(chapters.map(chapter => ({
        ...chapter,
        topics: chapter.topics?.map(topic => 
          topic.id === topicId ? { ...topic, ...updates } : topic
        ) || []
      })));
    } catch (error) {
      toast.error('Failed to update topic');
    }
  };

  const proceedToContentGeneration = async () => {
    setSaving(true);
    
    try {
      // Update book status to ready for content generation
      await dbHelpers.updateBook(id, {
        status: 'ready_for_generation'
      });
      
      toast.success('TOC saved! Proceeding to content generation...');
      navigate(`/book/${id}`);
    } catch (error) {
      toast.error('Failed to save TOC');
    } finally {
      setSaving(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {generating ? 'Generating table of contents...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{book?.title}</h1>
              <p className="text-gray-600 mt-1">
                Edit your table of contents and add additional context for each chapter/topic
              </p>
              {book?.selected_model && (
                <div className="mt-2 inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <SafeIcon icon={FiZap} className="h-4 w-4 mr-1" />
                  AI Model: {book.selected_model}
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={addChapter}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <SafeIcon icon={FiPlus} className="h-4 w-4 mr-2" />
                Add Chapter
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={proceedToContentGeneration}
                disabled={saving || chapters.length === 0}
                className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <SafeIcon icon={book?.selected_model ? FiZap : FiArrowRight} className="h-4 w-4 mr-2" />
                )}
                {book?.selected_model ? 'Generate AI Content' : 'Start Manual Editing'}
              </motion.button>
            </div>
          </div>

          {/* TOC Editor */}
          <div className="space-y-6">
            {chapters.map((chapter, chapterIndex) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: chapterIndex * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                {/* Chapter Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <SafeIcon icon={FiList} className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                        className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 w-full"
                        placeholder="Chapter title"
                      />
                      <textarea
                        value={chapter.description || ''}
                        onChange={(e) => updateChapter(chapter.id, { description: e.target.value })}
                        rows={2}
                        className="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 w-full resize-none"
                        placeholder="Chapter description and context for AI generation..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => addTopic(chapter.id)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <SafeIcon icon={FiPlus} className="h-3 w-3 mr-1" />
                    Add Topic
                  </button>
                </div>

                {/* Topics */}
                <div className="space-y-3">
                  {chapter.topics?.map((topic, topicIndex) => (
                    <div
                      key={topic.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={topic.title}
                          onChange={(e) => updateTopic(topic.id, { title: e.target.value })}
                          className="w-full font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                          placeholder="Topic title"
                        />
                        
                        <textarea
                          value={topic.objectives || ''}
                          onChange={(e) => updateTopic(topic.id, { objectives: e.target.value })}
                          rows={2}
                          className="w-full text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 resize-none"
                          placeholder="Learning objectives and key points for this topic..."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Estimated Words
                            </label>
                            <input
                              type="number"
                              value={topic.estimated_words || 1500}
                              onChange={(e) => updateTopic(topic.id, { estimated_words: parseInt(e.target.value) })}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              min="500"
                              max="5000"
                              step="100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Status
                            </label>
                            <select
                              value={topic.status || 'draft'}
                              onChange={(e) => updateTopic(topic.id, { status: e.target.value })}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="draft">Draft</option>
                              <option value="ready">Ready for Generation</option>
                              <option value="generating">Generating</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Additional Context for AI (optional)
                          </label>
                          <textarea
                            value={topic.additional_context || ''}
                            onChange={(e) => updateTopic(topic.id, { additional_context: e.target.value })}
                            rows={3}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                            placeholder="Add specific instructions, must-have subtopics, or additional context for AI content generation..."
                          />
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No topics yet. Click "Add Topic" to get started.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {chapters.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <SafeIcon icon={FiList} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No chapters yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start building your book by adding the first chapter
                </p>
                <button
                  onClick={addChapter}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  <SafeIcon icon={FiPlus} className="h-5 w-5 mr-2" />
                  Add First Chapter
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TOCEditor;
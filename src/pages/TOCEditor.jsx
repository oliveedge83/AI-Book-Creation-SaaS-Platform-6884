import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiPlus, FiEdit3, FiTrash2, FiSave, FiArrowRight, FiMove, FiList } = FiIcons;

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

      // If no chapters exist, generate initial TOC
      if (!currentBook.chapters || currentBook.chapters.length === 0) {
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
          title: 'Introduction',
          order_index: 0,
          topics: [
            { title: 'Overview', objectives: 'Introduce the main concepts' },
            { title: 'What You\'ll Learn', objectives: 'Set expectations for readers' }
          ]
        },
        {
          title: 'Getting Started',
          order_index: 1,
          topics: [
            { title: 'Prerequisites', objectives: 'Required knowledge and tools' },
            { title: 'Setup and Configuration', objectives: 'Initial setup instructions' }
          ]
        },
        {
          title: 'Core Concepts',
          order_index: 2,
          topics: [
            { title: 'Fundamental Principles', objectives: 'Core theory and concepts' },
            { title: 'Key Terminology', objectives: 'Important terms and definitions' }
          ]
        },
        {
          title: 'Practical Applications',
          order_index: 3,
          topics: [
            { title: 'Real-world Examples', objectives: 'Practical use cases' },
            { title: 'Best Practices', objectives: 'Recommended approaches' }
          ]
        },
        {
          title: 'Advanced Topics',
          order_index: 4,
          topics: [
            { title: 'Complex Scenarios', objectives: 'Advanced implementations' },
            { title: 'Troubleshooting', objectives: 'Common issues and solutions' }
          ]
        },
        {
          title: 'Conclusion',
          order_index: 5,
          topics: [
            { title: 'Summary', objectives: 'Recap key points' },
            { title: 'Next Steps', objectives: 'Guidance for continued learning' }
          ]
        }
      ];

      const createdChapters = [];
      
      for (const chapter of initialChapters) {
        const { data: newChapter, error } = await dbHelpers.createChapter({
          book_id: bookData.id,
          title: chapter.title,
          order_index: chapter.order_index
        });
        
        if (error) throw error;

        const chapterTopics = [];
        for (const [topicIndex, topic] of chapter.topics.entries()) {
          const { data: newTopic, error: topicError } = await dbHelpers.createTopic({
            chapter_id: newChapter.id,
            title: topic.title,
            objectives: topic.objectives,
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
      toast.success('Initial table of contents generated!');
      
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
                Edit your table of contents and chapter structure
              </p>
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
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <SafeIcon icon={FiArrowRight} className="h-4 w-4 mr-2" />
                )}
                Generate Content
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
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                      className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 flex-1"
                      placeholder="Chapter title"
                    />
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
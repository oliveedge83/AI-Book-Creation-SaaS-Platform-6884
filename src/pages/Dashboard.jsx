import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiPlus, FiBook, FiEdit3, FiTrash2, FiEye, FiDownload, FiClock, FiCheck, FiZap } = FiIcons;

const Dashboard = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    completedBooks: 0,
    drafts: 0,
    generating: 0
  });

  useEffect(() => {
    if (user) {
      loadBooks();
    }
  }, [user]);

  const loadBooks = async () => {
    try {
      const { data, error } = await dbHelpers.getBooks(user.id);
      if (error) throw error;

      setBooks(data || []);
      calculateStats(data || []);
    } catch (error) {
      toast.error('Failed to load books');
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (booksData) => {
    const stats = {
      totalBooks: booksData.length,
      completedBooks: booksData.filter(book => book.status === 'completed').length,
      drafts: booksData.filter(book => book.status === 'draft').length,
      generating: booksData.filter(book => book.status === 'generating').length
    };
    setStats(stats);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', class: 'status-draft' },
      generating: { label: 'Generating', class: 'status-generating' },
      completed: { label: 'Completed', class: 'status-completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`status-badge ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getProgressPercentage = (book) => {
    if (!book.chapters || book.chapters.length === 0) return 0;
    
    const totalTopics = book.chapters.reduce((sum, chapter) => 
      sum + (chapter.topics?.length || 0), 0
    );
    
    if (totalTopics === 0) return 0;
    
    const completedTopics = book.chapters.reduce((sum, chapter) => 
      sum + (chapter.topics?.filter(topic => topic.content && topic.content.trim()).length || 0), 0
    );
    
    return Math.round((completedTopics / totalTopics) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your ebook projects and track your progress
            </p>
          </div>
          <Link
            to="/book/new"
            className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            <SafeIcon icon={FiPlus} className="h-5 w-5 mr-2" />
            Create New Book
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Books', value: stats.totalBooks, icon: FiBook, color: 'text-blue-600' },
            { label: 'Completed', value: stats.completedBooks, icon: FiCheck, color: 'text-green-600' },
            { label: 'In Progress', value: stats.generating, icon: FiZap, color: 'text-yellow-600' },
            { label: 'Drafts', value: stats.drafts, icon: FiClock, color: 'text-gray-600' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <SafeIcon icon={stat.icon} className={`h-8 w-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200"
          >
            <SafeIcon icon={FiBook} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No books yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI-powered ebook to get started
            </p>
            <Link
              to="/book/new"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              <SafeIcon icon={FiPlus} className="h-5 w-5 mr-2" />
              Create Your First Book
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book, index) => {
              const progress = getProgressPercentage(book);
              
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="book-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover-lift"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {book.title}
                      </h3>
                      {getStatusBadge(book.status)}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full progress-bar"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p><strong>Target Audience:</strong> {book.target_audience}</p>
                    <p><strong>Chapters:</strong> {book.chapters?.length || 0}</p>
                    <p><strong>Created:</strong> {new Date(book.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      to={`/book/${book.id}`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      <SafeIcon icon={FiEdit3} className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <SafeIcon icon={FiEye} className="h-4 w-4" />
                    </button>
                    <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <SafeIcon icon={FiDownload} className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
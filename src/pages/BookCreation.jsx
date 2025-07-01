import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiBook, FiUsers, FiTarget, FiFileText, FiUpload, FiLink, FiArrowRight } = FiIcons;

const BookCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [sourceUrls, setSourceUrls] = useState(['']);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const watchedFields = watch();

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
    setLoading(true);
    
    try {
      // Create the book
      const bookData = {
        user_id: user.id,
        title: data.title,
        target_audience: data.targetAudience,
        learning_objectives: data.learningObjectives,
        writing_style: data.writingStyle,
        tone: data.tone,
        estimated_pages: parseInt(data.estimatedPages),
        status: 'draft',
        created_at: new Date().toISOString()
      };

      const { data: book, error } = await dbHelpers.createBook(bookData);
      if (error) throw error;

      // Handle source files and URLs
      const validUrls = sourceUrls.filter(url => url.trim());

      // Create source file records
      for (const file of sourceFiles) {
        await dbHelpers.createSourceFile({
          book_id: book.id,
          type: 'pdf',
          name: file.name,
          url: null, // Will be uploaded to storage later
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

      toast.success('Book created successfully!');
      navigate(`/book/${book.id}/toc`);
      
    } catch (error) {
      toast.error('Failed to create book');
      console.error('Error creating book:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Book</h1>
            <p className="text-gray-600 mt-2">
              Set up your book project and let AI help you create amazing content
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                      <option value="200">200-250 pages</option>
                      <option value="250">250-300 pages</option>
                      <option value="300">300+ pages</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Objectives
                  </label>
                  <textarea
                    {...register('learningObjectives')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="What should readers learn from this book? (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Writing Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiFileText} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Writing Style</h2>
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
                <h2 className="text-xl font-semibold text-gray-900">Source Materials (Optional)</h2>
              </div>

              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDFs
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                    <SafeIcon icon={FiUpload} className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">
                      Drop PDF files here or click to browse
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
                            <span className="text-sm text-gray-700">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800"
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
                            className="px-3 py-2 text-red-600 hover:text-red-800"
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <SafeIcon icon={FiArrowRight} className="h-5 w-5 mr-2" />
                )}
                Create Book & Generate TOC
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default BookCreation;
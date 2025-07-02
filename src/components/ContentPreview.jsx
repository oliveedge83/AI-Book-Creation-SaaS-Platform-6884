import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiEye, FiX, FiDownload, FiEdit, FiMaximize2, FiMinimize2 } = FiIcons;

const ContentPreview = ({ 
  isOpen, 
  onClose, 
  content, 
  title, 
  onEdit,
  onExport,
  allowEdit = true 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    if (content) {
      // Process content for preview
      setPreviewContent(content);
    }
  }, [content]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isFullscreen ? 'p-0' : 'p-4'
        }`}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white shadow-2xl flex flex-col ${
            isFullscreen 
              ? 'w-full h-full' 
              : 'rounded-xl max-w-4xl w-full max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiEye} className="h-5 w-5 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">Content Preview</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {allowEdit && onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Edit Content"
                >
                  <SafeIcon icon={FiEdit} className="h-5 w-5" />
                </button>
              )}
              
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Export Content"
                >
                  <SafeIcon icon={FiDownload} className="h-5 w-5" />
                </button>
              )}
              
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <SafeIcon icon={isFullscreen ? FiMinimize2 : FiMaximize2} className="h-5 w-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Close Preview"
              >
                <SafeIcon icon={FiX} className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="max-w-none p-6">
                {/* Preview Styles */}
                <style jsx>{`
                  .preview-content {
                    font-family: 'Georgia', serif;
                    line-height: 1.8;
                    color: #333;
                  }
                  
                  .preview-content h1 {
                    font-size: 2.5em;
                    font-weight: bold;
                    color: #2c3e50;
                    margin: 30px 0 20px 0;
                    border-bottom: 3px solid #3498db;
                    padding-bottom: 10px;
                  }
                  
                  .preview-content h2 {
                    font-size: 2em;
                    font-weight: bold;
                    color: #34495e;
                    margin: 25px 0 15px 0;
                    border-bottom: 2px solid #ecf0f1;
                    padding-bottom: 8px;
                  }
                  
                  .preview-content h3 {
                    font-size: 1.5em;
                    font-weight: bold;
                    color: #34495e;
                    margin: 20px 0 10px 0;
                  }
                  
                  .preview-content h4 {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #34495e;
                    margin: 15px 0 8px 0;
                  }
                  
                  .preview-content p {
                    margin: 15px 0;
                    text-align: justify;
                  }
                  
                  .preview-content ul, .preview-content ol {
                    margin: 15px 0;
                    padding-left: 30px;
                  }
                  
                  .preview-content li {
                    margin: 8px 0;
                  }
                  
                  .preview-content blockquote {
                    border-left: 4px solid #3498db;
                    margin: 20px 0;
                    padding: 15px 20px;
                    background: #f8f9fa;
                    font-style: italic;
                    border-radius: 0 8px 8px 0;
                  }
                  
                  .preview-content code {
                    background: #f1f2f6;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 0.9em;
                  }
                  
                  .preview-content pre {
                    background: #f1f2f6;
                    padding: 20px;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin: 20px 0;
                    border: 1px solid #e1e5e9;
                  }
                  
                  .preview-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    margin: 20px auto;
                    display: block;
                  }
                  
                  .preview-content .topic-image {
                    text-align: center;
                    margin: 30px 0;
                  }
                  
                  .preview-content .topic-image p {
                    font-size: 14px;
                    color: #7f8c8d;
                    margin-top: 10px;
                    font-style: italic;
                  }
                  
                  .preview-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                  }
                  
                  .preview-content th, .preview-content td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                  }
                  
                  .preview-content th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                  }
                  
                  /* Print styles */
                  @media print {
                    .preview-content {
                      font-size: 12pt;
                      line-height: 1.6;
                    }
                    
                    .preview-content h1 {
                      page-break-before: always;
                    }
                    
                    .preview-content h2, .preview-content h3 {
                      page-break-after: avoid;
                    }
                    
                    .preview-content img {
                      max-width: 100%;
                      page-break-inside: avoid;
                    }
                  }
                `}</style>
                
                <div 
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
                
                {!previewContent && (
                  <div className="text-center py-12 text-gray-500">
                    <SafeIcon icon={FiEye} className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No content to preview</p>
                    <p className="text-sm">Generate some content first to see the preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with stats */}
          {previewContent && (
            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-6">
                  <span>
                    Words: {previewContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}
                  </span>
                  <span>
                    Characters: {previewContent.replace(/<[^>]*>/g, '').length}
                  </span>
                  <span>
                    Images: {(previewContent.match(/<img/g) || []).length}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContentPreview;
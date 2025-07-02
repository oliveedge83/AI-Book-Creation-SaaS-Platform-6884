import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { aiService } from '../lib/aiService';
import toast from 'react-hot-toast';

const { FiCheck, FiChevronDown, FiInfo } = FiIcons;

const ModelSelector = ({ selectedProvider, selectedModel, onModelChange, apiKeys }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (selectedProvider && apiKeys[selectedProvider]) {
      loadModels();
    }
  }, [selectedProvider, apiKeys]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const availableModels = await aiService.getAvailableModels(selectedProvider);
      setModels(availableModels);
      
      // Auto-select first model if none selected
      if (availableModels.length > 0 && !selectedModel) {
        onModelChange(availableModels[0]);
      }
    } catch (error) {
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProvider || !apiKeys[selectedProvider]) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Please configure your API keys in Settings to select models.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse flex items-center">
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          <div className="ml-2 h-4 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        AI Model Selection
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <div className="flex items-center justify-between">
            <div>
              {selectedModel ? (
                <div>
                  <div className="font-medium text-gray-900">{selectedModel.name}</div>
                  <div className="text-sm text-gray-500">{selectedModel.description}</div>
                </div>
              ) : (
                <div className="text-gray-500">Select a model</div>
              )}
            </div>
            <SafeIcon 
              icon={FiChevronDown} 
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onModelChange(model);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-500">{model.description}</div>
                  </div>
                  {selectedModel?.id === model.id && (
                    <SafeIcon icon={FiCheck} className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {selectedModel && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <SafeIcon icon={FiInfo} className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>{selectedModel.name}</strong> will be used for generating your book content.
              This model is optimized for {selectedModel.description?.toLowerCase()}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
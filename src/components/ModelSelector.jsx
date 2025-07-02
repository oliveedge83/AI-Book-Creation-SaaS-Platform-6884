import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiZap, FiInfo, FiDollarSign, FiClock, FiCpu } = FiIcons;

const ModelSelector = ({ selectedProvider, selectedModel, onModelChange, apiKeys }) => {
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelDetails, setModelDetails] = useState({});

  const modelInfo = {
    'gpt-4-turbo-preview': {
      description: 'Most capable GPT-4 model, great for complex reasoning',
      speed: 'Medium',
      cost: 'High',
      bestFor: 'Complex content, technical writing, detailed analysis'
    },
    'gpt-4': {
      description: 'Highly capable model for complex tasks',
      speed: 'Slow',
      cost: 'High', 
      bestFor: 'High-quality content, creative writing'
    },
    'gpt-3.5-turbo': {
      description: 'Fast and cost-effective for most tasks',
      speed: 'Fast',
      cost: 'Low',
      bestFor: 'General content, quick generation'
    },
    'claude-3-opus': {
      description: 'Anthropic\'s most capable model',
      speed: 'Medium',
      cost: 'High',
      bestFor: 'Long-form content, nuanced writing'
    },
    'claude-3-sonnet': {
      description: 'Balanced performance and cost',
      speed: 'Medium',
      cost: 'Medium',
      bestFor: 'Professional content, balanced quality'
    },
    'claude-3-haiku': {
      description: 'Fast and efficient for simpler tasks',
      speed: 'Fast',
      cost: 'Low',
      bestFor: 'Quick content, simple tasks'
    }
  };

  useEffect(() => {
    if (selectedProvider && apiKeys[selectedProvider]) {
      loadModels();
    }
  }, [selectedProvider, apiKeys]);

  const loadModels = async () => {
    setLoading(true);
    try {
      // Simulate API call to get models
      const mockModels = {
        openai: [
          { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', recommended: true },
          { id: 'gpt-4', name: 'GPT-4', recommended: false },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', recommended: false }
        ],
        anthropic: [
          { id: 'claude-3-opus', name: 'Claude 3 Opus', recommended: true },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', recommended: false },
          { id: 'claude-3-haiku', name: 'Claude 3 Haiku', recommended: false }
        ],
        openrouter: [
          { id: 'google/gemini-pro', name: 'Gemini Pro', recommended: true },
          { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B', recommended: false },
          { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', recommended: false }
        ]
      };

      setAvailableModels(mockModels[selectedProvider] || []);
      
      // Auto-select recommended model
      const recommendedModel = mockModels[selectedProvider]?.find(m => m.recommended);
      if (recommendedModel && !selectedModel) {
        onModelChange(recommendedModel);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCostIndicator = (cost) => {
    const colors = {
      'Low': 'text-green-600',
      'Medium': 'text-yellow-600', 
      'High': 'text-red-600'
    };
    return colors[cost] || 'text-gray-600';
  };

  const getSpeedIndicator = (speed) => {
    const colors = {
      'Fast': 'text-green-600',
      'Medium': 'text-yellow-600',
      'Slow': 'text-red-600'
    };
    return colors[speed] || 'text-gray-600';
  };

  if (!selectedProvider) {
    return null;
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select AI Model
      </label>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading models...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {availableModels.map((model) => {
            const info = modelInfo[model.id] || {};
            const isSelected = selectedModel?.id === model.id;
            
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => onModelChange(model)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className={`font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                        {model.name}
                      </h4>
                      {model.recommended && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <SafeIcon icon={FiZap} className="h-3 w-3 mr-1" />
                          Recommended
                        </span>
                      )}
                    </div>
                    
                    {info.description && (
                      <p className={`text-sm mb-3 ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                        {info.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-xs">
                      {info.speed && (
                        <div className="flex items-center">
                          <SafeIcon icon={FiClock} className={`h-3 w-3 mr-1 ${getSpeedIndicator(info.speed)}`} />
                          <span className="text-gray-600">Speed: </span>
                          <span className={getCostIndicator(info.speed)}>{info.speed}</span>
                        </div>
                      )}
                      
                      {info.cost && (
                        <div className="flex items-center">
                          <SafeIcon icon={FiDollarSign} className={`h-3 w-3 mr-1 ${getCostIndicator(info.cost)}`} />
                          <span className="text-gray-600">Cost: </span>
                          <span className={getCostIndicator(info.cost)}>{info.cost}</span>
                        </div>
                      )}
                    </div>
                    
                    {info.bestFor && (
                      <div className="mt-2 text-xs text-gray-500">
                        <strong>Best for:</strong> {info.bestFor}
                      </div>
                    )}
                  </div>
                  
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
                
                {isSelected && selectedProvider === 'openai' && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md">
                    <div className="flex items-center text-xs text-blue-700">
                      <SafeIcon icon={FiInfo} className="h-3 w-3 mr-1" />
                      <span>RAG-enhanced generation available with uploaded research materials</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      
      {selectedModel && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <SafeIcon icon={FiCpu} className="h-4 w-4 mr-2" />
            <span>Selected: <strong>{selectedModel.name}</strong></span>
            {selectedProvider === 'openai' && (
              <span className="ml-2 text-blue-600">• RAG Ready</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
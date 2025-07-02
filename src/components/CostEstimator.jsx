import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiDollarSign, FiInfo, FiTrendingUp, FiZap, FiImage } = FiIcons;

const CostEstimator = ({ 
  bookData, 
  chapters, 
  selectedProvider, 
  selectedModel,
  ragEnabled = false,
  onEstimateUpdate 
}) => {
  const [estimate, setEstimate] = useState({
    textCost: 0,
    imageCost: 0,
    ragCost: 0,
    totalCost: 0,
    breakdown: {}
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const pricing = {
    openai: {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'dall-e-3': { image: 0.040 }
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

  useEffect(() => {
    calculateEstimate();
  }, [bookData, chapters, selectedProvider, selectedModel, ragEnabled]);

  const calculateEstimate = () => {
    if (!selectedProvider || !selectedModel || !bookData) {
      return;
    }

    const modelPricing = pricing[selectedProvider]?.[selectedModel];
    if (!modelPricing) return;

    // Calculate text generation costs
    const totalTopics = chapters.reduce((sum, chapter) => sum + (chapter.topics?.length || 0), 0);
    const estimatedWordsPerTopic = 800;
    const totalWords = totalTopics * estimatedWordsPerTopic;
    const totalTokens = Math.ceil(totalWords * 1.3); // Words to tokens approximation

    const inputTokens = totalTokens * 0.3; // Approximate input tokens (prompts, context)
    const outputTokens = totalTokens * 0.7; // Approximate output tokens (generated content)

    const textCost = (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;

    // Calculate image generation costs
    const imagesPerChapter = 1; // Default 1 image per chapter
    const totalImages = chapters.length * imagesPerChapter;
    let imageCost = 0;

    if (selectedProvider === 'openai') {
      imageCost = totalImages * pricing.openai['dall-e-3'].image;
    } else if (selectedProvider === 'stabilityai') {
      imageCost = totalImages * pricing.stabilityai['stable-diffusion'].image;
    }

    // RAG overhead (approximately 20% more for context)
    const ragMultiplier = ragEnabled ? 1.2 : 1;
    const adjustedTextCost = textCost * ragMultiplier;
    const ragCost = ragEnabled ? textCost * 0.2 : 0;

    const totalCost = adjustedTextCost + imageCost;

    const newEstimate = {
      textCost: adjustedTextCost,
      imageCost,
      ragCost,
      totalCost,
      breakdown: {
        totalTopics,
        totalWords,
        totalTokens,
        totalImages,
        inputTokens,
        outputTokens,
        ragEnabled
      }
    };

    setEstimate(newEstimate);
    onEstimateUpdate?.(newEstimate);
  };

  const getCostColor = (cost) => {
    if (cost < 1) return 'text-green-600';
    if (cost < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!selectedProvider || !selectedModel) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiDollarSign} className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">Estimated Generation Cost</h4>
            <p className="text-sm text-gray-600">
              {selectedProvider} • {selectedModel} {ragEnabled && '• RAG Enhanced'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${getCostColor(estimate.totalCost)}`}>
            ${estimate.totalCost.toFixed(4)}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <SafeIcon icon={FiInfo} className="h-3 w-3 mr-1" />
            {isExpanded ? 'Hide' : 'Show'} breakdown
          </button>
        </div>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-4 pt-4 border-t border-blue-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Breakdown */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Cost Breakdown</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <SafeIcon icon={FiZap} className="h-4 w-4 text-blue-500 mr-1" />
                    Text Generation
                  </div>
                  <span className={getCostColor(estimate.textCost)}>
                    ${estimate.textCost.toFixed(4)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <SafeIcon icon={FiImage} className="h-4 w-4 text-purple-500 mr-1" />
                    Image Generation
                  </div>
                  <span className={getCostColor(estimate.imageCost)}>
                    ${estimate.imageCost.toFixed(4)}
                  </span>
                </div>
                
                {ragEnabled && (
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <SafeIcon icon={FiTrendingUp} className="h-4 w-4 text-green-500 mr-1" />
                      RAG Overhead
                    </div>
                    <span className={getCostColor(estimate.ragCost)}>
                      ${estimate.ragCost.toFixed(4)}
                    </span>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between font-medium">
                    <span>Total Estimated Cost</span>
                    <span className={getCostColor(estimate.totalCost)}>
                      ${estimate.totalCost.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generation Details */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Generation Details</h5>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Topics:</span>
                  <span>{estimate.breakdown.totalTopics}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Words:</span>
                  <span>{estimate.breakdown.totalWords?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tokens:</span>
                  <span>{estimate.breakdown.totalTokens?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Images to Generate:</span>
                  <span>{estimate.breakdown.totalImages}</span>
                </div>
                {ragEnabled && (
                  <div className="flex justify-between">
                    <span>RAG Enhancement:</span>
                    <span className="text-green-600">Enabled</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <SafeIcon icon={FiInfo} className="h-4 w-4 mr-1" />
                Cost per 1,000 words: ${((estimate.totalCost / estimate.breakdown.totalWords) * 1000).toFixed(4)}
              </div>
              <div className="text-gray-500">
                Estimated completion time: {Math.ceil(estimate.breakdown.totalTopics * 2)} minutes
              </div>
            </div>
          </div>

          {/* Warning for high costs */}
          {estimate.totalCost > 10 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <SafeIcon icon={FiInfo} className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium">High Cost Alert</p>
                  <p className="text-yellow-700">
                    This generation will cost more than $10. Consider reducing the number of topics or using a less expensive model.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CostEstimator;
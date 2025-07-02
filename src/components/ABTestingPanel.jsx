import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiTestTube, FiTrendingUp, FiEye, FiThumbsUp, FiThumbsDown, FiRefreshCw, FiBarChart } = FiIcons;

const ABTestingPanel = ({ 
  topicData, 
  bookContext, 
  onGenerateVariations,
  onSelectVariation,
  isGenerating = false 
}) => {
  const [variations, setVariations] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleGenerateVariations = async () => {
    try {
      const generatedVariations = await onGenerateVariations(topicData, bookContext, 3);
      setVariations(generatedVariations);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to generate variations:', error);
    }
  };

  const handleSelectVariation = (variation) => {
    setSelectedVariation(variation);
    onSelectVariation(variation);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiTestTube} className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">A/B Content Testing</h3>
            <p className="text-sm text-gray-600">
              Generate and compare different content variations to find the best approach
            </p>
          </div>
        </div>
        
        <button
          onClick={handleGenerateVariations}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <SafeIcon icon={FiRefreshCw} className="h-4 w-4 mr-2" />
          )}
          Generate Variations
        </button>
      </div>

      {!showComparison && variations.length === 0 && (
        <div className="text-center py-8">
          <SafeIcon icon={FiTestTube} className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Ready for A/B Testing</h4>
          <p className="text-gray-600 mb-4">
            Generate multiple content variations to compare different approaches and select the best one
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <h5 className="font-medium text-blue-900 mb-2">What we'll test:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Different writing styles (detailed vs concise)</li>
              <li>• Varied content structure and organization</li>
              <li>• Multiple explanation approaches</li>
              <li>• Different example types and complexity</li>
            </ul>
          </div>
        </div>
      )}

      {variations.length > 0 && (
        <div className="space-y-6">
          {/* Comparison Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Variation Comparison</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <SafeIcon icon={FiBarChart} className="h-4 w-4 mr-1" />
                  Quality Score
                </div>
                <div className="flex items-center">
                  <SafeIcon icon={FiEye} className="h-4 w-4 mr-1" />
                  Readability
                </div>
                <div className="flex items-center">
                  <SafeIcon icon={FiTrendingUp} className="h-4 w-4 mr-1" />
                  Structure
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variations.map((variation, index) => (
                <motion.div
                  key={variation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedVariation?.id === variation.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => handleSelectVariation(variation)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">
                      Variation {String.fromCharCode(65 + index)}
                    </h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadge(variation.metrics.overallScore)}`}>
                      {variation.metrics.overallScore}/100
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Style:</span>
                      <span className="font-medium capitalize">{variation.style}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Words:</span>
                      <span className="font-medium">{variation.metrics.wordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Readability:</span>
                      <span className={`font-medium ${getScoreColor(variation.metrics.readabilityScore)}`}>
                        {variation.metrics.readabilityScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Structure:</span>
                      <span className={`font-medium ${getScoreColor(variation.metrics.structureScore)}`}>
                        {variation.metrics.structureScore}/100
                      </span>
                    </div>
                  </div>
                  
                  {selectedVariation?.id === variation.id && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex items-center text-sm text-purple-700">
                        <SafeIcon icon={FiThumbsUp} className="h-4 w-4 mr-1" />
                        Selected for generation
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Content Preview */}
          {selectedVariation && (
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Preview: Variation {String.fromCharCode(65 + variations.findIndex(v => v.id === selectedVariation.id))}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadge(selectedVariation.metrics.overallScore)}`}>
                      Score: {selectedVariation.metrics.overallScore}/100
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 max-h-60 overflow-y-auto">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedVariation.content.slice(0, 500) + '...' }}
                />
              </div>
              
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>Style: {selectedVariation.style}</span>
                    <span>Temperature: {selectedVariation.temperature}</span>
                  </div>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Use This Variation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Suggestions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Optimization Suggestions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2">Content Quality</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Consider adding more specific examples</li>
                  <li>• Include practical applications</li>
                  <li>• Add visual elements or diagrams</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2">Structure</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use more descriptive subheadings</li>
                  <li>• Break up long paragraphs</li>
                  <li>• Add bullet points for key concepts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Best Overall', 'Most Readable', 'Best Structure'].map((category, index) => {
              const bestVariation = variations.reduce((best, current) => {
                const metric = index === 0 ? 'overallScore' : index === 1 ? 'readabilityScore' : 'structureScore';
                return current.metrics[metric] > best.metrics[metric] ? current : best;
              });
              
              return (
                <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{category}</h5>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Variation {String.fromCharCode(65 + variations.findIndex(v => v.id === bestVariation.id))}
                    </span>
                    <span className={`font-medium ${getScoreColor(bestVariation.metrics[index === 0 ? 'overallScore' : index === 1 ? 'readabilityScore' : 'structureScore'])}`}>
                      {bestVariation.metrics[index === 0 ? 'overallScore' : index === 1 ? 'readabilityScore' : 'structureScore']}/100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTestingPanel;
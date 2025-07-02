import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiClock, FiCheck, FiAlertCircle, FiX, FiZap, FiDatabase } = FiIcons;

const ProgressTracker = ({ 
  operationId, 
  isVisible, 
  onClose, 
  title = "Processing...",
  showCostEstimate = false,
  estimatedCost = 0
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('running'); // running, completed, error
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isVisible && !startTime) {
      setStartTime(Date.now());
    }
  }, [isVisible, startTime]);

  useEffect(() => {
    let interval;
    if (isVisible && startTime && status === 'running') {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVisible, startTime, status]);

  // Mock progress updates (in real app, this would come from the AI service)
  useEffect(() => {
    if (!isVisible) return;

    const mockSteps = [
      { id: 1, message: 'Initializing AI model...', duration: 2000 },
      { id: 2, message: 'Processing research materials...', duration: 3000 },
      { id: 3, message: 'Setting up RAG knowledge base...', duration: 4000 },
      { id: 4, message: 'Generating content structure...', duration: 5000 },
      { id: 5, message: 'Creating topic content...', duration: 8000 },
      { id: 6, message: 'Generating images...', duration: 6000 },
      { id: 7, message: 'Formatting and finalizing...', duration: 2000 }
    ];

    let currentStepIndex = 0;
    let totalDuration = mockSteps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const updateProgress = () => {
      if (currentStepIndex < mockSteps.length) {
        const currentMockStep = mockSteps[currentStepIndex];
        setCurrentStep(currentMockStep.message);
        setSteps(prev => [...prev, { 
          ...currentMockStep, 
          timestamp: new Date().toLocaleTimeString(),
          completed: false 
        }]);

        setTimeout(() => {
          elapsed += currentMockStep.duration;
          setProgress((elapsed / totalDuration) * 100);
          
          setSteps(prev => prev.map(step => 
            step.id === currentMockStep.id 
              ? { ...step, completed: true }
              : step
          ));

          currentStepIndex++;
          if (currentStepIndex < mockSteps.length) {
            setTimeout(updateProgress, 500);
          } else {
            setStatus('completed');
            setCurrentStep('Generation completed successfully!');
          }
        }, currentMockStep.duration);
      }
    };

    updateProgress();
  }, [isVisible]);

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <SafeIcon icon={FiCheck} className="h-6 w-6 text-green-500" />;
      case 'error':
        return <SafeIcon icon={FiAlertCircle} className="h-6 w-6 text-red-500" />;
      default:
        return <SafeIcon icon={FiZap} className="h-6 w-6 text-blue-500" />;
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <SafeIcon icon={FiClock} className="h-4 w-4 mr-1" />
                    {formatTime(elapsedTime)}
                  </div>
                  {showCostEstimate && estimatedCost > 0 && (
                    <div className="text-green-600">
                      ~${estimatedCost.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {status === 'completed' && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <SafeIcon icon={FiX} className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {status === 'completed' ? 'Completed' : `${Math.round(progress)}%`}
              </span>
              {status === 'running' && (
                <div className="flex items-center text-xs text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500 mr-1"></div>
                  Processing...
                </div>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className={`h-3 rounded-full ${
                  status === 'completed' 
                    ? 'bg-green-500' 
                    : status === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Current Step */}
          <div className="px-6 py-2">
            <div className="flex items-center space-x-2">
              {status === 'running' && (
                <SafeIcon icon={FiDatabase} className="h-4 w-4 text-blue-500 animate-pulse" />
              )}
              <span className="text-sm text-gray-700">{currentStep}</span>
            </div>
          </div>

          {/* Steps List */}
          <div className="px-6 pb-6 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center space-x-3 p-2 rounded-lg ${
                    step.completed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  {step.completed ? (
                    <SafeIcon icon={FiCheck} className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${step.completed ? 'text-green-700' : 'text-gray-700'}`}>
                      {step.message}
                    </p>
                    <p className="text-xs text-gray-500">{step.timestamp}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          {status === 'completed' && (
            <div className="px-6 py-4 bg-green-50 border-t border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-green-700">
                  <SafeIcon icon={FiCheck} className="h-4 w-4 mr-2" />
                  Operation completed successfully!
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-red-700">
                  <SafeIcon icon={FiAlertCircle} className="h-4 w-4 mr-2" />
                  Operation failed. Please try again.
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressTracker;
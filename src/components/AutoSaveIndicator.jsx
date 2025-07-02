import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSave, FiCheck, FiWifi, FiWifiOff, FiAlertCircle } = FiIcons;

const AutoSaveIndicator = ({ 
  isAutoSaving = false, 
  lastSaved = null, 
  hasUnsavedChanges = false,
  isOnline = true,
  error = null 
}) => {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isAutoSaving || hasUnsavedChanges || !isOnline || error) {
      setShowIndicator(true);
    } else {
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isAutoSaving, hasUnsavedChanges, isOnline, error]);

  const getIndicatorContent = () => {
    if (error) {
      return {
        icon: FiAlertCircle,
        text: 'Save failed',
        className: 'bg-red-100 text-red-700 border-red-200',
        iconClassName: 'text-red-500'
      };
    }

    if (!isOnline) {
      return {
        icon: FiWifiOff,
        text: 'Offline - changes saved locally',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        iconClassName: 'text-yellow-500'
      };
    }

    if (isAutoSaving) {
      return {
        icon: FiSave,
        text: 'Saving...',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        iconClassName: 'text-blue-500 animate-pulse'
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: FiSave,
        text: 'Unsaved changes',
        className: 'bg-orange-100 text-orange-700 border-orange-200',
        iconClassName: 'text-orange-500'
      };
    }

    if (lastSaved) {
      return {
        icon: FiCheck,
        text: `Saved ${getTimeAgo(lastSaved)}`,
        className: 'bg-green-100 text-green-700 border-green-200',
        iconClassName: 'text-green-500'
      };
    }

    return null;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const saved = new Date(timestamp);
    const diff = now - saved;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return saved.toLocaleDateString();
  };

  const indicatorContent = getIndicatorContent();

  if (!showIndicator || !indicatorContent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-40 flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium shadow-lg ${indicatorContent.className}`}
      >
        <SafeIcon 
          icon={indicatorContent.icon} 
          className={`h-4 w-4 ${indicatorContent.iconClassName}`} 
        />
        <span>{indicatorContent.text}</span>
        
        {error && (
          <button
            onClick={() => setShowIndicator(false)}
            className="ml-2 p-1 hover:bg-red-200 rounded"
          >
            <SafeIcon icon={FiX} className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoSaveIndicator;
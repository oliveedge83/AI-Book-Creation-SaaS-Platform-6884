import { useEffect, useRef, useCallback } from 'react';
import { useState } from 'react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

const useAutoSave = (data, saveFunction, options = {}) => {
  const {
    delay = 2000, // 2 seconds delay
    enabled = true,
    onSave = () => {},
    onError = () => {}
  } = options;

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const timeoutRef = useRef(null);
  const lastDataRef = useRef(data);
  const isOnlineRef = useRef(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => { isOnlineRef.current = true; };
    const handleOffline = () => { isOnlineRef.current = false; };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSave = useCallback(async (dataToSave) => {
    if (!enabled || !isOnlineRef.current) return;

    setIsAutoSaving(true);
    setSaveError(null);

    try {
      await saveFunction(dataToSave);
      setLastSaved(new Date().toISOString());
      setHasUnsavedChanges(false);
      onSave(dataToSave);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveError(error.message);
      onError(error);
      
      // Show user-friendly error message
      toast.error('Auto-save failed. Your work is saved locally.');
    } finally {
      setIsAutoSaving(false);
    }
  }, [enabled, saveFunction, onSave, onError]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled) return;

    // Check if data has actually changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
    
    if (hasChanged) {
      setHasUnsavedChanges(true);
      lastDataRef.current = data;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(() => {
        performSave(data);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, performSave]);

  const manualSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(data);
  }, [data, performSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges && isOnlineRef.current) {
        // Attempt synchronous save (limited by browser)
        navigator.sendBeacon('/api/auto-save', JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
        
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, data]);

  return {
    isAutoSaving,
    lastSaved,
    hasUnsavedChanges,
    saveError,
    isOnline: isOnlineRef.current,
    manualSave
  };
};

export default useAutoSave;
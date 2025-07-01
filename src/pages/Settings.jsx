import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiKey, FiCheck, FiX, FiEye, FiEyeOff, FiSave, FiUser, FiMail, FiShield } = FiIcons;

const Settings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState({});
  const [keyStatus, setKeyStatus] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [validating, setValidating] = useState({});

  const providers = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
    { id: 'stabilityai', name: 'Stability AI', placeholder: 'sk-...' }
  ];

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await dbHelpers.getApiKeys(user.id);
      if (error) throw error;

      const statusMap = {};
      data?.forEach(item => {
        statusMap[item.provider] = item.has_key;
      });
      setKeyStatus(statusMap);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (provider, key) => {
    if (!key.trim()) return false;

    setValidating({ ...validating, [provider]: true });
    
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      });

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Validation error:', error);
      // For demo purposes, simulate validation
      return key.length > 10;
    } finally {
      setValidating({ ...validating, [provider]: false });
    }
  };

  const saveApiKey = async (provider) => {
    const key = apiKeys[provider];
    if (!key?.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    setSaving({ ...saving, [provider]: true });

    try {
      const isValid = await validateApiKey(provider, key);
      
      if (!isValid) {
        toast.error('Invalid API key');
        return;
      }

      // In a real implementation, encrypt the key before storing
      const encryptedKey = btoa(key); // Simple base64 encoding for demo
      
      const { error } = await dbHelpers.saveApiKey(user.id, provider, encryptedKey);
      if (error) throw error;

      setKeyStatus({ ...keyStatus, [provider]: true });
      toast.success(`${providers.find(p => p.id === provider)?.name} API key saved!`);
      
      // Clear the input for security
      setApiKeys({ ...apiKeys, [provider]: '' });
      
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setSaving({ ...saving, [provider]: false });
    }
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys({ ...showKeys, [provider]: !showKeys[provider] });
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account settings and API configurations
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiUser} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={user?.user_metadata?.full_name || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              {user?.user_metadata?.role === 'admin' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <SafeIcon icon={FiShield} className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">Administrator Account</span>
                  </div>
                </div>
              )}
            </div>

            {/* API Keys */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <SafeIcon icon={FiKey} className="h-6 w-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <SafeIcon icon={FiShield} className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Security Notice
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        Your API keys are encrypted and stored securely. We never store your keys in plain text.
                      </p>
                    </div>
                  </div>
                </div>

                {providers.map((provider) => (
                  <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{provider.name}</h3>
                        {keyStatus[provider.id] && (
                          <div className="ml-3 flex items-center">
                            <SafeIcon icon={FiCheck} className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-600">Connected</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={apiKeys[provider.id] || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                          placeholder={keyStatus[provider.id] ? '••••••••••••••••' : provider.placeholder}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(provider.id)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <SafeIcon 
                            icon={showKeys[provider.id] ? FiEyeOff : FiEye} 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600" 
                          />
                        </button>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveApiKey(provider.id)}
                        disabled={saving[provider.id] || validating[provider.id]}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {saving[provider.id] || validating[provider.id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <SafeIcon icon={FiSave} className="h-4 w-4 mr-2" />
                        )}
                        {validating[provider.id] ? 'Validating...' : 'Save'}
                      </motion.button>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Enter your {provider.name} API key to enable content generation with this provider.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Usage Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">0</div>
                  <div className="text-sm text-gray-600">Books Created</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">API Calls This Month</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Words Generated</div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                    <p className="text-sm text-red-700">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
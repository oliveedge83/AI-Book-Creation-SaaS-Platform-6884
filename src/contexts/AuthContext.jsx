import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        // For demo mode in case of connection issues
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => subscription?.unsubscribe();
    } catch (error) {
      console.error('Auth state change listener error:', error);
    }
  }, []);

  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        toast.error(error.message);
        return { data: null, error };
      }

      toast.success('Account created successfully! Please check your email for verification.');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message || 'Failed to create account');
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message);
        return { data: null, error };
      }

      toast.success('Welcome back!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message || 'Failed to sign in');
      return { data: null, error };
    }
  };

  const signInWithProvider = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/#/dashboard`
        }
      });

      if (error) {
        toast.error(error.message);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      toast.error(error.message || 'OAuth sign in failed');
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        return;
      }
      
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error(error.message || 'Sign out failed');
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Password reset email sent!');
      return { error: null };
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
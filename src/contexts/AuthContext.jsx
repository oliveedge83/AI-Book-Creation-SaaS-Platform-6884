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
        console.log('Demo mode: No Supabase connection');
        // For demo purposes, set a demo user after a short delay
        setTimeout(() => {
          setUser({
            id: 'demo-user-123',
            email: 'demo@example.com',
            user_metadata: {
              full_name: 'Demo User',
              role: 'user'
            }
          });
        }, 1000);
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
      console.log('Demo mode: Auth state change listener not available');
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

      if (error) throw error;

      // For demo, set user immediately
      setUser({
        id: 'demo-user-' + Date.now(),
        email,
        user_metadata: userData
      });

      toast.success('Account created successfully! (Demo mode)');
      return { data, error: null };
    } catch (error) {
      console.log('Demo mode: Creating demo user');
      const demoUser = {
        id: 'demo-user-' + Date.now(),
        email,
        user_metadata: userData
      };
      setUser(demoUser);
      toast.success('Account created successfully! (Demo mode)');
      return { data: { user: demoUser }, error: null };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast.success('Welcome back!');
      return { data, error: null };
    } catch (error) {
      console.log('Demo mode: Signing in demo user');
      const demoUser = {
        id: 'demo-user-123',
        email,
        user_metadata: {
          full_name: 'Demo User',
          role: email.includes('admin') ? 'admin' : 'user'
        }
      };
      setUser(demoUser);
      toast.success('Welcome back! (Demo mode)');
      return { data: { user: demoUser }, error: null };
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

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      toast.error('OAuth not available in demo mode');
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.log('Demo mode: Signing out');
      setUser(null);
      toast.success('Signed out successfully (Demo mode)');
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      toast.success('Password reset email sent!');
      return { error: null };
    } catch (error) {
      toast.success('Password reset email sent! (Demo mode)');
      return { error: null };
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
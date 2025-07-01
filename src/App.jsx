import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import BookEditor from './pages/BookEditor';
import Settings from './pages/Settings';
import AdminPanel from './pages/admin/AdminPanel';
import BookCreation from './pages/BookCreation';
import TOCEditor from './pages/TOCEditor';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EbookAI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-secondary-50">
      <Router>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={user ? <Navigate to="/dashboard" /> : <Landing />} 
            />
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/dashboard" /> : <Register />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/book/new" 
              element={
                <ProtectedRoute>
                  <BookCreation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/book/:id/toc" 
              element={
                <ProtectedRoute>
                  <TOCEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/book/:id" 
              element={
                <ProtectedRoute>
                  <BookEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
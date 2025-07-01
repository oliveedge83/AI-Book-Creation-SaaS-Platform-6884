import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBook, FiUser, FiSettings, FiLogOut, FiShield, FiMenu, FiX } = FiIcons;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isAdmin = user?.user_metadata?.role === 'admin';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiBook },
    { path: '/settings', label: 'Settings', icon: FiSettings },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin Panel', icon: FiShield }] : [])
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <SafeIcon icon={FiBook} className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold gradient-text">EbookAI</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <SafeIcon icon={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <SafeIcon icon={FiUser} className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <SafeIcon icon={FiLogOut} className="h-4 w-4" />
                  <span>Sign Out</span>
                </motion.button>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-50"
              >
                <SafeIcon 
                  icon={isMenuOpen ? FiX : FiMenu} 
                  className="h-6 w-6" 
                />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {user && isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4 border-t border-gray-200"
          >
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <SafeIcon icon={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-2 px-3 py-2 text-gray-600">
                  <SafeIcon icon={FiUser} className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                >
                  <SafeIcon icon={FiLogOut} className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
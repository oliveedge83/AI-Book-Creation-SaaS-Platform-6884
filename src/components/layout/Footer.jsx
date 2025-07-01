import React from 'react';
import { Link } from 'react-router-dom';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBook, FiMail, FiGithub, FiTwitter, FiHeart } = FiIcons;

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiBook} className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold gradient-text">EbookAI</span>
            </div>
            <p className="text-gray-600 max-w-md">
              Create professional ebooks with the power of AI. Leverage multiple LLM providers 
              to generate comprehensive, well-researched content for your next book.
            </p>
            <div className="flex space-x-4 mt-6">
              <a 
                href="#" 
                className="text-gray-400 hover:text-primary-600 transition-colors"
              >
                <SafeIcon icon={FiTwitter} className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-primary-600 transition-colors"
              >
                <SafeIcon icon={FiGithub} className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-primary-600 transition-colors"
              >
                <SafeIcon icon={FiMail} className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/book/new" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Create Book
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2024 EbookAI. All rights reserved.
          </p>
          <p className="text-gray-600 text-sm flex items-center mt-4 md:mt-0">
            Made with <SafeIcon icon={FiHeart} className="h-4 w-4 text-red-500 mx-1" /> for authors everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
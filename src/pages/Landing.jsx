import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBook, FiZap, FiUsers, FiTrendingUp, FiArrowRight, FiCheck, FiStar } = FiIcons;

const Landing = () => {
  const features = [
    {
      icon: FiZap,
      title: 'AI-Powered Content',
      description: 'Generate high-quality book content using multiple LLM providers including OpenAI, Anthropic, and OpenRouter.'
    },
    {
      icon: FiBook,
      title: 'Smart Research',
      description: 'Upload PDFs and URLs for RAG-powered content generation that incorporates your research materials.'
    },
    {
      icon: FiUsers,
      title: 'Multi-User Platform',
      description: 'Collaborate with team members and manage multiple book projects in one centralized platform.'
    },
    {
      icon: FiTrendingUp,
      title: 'Professional Export',
      description: 'Export your completed books to PDF, CSV, and other professional formats ready for publishing.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Author & Educator',
      content: 'EbookAI helped me create my first technical book in weeks instead of months. The AI-generated content was surprisingly comprehensive.',
      rating: 5
    },
    {
      name: 'Mark Chen',
      role: 'Business Coach',
      content: 'The RAG functionality is incredible. I uploaded my research papers and the AI created coherent chapters that perfectly incorporated my data.',
      rating: 5
    },
    {
      name: 'Lisa Rodriguez',
      role: 'Content Creator',
      content: 'As someone who struggled with writer\'s block, this platform gave me the structure and content I needed to finally publish my book.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Create Professional
                <span className="gradient-text block">Ebooks with AI</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Leverage the power of multiple AI models to generate comprehensive, 
                well-researched ebooks. From initial concept to final publication.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  Start Creating
                  <SafeIcon icon={FiArrowRight} className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Create Amazing Ebooks
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with intuitive design 
              to make ebook creation accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                  <SafeIcon icon={feature.icon} className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Create your ebook in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Setup & Research',
                description: 'Configure your AI models, upload research materials, and define your book\'s structure.'
              },
              {
                step: '2',
                title: 'Generate Content',
                description: 'Let AI create comprehensive chapters based on your outline and research materials.'
              },
              {
                step: '3',
                title: 'Edit & Export',
                description: 'Review, edit, and export your completed ebook in professional formats.'
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-xl font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of authors who have created amazing ebooks with our platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 p-6 rounded-xl"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <SafeIcon key={i} icon={FiStar} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Create Your First AI-Powered Ebook?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Join our platform today and transform your ideas into professional ebooks.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Get Started Free
              <SafeIcon icon={FiArrowRight} className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
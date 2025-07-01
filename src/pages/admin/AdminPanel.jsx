import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiUsers, FiBook, FiActivity, FiSettings, FiBarChart3, FiShield, FiMail, FiDatabase } = FiIcons;

const AdminPanel = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBooks: 0,
    activeUsers: 0,
    apiCalls: 0
  });
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.user_metadata?.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      // Simulate loading admin data
      setStats({
        totalUsers: 156,
        totalBooks: 342,
        activeUsers: 89,
        apiCalls: 12847
      });

      setUsers([
        { id: 1, email: 'user1@example.com', name: 'John Doe', status: 'active', books: 3, joined: '2024-01-15' },
        { id: 2, email: 'user2@example.com', name: 'Jane Smith', status: 'active', books: 7, joined: '2024-01-20' },
        { id: 3, email: 'user3@example.com', name: 'Bob Johnson', status: 'inactive', books: 1, joined: '2024-02-01' }
      ]);

      setBooks([
        { id: 1, title: 'AI Programming Guide', author: 'John Doe', status: 'completed', created: '2024-01-20' },
        { id: 2, title: 'Machine Learning Basics', author: 'Jane Smith', status: 'generating', created: '2024-02-15' },
        { id: 3, title: 'Data Science Handbook', author: 'Bob Johnson', status: 'draft', created: '2024-02-20' }
      ]);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiBarChart3 },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'books', label: 'Books', icon: FiBook },
    { id: 'system', label: 'System', icon: FiSettings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center mb-8">
            <SafeIcon icon={FiShield} className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">
                Manage users, monitor system health, and configure platform settings
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <SafeIcon icon={tab.icon} className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: 'text-blue-600' },
                      { label: 'Total Books', value: stats.totalBooks, icon: FiBook, color: 'text-green-600' },
                      { label: 'Active Users', value: stats.activeUsers, icon: FiActivity, color: 'text-yellow-600' },
                      { label: 'API Calls', value: stats.apiCalls, icon: FiDatabase, color: 'text-purple-600' }
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="bg-gray-50 p-6 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          </div>
                          <SafeIcon icon={stat.icon} className={`h-8 w-8 ${stat.color}`} />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {[
                        { action: 'New user registered', user: 'john@example.com', time: '2 minutes ago' },
                        { action: 'Book completed', user: 'jane@example.com', time: '15 minutes ago' },
                        { action: 'API key added', user: 'bob@example.com', time: '1 hour ago' },
                        { action: 'Content generated', user: 'alice@example.com', time: '2 hours ago' }
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.user}</p>
                          </div>
                          <p className="text-xs text-gray-400">{activity.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                      Export Users
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Books
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.books}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.joined}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-primary-600 hover:text-primary-900 mr-3">
                                Edit
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                Suspend
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'books' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Book Management</h3>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                      Export Books
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Author
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {books.map((book) => (
                          <tr key={book.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{book.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{book.author}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                book.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : book.status === 'generating'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {book.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {book.created}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-primary-600 hover:text-primary-900 mr-3">
                                View
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Email Settings</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">SMTP Server</label>
                          <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="smtp.example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Port</label>
                          <input
                            type="number"
                            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="587"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">API Limits</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Requests per Hour</label>
                          <input
                            type="number"
                            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="1000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Max Book Size (MB)</label>
                          <input
                            type="number"
                            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;
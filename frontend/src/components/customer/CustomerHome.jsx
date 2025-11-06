// src/components/customer/CustomerHome.js
import React from 'react';
import { Link } from 'react-router-dom';

const CustomerHome = () => {
  const quickActions = [
    {
      path: '/customer/restaurants',
      icon: '🍕',
      title: 'Browse Restaurants',
      description: 'Explore various cuisines and menus',
      color: 'blue'
    },
    {
      path: '/customer/orders',
      icon: '📦',
      title: 'My Orders',
      description: 'Track your previous orders',
      color: 'green'
    },
    {
      path: '/customer/cart',
      icon: '🛒',
      title: 'Shopping Cart',
      description: 'Review your current order',
      color: 'purple'
    },
    {
      path: '/customer/profile',
      icon: '👤',
      title: 'Profile',
      description: 'Manage your account settings',
      color: 'indigo'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700'
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-center"
          >
            <div className="text-4xl mb-3">{action.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {action.title}
            </h3>
            <p className="text-sm text-gray-600">
              {action.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="text-center text-gray-500 py-8">
          <p>No recent activity to display</p>
          <p className="text-sm mt-2">Your orders and activities will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
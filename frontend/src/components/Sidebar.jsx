// src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ user, isOpen, onClose }) => {
  const { logout } = useAuth();
  const location = useLocation();

  // Role-based navigation items
  const getNavItems = () => {
    switch (user?.role) {
      case 'customer':
        return [
          { path: '/customer', label: 'Dashboard', icon: '🏠', exact: true },
          { path: '/customer/restaurants', label: 'Restaurants', icon: '🍕' },
          { path: '/customer/orders', label: 'My Orders', icon: '📦' },
          { path: '/customer/cart', label: 'Shopping Cart', icon: '🛒' },
          { path: '/customer/profile', label: 'Profile', icon: '👤' },
        ];
      case 'restaurant':
        return [
          { path: '/restaurant', label: 'Dashboard', icon: '🏠', exact: true },
          { path: '/restaurant/orders', label: 'Orders', icon: '📋' },
          { path: '/restaurant/menu', label: 'Menu Management', icon: '🍽️' },
          { path: '/restaurant/profile', label: 'Restaurant Profile', icon: '🏪' },
          { path: '/restaurant/analytics', label: 'Analytics', icon: '📊' },
        ];
      case 'delivery':
        return [
          { path: '/delivery', label: 'Dashboard', icon: '🏠', exact: true },
          { path: '/delivery/available', label: 'Available Deliveries', icon: '📦' },
          { path: '/delivery/active', label: 'My Deliveries', icon: '🚗' },
          { path: '/delivery/history', label: 'Delivery History', icon: '📊' },
          { path: '/delivery/earnings', label: 'Earnings', icon: '💰' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Check if a nav item is active
  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      {user?.role !== 'admin' && 
        <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} Portal
              </h2>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none md:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="my-8 px-4 space-y-2 h-fit overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 768 && onClose()} // Close sidebar on mobile after click
              className={`
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                ${isActive(item)
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Info and Logout at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
      }
      
    </>
  );
};

export default Sidebar;
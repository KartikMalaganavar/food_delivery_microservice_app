// import React from "react";
// // Navbar Component

// const Navbar = () => {
//   const { user, logout } = useAuth();

//   return (
//     <nav className="bg-white shadow-lg">
//       <div className="max-w-7xl mx-auto px-4">
//         <div className="flex justify-between items-center h-16">
//           <div className="flex items-center">
//             <span className="text-xl font-bold text-gray-800">FoodDelivery</span>
//           </div>
          
//           <div className="flex items-center space-x-4">
//             <span className="text-gray-700">Welcome, {user?.username}</span>
//             <button
//               onClick={logout}
//               className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;


// src/components/Navbar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ user }) => {
  const { logout } = useAuth();
  const location = useLocation();

  // Role-based navigation items
  const getNavItems = () => {
    switch (user?.role) {
      case 'customer':
        return [
          { path: '/customer/restaurants', label: 'Restaurants', icon: '🍕' },
          { path: '/customer/orders', label: 'My Orders', icon: '📦' },
          { path: '/customer/cart', label: 'Cart', icon: '🛒' },
        ];
      case 'restaurant':
        return [
          { path: '/restaurant/orders', label: 'Orders', icon: '📋' },
          { path: '/restaurant/menu', label: 'Menu', icon: '🍽️' },
          { path: '/restaurant/profile', label: 'Profile', icon: '🏪' },
        ];
      case 'delivery':
        return [
          { path: '/delivery/available', label: 'Available', icon: '📦' },
          { path: '/delivery/active', label: 'My Deliveries', icon: '🚗' },
          { path: '/delivery/history', label: 'History', icon: '📊' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-800">
              FoodDelivery
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 hidden sm:block">
              Welcome, <strong>{user?.username}</strong>
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 pt-2 pb-3">
          <div className="flex space-x-4 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;



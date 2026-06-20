// src/components/restaurant/RestaurantDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RestaurantDashboard = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:8000/restaurants';

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get restaurant details
      const myRestaurantsResponse = await axios.get(`${API_BASE}/my-restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (myRestaurantsResponse.data.length > 0) {
        const myRestaurant = myRestaurantsResponse.data[0];
        setRestaurant(myRestaurant);
        
        // Get orders for stats (you might need to adjust this based on your API)
        const ordersResponse = await axios.get(`${API_BASE}/restaurants/${myRestaurant.id}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Calculate stats (mock calculation - adjust based on your data structure)
        const orders = ordersResponse.data.orders || [];
        const today = new Date().toISOString().split('T')[0];
        
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(order => order.status === 'PLACED' || order.status === 'CONFIRMED').length,
          todayOrders: orders.filter(order => order.created_at?.includes(today)).length,
          totalRevenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Restaurant Found</h2>
        <p className="text-gray-600 mb-6">You need to create a restaurant first to access the dashboard.</p>
        <Link
          to="/restaurant/profile"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Restaurant
        </Link>
      </div>
    );
  }

  const quickActions = [
    {
      path: '/restaurant/orders',
      icon: '📋',
      title: 'Manage Orders',
      description: 'View and update order status',
      color: 'blue'
    },
    {
      path: '/restaurant/menu',
      icon: '🍽️',
      title: 'Menu Management',
      description: 'Add or update menu items',
      color: 'green'
    },
    {
      path: '/restaurant/profile',
      icon: '🏪',
      title: 'Restaurant Profile',
      description: 'Update restaurant information',
      color: 'purple'
    },
    {
      path: '/restaurant/analytics',
      icon: '📊',
      title: 'View Analytics',
      description: 'Check performance metrics',
      color: 'orange'
    }
  ];

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: '📦',
      color: 'blue'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: '⏳',
      color: 'yellow'
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      icon: '📅',
      color: 'green'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: '💰',
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {restaurant.name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening with your restaurant today.
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              restaurant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {restaurant.is_active ? 'Active' : 'Inactive'}
            </span>
            <p className="text-sm text-gray-500 mt-1">{restaurant.cuisine_type}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600 text-2xl`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="bg-gray-50 shadow-md rounded-lg p-6 hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-blue-200"
            >
              <div className="text-3xl mb-3">{action.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📊</div>
          <p>Your recent activity will appear here</p>
          <p className="text-sm">Orders, updates, and notifications</p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
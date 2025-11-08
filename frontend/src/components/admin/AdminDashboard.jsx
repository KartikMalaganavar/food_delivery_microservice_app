// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRestaurants: 0,
    totalDeliveryPartners: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeDeliveries: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all data in parallel
      const [
        ordersResponse,
        restaurantsResponse,
        deliveryPartnersResponse,
        deliveriesResponse
      ] = await Promise.all([
        axios.get(`${API_BASE}/orders/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}restaurants/restaurants`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/delivery/delivery-partners/available`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/delivery/deliveries/assigned`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const orders = ordersResponse.data || [];
      const restaurants = restaurantsResponse.data || [];
      const deliveryPartners = deliveryPartnersResponse.data || [];
      const deliveries = deliveriesResponse.data || [];

      // Calculate stats
      const totalRevenue = orders
        .filter(order => order.payment_status === 'COMPLETED')
        .reduce((sum, order) => sum + (order.total || 0), 0);

      const pendingOrders = orders.filter(order => 
        ['PLACED', 'CONFIRMED', 'PREPARING'].includes(order.status)
      ).length;

      const activeDeliveries = deliveries.filter(delivery => 
        ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(delivery.status)
      ).length;

      setStats({
        totalOrders: orders.length,
        totalRestaurants: restaurants.length,
        totalDeliveryPartners: deliveryPartners.length,
        totalRevenue,
        pendingOrders,
        activeDeliveries
      });

      // Get recent orders
      setRecentOrders(orders.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'PLACED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-yellow-100 text-yellow-800';
      case 'PREPARING': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: '📦',
      color: 'blue',
      path: '/admin/orders'
    },
    {
      title: 'Total Restaurants',
      value: stats.totalRestaurants,
      icon: '🏪',
      color: 'green',
      path: '/admin/restaurants'
    },
    {
      title: 'Delivery Partners',
      value: stats.totalDeliveryPartners,
      icon: '🚗',
      color: 'purple',
      path: '/admin/delivery-partners'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: '💰',
      color: 'yellow',
      path: '/admin/analytics'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: '⏳',
      color: 'orange',
      path: '/admin/orders'
    },
    {
      title: 'Active Deliveries',
      value: stats.activeDeliveries,
      icon: '🚚',
      color: 'red',
      path: '/admin/deliveries'
    }
  ];

  const quickActions = [
    {
      path: '/admin/restaurants',
      icon: '🏪',
      title: 'Manage Restaurants',
      description: 'View and manage all restaurants',
      color: 'green'
    },
    {
      path: '/admin/orders',
      icon: '📦',
      title: 'Order Management',
      description: 'Monitor and manage all orders',
      color: 'blue'
    },
    {
      path: '/admin/delivery-partners',
      icon: '🚗',
      title: 'Delivery Partners',
      description: 'Manage delivery partners',
      color: 'purple'
    },
    {
      path: '/admin/deliveries',
      icon: '🚚',
      title: 'Delivery Management',
      description: 'Track and assign deliveries',
      color: 'orange'
    },
    {
      path: '/admin/payments',
      icon: '💰',
      title: 'Payment Monitoring',
      description: 'View payment transactions',
      color: 'yellow'
    },
    {
      path: '/admin/analytics',
      icon: '📊',
      title: 'Analytics',
      description: 'View platform analytics',
      color: 'red'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and manage the entire food delivery platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.path}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600 text-2xl`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-blue-200"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All →
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <p>No recent orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                      <p className="text-sm text-gray-600">Customer: {order.customer_id}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>${order.total?.toFixed(2)}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl mb-2">🏪</div>
            <h3 className="font-semibold text-gray-900">Restaurants</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.totalRestaurants}</p>
            <p className="text-sm text-gray-600">Active restaurants</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl mb-2">🚗</div>
            <h3 className="font-semibold text-gray-900">Delivery Network</h3>
            <p className="text-2xl font-bold text-green-600">{stats.totalDeliveryPartners}</p>
            <p className="text-sm text-gray-600">Available partners</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-semibold text-gray-900">Revenue</h3>
            <p className="text-2xl font-bold text-purple-600">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Total earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
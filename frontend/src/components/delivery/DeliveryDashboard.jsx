// src/components/delivery/DeliveryDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const DeliveryDashboard = () => {
  const [stats, setStats] = useState({
    availableDeliveries: 0,
    activeDeliveries: 0,
    completedToday: 0,
    totalEarnings: 0
  });
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get assigned deliveries (active ones)
      const assignedResponse = await axios.get(`${API_BASE}/deliveries/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const assignedDeliveries = assignedResponse.data || [];
      setActiveDeliveries(assignedDeliveries);

      // Calculate stats (mock data - you might need additional endpoints)
      const today = new Date().toISOString().split('T')[0];
      const completedToday = assignedDeliveries.filter(delivery => 
        delivery.status === 'DELIVERED' && 
        delivery.actual_delivery_time?.includes(today)
      ).length;

      const totalEarnings = assignedDeliveries
        .filter(delivery => delivery.status === 'DELIVERED')
        .reduce((sum, delivery) => sum + (delivery.delivery_fee || 5), 0);

      setStats({
        availableDeliveries: 5, // Mock data - you might need an available deliveries endpoint
        activeDeliveries: assignedDeliveries.filter(d => 
          ['ACCEPTED', 'PICKED_UP', 'ON_THE_WAY'].includes(d.status)
        ).length,
        completedToday,
        totalEarnings
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800';
      case 'ON_THE_WAY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
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

  const quickActions = [
    {
      path: '/delivery/available',
      icon: '📦',
      title: 'Available Deliveries',
      description: 'Accept new delivery assignments',
      color: 'green'
    },
    {
      path: '/delivery/active',
      icon: '🚗',
      title: 'My Deliveries',
      description: 'Manage current deliveries',
      color: 'blue'
    },
    {
      path: '/delivery/history',
      icon: '📊',
      title: 'Delivery History',
      description: 'View past deliveries',
      color: 'purple'
    },
    {
      path: '/delivery/earnings',
      icon: '💰',
      title: 'Earnings',
      description: 'Track your income',
      color: 'yellow'
    }
  ];

  const statCards = [
    {
      title: 'Available Deliveries',
      value: stats.availableDeliveries,
      icon: '📦',
      color: 'green',
      description: 'Ready for pickup'
    },
    {
      title: 'Active Deliveries',
      value: stats.activeDeliveries,
      icon: '🚗',
      color: 'blue',
      description: 'In progress'
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: '✅',
      color: 'purple',
      description: 'Successful deliveries'
    },
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: '💰',
      color: 'yellow',
      description: 'This week'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Delivery Partner Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your deliveries and track your earnings
        </p>
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
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          </div>
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

        {/* Active Deliveries */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Deliveries</h2>
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🚗</div>
              <p>No active deliveries</p>
              <p className="text-sm">Accept deliveries from available section</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDeliveries.slice(0, 3).map(delivery => (
                <div key={delivery.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{delivery.order_number}</p>
                      <p className="text-sm text-gray-600">{delivery.restaurant_name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Fee: ${delivery.delivery_fee || 5}</span>
                    <span>Distance: {delivery.total_distance_km || 'N/A'} km</span>
                  </div>
                </div>
              ))}
              {activeDeliveries.length > 3 && (
                <Link
                  to="/delivery/active"
                  className="block text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all ({activeDeliveries.length}) deliveries →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Delivery Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Check delivery instructions</strong> - Always read customer notes before delivery
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Update status promptly</strong> - Keep customers informed about delivery progress
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Verify orders</strong> - Ensure all items are included before pickup
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Plan your route</strong> - Optimize for multiple deliveries when possible
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
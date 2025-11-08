// src/components/delivery/Earnings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Earnings = () => {
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    completedDeliveries: 0,
    averageEarningPerDelivery: 0
  });
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchEarningsData();
  }, [timeRange]);

  const fetchEarningsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/deliveries/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const completedDeliveries = (response.data || []).filter(d => 
        d.status === 'DELIVERED'
      );

      // Calculate earnings based on time range
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '3months':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        default:
          startDate = new Date(0); // All time
      }

      const filteredDeliveries = completedDeliveries.filter(delivery => 
        new Date(delivery.actual_delivery_time || delivery.created_at) >= startDate
      );

      const totalEarnings = filteredDeliveries.reduce((sum, delivery) => 
        sum + (delivery.delivery_fee || 5), 0
      );

      const averageEarning = filteredDeliveries.length > 0 
        ? totalEarnings / filteredDeliveries.length 
        : 0;

      setEarningsData({
        totalEarnings,
        weeklyEarnings: calculateWeeklyEarnings(filteredDeliveries),
        completedDeliveries: filteredDeliveries.length,
        averageEarningPerDelivery: averageEarning
      });

      setDeliveryHistory(filteredDeliveries);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyEarnings = (deliveries) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return deliveries
      .filter(delivery => new Date(delivery.actual_delivery_time || delivery.created_at) >= oneWeekAgo)
      .reduce((sum, delivery) => sum + (delivery.delivery_fee || 5), 0);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case '3months': return 'Last 3 Months';
      default: return 'All Time';
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
      title: 'Total Earnings',
      value: `$${earningsData.totalEarnings.toFixed(2)}`,
      icon: '💰',
      color: 'green',
      description: getTimeRangeLabel()
    },
    {
      title: 'Completed Deliveries',
      value: earningsData.completedDeliveries,
      icon: '📦',
      color: 'blue',
      description: 'Successful deliveries'
    },
    {
      title: 'Avg per Delivery',
      value: `$${earningsData.averageEarningPerDelivery.toFixed(2)}`,
      icon: '📊',
      color: 'purple',
      description: 'Average earnings'
    },
    {
      title: 'Weekly Earnings',
      value: `$${earningsData.weeklyEarnings.toFixed(2)}`,
      icon: '📅',
      color: 'orange',
      description: 'Last 7 days'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600">Track your delivery earnings and performance</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="3months">Last 3 Months</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Earnings Summary */}
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
        {/* Earnings Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Earnings Breakdown</h2>
          {deliveryHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">💰</div>
              <p>No earnings data available</p>
              <p className="text-sm">Complete deliveries to see your earnings</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Deliveries</span>
                <span className="font-bold text-gray-900">{earningsData.completedDeliveries}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Earnings</span>
                <span className="font-bold text-green-600">${earningsData.totalEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Average per Delivery</span>
                <span className="font-bold text-blue-600">${earningsData.averageEarningPerDelivery.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Projected Monthly</span>
                <span className="font-bold text-purple-600">
                  ${(earningsData.weeklyEarnings * 4).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Earnings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Earnings</h2>
          {deliveryHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <p>No recent deliveries</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {deliveryHistory.slice(0, 5).map(delivery => (
                <div key={delivery.id} className="flex justify-between items-center p-3 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Order #{delivery.order_number}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(delivery.actual_delivery_time || delivery.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-bold text-green-600">
                    +${delivery.delivery_fee?.toFixed(2) || '5.00'}
                  </span>
                </div>
              ))}
              {deliveryHistory.length > 5 && (
                <p className="text-center text-sm text-gray-500">
                  Showing 5 of {deliveryHistory.length} deliveries
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Earnings Tips */}
      <div className="bg-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">Maximize Your Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-green-600">🚀</span>
            <p className="text-green-800">
              <strong>Accept multiple deliveries</strong> - Plan routes to maximize efficiency
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-600">🚀</span>
            <p className="text-green-800">
              <strong>Work during peak hours</strong> - Evenings and weekends often have higher demand
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-600">🚀</span>
            <p className="text-green-800">
              <strong>Maintain high ratings</strong> - Good service can lead to better assignments
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-600">🚀</span>
            <p className="text-green-800">
              <strong>Track your performance</strong> - Monitor which areas and times are most profitable
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Next Payout</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-blue-900">
                <strong>Schedule:</strong> Every Monday
              </p>
              <p className="text-blue-900">
                <strong>Minimum payout:</strong> $10.00
              </p>
              <p className="text-blue-900">
                <strong>Method:</strong> Direct Deposit
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Support</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                For payment-related questions, contact support:
              </p>
              <p className="text-blue-600 font-medium mt-2">
                support@fooddelivery.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Earnings;
// src/components/restaurant/Analytics.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Analytics = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days'); // 7days, 30days, 90days

  const API_BASE = 'http://localhost:8000/restaurants';

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get restaurant
      const myRestaurantsResponse = await axios.get(`${API_BASE}/my-restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (myRestaurantsResponse.data.length > 0) {
        const myRestaurant = myRestaurantsResponse.data[0];
        setRestaurant(myRestaurant);
        
        // Get orders for analytics
        const ordersResponse = await axios.get(`${API_BASE}/restaurants/${myRestaurant.id}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setOrders(ordersResponse.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics metrics
  const calculateMetrics = () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90days':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const filteredOrders = orders.filter(order => 
      new Date(order.created_at) >= startDate
    );

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const completedOrders = filteredOrders.filter(order => order.status === 'DELIVERED').length;
    const averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    // Popular items calculation (mock - adjust based on your data structure)
    const popularItems = {};
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        popularItems[item.name] = (popularItems[item.name] || 0) + item.quantity;
      });
    });

    const topItems = Object.entries(popularItems)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalOrders: filteredOrders.length,
      completedOrders,
      totalRevenue,
      averageOrderValue,
      topItems,
      orderStatus: {
        placed: filteredOrders.filter(o => o.status === 'PLACED').length,
        confirmed: filteredOrders.filter(o => o.status === 'CONFIRMED').length,
        preparing: filteredOrders.filter(o => o.status === 'PREPARING').length,
        ready: filteredOrders.filter(o => o.status === 'READY').length,
        delivered: completedOrders,
        cancelled: filteredOrders.filter(o => o.status === 'CANCELLED').length
      }
    };
  };

  const metrics = calculateMetrics();

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
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Restaurant Found</h2>
        <p className="text-gray-600">You need to create a restaurant to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your restaurant's performance</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 text-2xl">
              📦
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 text-green-600 text-2xl">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 text-2xl">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600 text-2xl">
              📊
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          <div className="space-y-3">
            {Object.entries(metrics.orderStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Popular Items</h2>
          {metrics.topItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🍽️</div>
              <p>No order data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.topItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{index + 1}.</span>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {item.count} orders
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Overview</h2>
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-2">📈</div>
          <p>Revenue chart will be displayed here</p>
          <p className="text-sm">Integration with charting library needed</p>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Optimize delivery time</strong> - Faster deliveries improve customer satisfaction
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Promote popular items</strong> - Feature your best-selling dishes
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Monitor order status</strong> - Keep customers updated on their orders
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-blue-800">
              <strong>Update menu regularly</strong> - Keep your offerings fresh and exciting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
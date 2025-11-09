// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RestaurantManagement from '../components/admin/RestaurantManagement';
import OrderManagement from '../components/admin/OrderManagement';
import DeliveryManagement from '../components/admin/DeliveryManagement';
import MenuManagement from '../components/admin/MenuManagement';
import PaymentManagement from '../components/admin/PaymentManagement';



const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRestaurants: 0,
    activeDeliveries: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch restaurants
      const restaurantsResponse = await axios.get(`${API_BASE}/restaurants/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch orders
      const ordersResponse = await axios.get(`${API_BASE}/orders/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch deliveries
      const [assignedResponse, availableResponse] = await Promise.all([
        axios.get(`${API_BASE}/delivery/deliveries/assigned`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/delivery/deliveries/available`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const allDeliveries = [
        ...(assignedResponse.data || []),
        ...(availableResponse.data || [])
      ];

      const activeDeliveries = allDeliveries.filter(d => 
        ['assigned', 'picked_up', 'in_transit'].includes(d.status?.toLowerCase())
      );

      // const totalRevenue = ordersResponse.data?.reduce((sum, order) => {
      //   return sum + (order?.items.forEach(item => {
      //     item?.price 
      //   }); || 0);
      // }, 0) || 0;

      const totalRevenue = (ordersResponse.data || []).reduce((sum, order) => {
          // 1. Check if the order object and its items array exist
          if (order && order.items && Array.isArray(order.items)) {
              // 2. Use 'reduce' again (or 'map' then 'reduce'/'sum') to calculate
              //    the total price for all items in the current order.
              const orderTotal = order.items.reduce((orderSum, item) => {
                  // 3. Add the item's price if it's a valid number, otherwise add 0
                  return orderSum + (item?.price || 0);
              }, 0);

              // 4. Add the current order's total to the main accumulator
              return sum + orderTotal;
          }

          // 5. If the order is invalid (e.g., missing items), return the sum unchanged
          return sum;

      }, 0);

      setStats({
        totalOrders: ordersResponse.data?.length || 0,
        totalRestaurants: restaurantsResponse.data?.length || 0,
        activeDeliveries: activeDeliveries.length,
        totalRevenue: totalRevenue
      });

      // Get recent orders (last 5)
      setRecentOrders(ordersResponse.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview stats={stats} recentOrders={recentOrders} />;
      case 'restaurants':
        return <RestaurantManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'deliveries':
        return <DeliveryManagement />;
      case 'menu':
        return <MenuManagement />;
      case 'payments':
        return <PaymentManagement />;
      default:
        return <DashboardOverview stats={stats} recentOrders={recentOrders} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your food delivery platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Admin</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard' },
              { id: 'restaurants', name: 'Restaurants' },
              { id: 'orders', name: 'Orders' },
              { id: 'deliveries', name: 'Deliveries' },
              { id: 'menu', name: 'Menu' },
              { id: 'payments', name: 'Payments' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ stats, recentOrders }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Total Orders</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Restaurants</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRestaurants}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Active Deliveries</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeDeliveries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Total Revenue</h3>
              <p className="text-2xl font-semibold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order?.restaurant_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.items.reduce((orderSum, item) => {
                          // 3. Add the item's price if it's a valid number, otherwise add 0
                          return orderSum + (item?.price || 0);
                      }, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
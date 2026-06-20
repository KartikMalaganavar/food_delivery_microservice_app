// src/components/delivery/DeliveryHistory.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const DeliveryHistory = () => {
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchDeliveryHistory();
  }, [selectedPeriod]);

  const fetchDeliveryHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      // const response = await axios.get(`${API_BASE}/deliveries/assigned`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      const response = await axios.get(`${API_BASE}/deliveries/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter for completed deliveries
      const completed = (response.data || []).filter(delivery => 
        delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED'
      );
      
      // Apply period filter
      const filtered = filterByPeriod(completed, selectedPeriod);
      setDeliveryHistory(filtered);
    } catch (error) {
      console.error('Error fetching delivery history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = (deliveries, period) => {
    const now = new Date();
    let startDate;

    switch (period) {
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
        return deliveries;
    }

    return deliveries.filter(delivery => 
      new Date(delivery.actual_delivery_time || delivery.created_at) >= startDate
    );
  };

  const fetchDeliveryDetails = async (deliveryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/deliveries/${deliveryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDelivery(response.data);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
    }
  };

  const getStatusColor = (status) => {
    return status === 'DELIVERED' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getTotalEarnings = () => {
    return deliveryHistory
      .filter(d => d.status === 'DELIVERED')
      .reduce((sum, delivery) => sum + (delivery.delivery_fee || 5), 0);
  };

  const getSuccessfulDeliveries = () => {
    return deliveryHistory.filter(d => d.status === 'DELIVERED').length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery History</h1>
          <p className="text-gray-600">Track your past delivery performance</p>
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="3months">Last 3 Months</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 text-green-600 text-2xl">
              📦
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{deliveryHistory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 text-2xl">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{getSuccessfulDeliveries()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 text-2xl">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${getTotalEarnings().toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {deliveryHistory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No delivery history</h3>
          <p className="text-gray-600">
            {selectedPeriod === 'all' 
              ? "You haven't completed any deliveries yet." 
              : `No deliveries found for the selected period.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Records</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {deliveryHistory.map(delivery => (
              <div 
                key={delivery.id} 
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => fetchDeliveryDetails(delivery.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{delivery.order_number}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{delivery.restaurant_name}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Delivery Fee:</span>{' '}
                        <span className="text-green-600 font-semibold">
                          ${delivery.delivery_fee?.toFixed(2) || '5.00'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span>{' '}
                        {delivery.actual_delivery_time 
                          ? new Date(delivery.actual_delivery_time).toLocaleDateString()
                          : new Date(delivery.created_at).toLocaleDateString()
                        }
                      </div>
                      <div>
                        <span className="font-medium">Distance:</span>{' '}
                        {delivery.total_distance_km || 'N/A'} km
                      </div>
                    </div>
                  </div>
                  
                  <button className="text-blue-600 hover:text-blue-700 font-medium ml-4">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order #{selectedDelivery.order_number}
                  </h2>
                  <p className="text-gray-600">{selectedDelivery.restaurant_name}</p>
                </div>
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDelivery.status)}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Earnings</label>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedDelivery.delivery_fee?.toFixed(2) || '5.00'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accepted:</span>
                      <span>{new Date(selectedDelivery.created_at).toLocaleString()}</span>
                    </div>
                    {selectedDelivery.actual_delivery_time && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivered:</span>
                        <span>{new Date(selectedDelivery.actual_delivery_time).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span>{selectedDelivery.total_distance_km || 'N/A'} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span>{selectedDelivery.restaurant_address?.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span>{selectedDelivery.delivery_address?.city}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Feedback</h3>
                <p className="text-gray-500 text-sm">
                  Customer feedback and ratings would appear here when available.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
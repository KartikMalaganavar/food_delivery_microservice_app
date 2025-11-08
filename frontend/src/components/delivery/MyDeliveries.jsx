// src/components/delivery/MyDeliveries.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyDeliveries = () => {
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  const fetchActiveDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/deliveries/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter for active deliveries (not completed)
      const active = (response.data || []).filter(delivery => 
        delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED'
      );
      
      setActiveDeliveries(active);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    } finally {
      setLoading(false);
    }
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
      alert('Failed to fetch delivery details');
    }
  };

  const updateDeliveryStatus = async (deliveryId, newStatus, notes = '') => {
    setUpdatingStatus(deliveryId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/deliveries/${deliveryId}/status`,
        { status: newStatus, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Delivery status updated to ${newStatus.replace('_', ' ')}`);
      
      // Update local state
      setActiveDeliveries(prev => 
        prev.map(delivery => 
          delivery.id === deliveryId 
            ? { ...delivery, status: newStatus }
            : delivery
        )
      );
      
      // Close modal if delivered
      if (newStatus === 'DELIVERED') {
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert('Failed to update delivery status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800';
      case 'ON_THE_WAY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatusOptions = (currentStatus) => {
    const statusFlow = {
      'ACCEPTED': ['PICKED_UP', 'CANCELLED'],
      'PICKED_UP': ['ON_THE_WAY', 'CANCELLED'],
      'ON_THE_WAY': ['DELIVERED', 'CANCELLED']
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACCEPTED': return '✅';
      case 'PICKED_UP': return '📦';
      case 'ON_THE_WAY': return '🚗';
      case 'DELIVERED': return '🎉';
      default: return '📋';
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-gray-600">Manage your current delivery assignments</p>
      </div>

      {activeDeliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-4xl mb-4">🚗</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No active deliveries</h3>
          <p className="text-gray-600">Accept deliveries from the available section to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDeliveries.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getStatusIcon(delivery.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{delivery.order_number}
                    </h3>
                    <p className="text-gray-600">{delivery.restaurant_name}</p>
                    <p className="text-sm text-gray-500">
                      Accepted: {new Date(delivery.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ${delivery.delivery_fee?.toFixed(2) || '5.00'}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                    {delivery.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Delivery Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Pickup: {delivery.restaurant_address?.street}</span>
                  <span>Delivery: {delivery.delivery_address?.street}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: delivery.status === 'ACCEPTED' ? '33%' : 
                             delivery.status === 'PICKED_UP' ? '66%' : '100%'
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => fetchDeliveryDetails(delivery.id)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details →
                </button>
                
                <div className="flex space-x-2">
                  {getNextStatusOptions(delivery.status).map(status => (
                    <button
                      key={status}
                      onClick={() => updateDeliveryStatus(delivery.id, status)}
                      disabled={updatingStatus === delivery.id}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        status === 'CANCELLED' 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      } ${updatingStatus === delivery.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {updatingStatus === delivery.id ? 'Updating...' : `Mark as ${status.replace('_', ' ')}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
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

              {/* Status and Earnings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDelivery.status)}`}>
                    {selectedDelivery.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee</label>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedDelivery.delivery_fee?.toFixed(2) || '5.00'}
                  </p>
                </div>
              </div>

              {/* Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pickup Location</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">{selectedDelivery.restaurant_name}</p>
                    <p className="text-gray-600">{selectedDelivery.restaurant_address?.street}</p>
                    <p className="text-gray-600">
                      {selectedDelivery.restaurant_address?.city}, {selectedDelivery.restaurant_address?.zip_code}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Location</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">Customer</p>
                    <p className="text-gray-600">{selectedDelivery.delivery_address?.street}</p>
                    <p className="text-gray-600">
                      {selectedDelivery.delivery_address?.city}, {selectedDelivery.delivery_address?.zip_code}
                    </p>
                    {selectedDelivery.delivery_address?.instructions && (
                      <p className="text-blue-600 text-sm mt-2">
                        <strong>Instructions:</strong> {selectedDelivery.delivery_address.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedDelivery.items?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDelivery.items.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No item details available</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {getNextStatusOptions(selectedDelivery.status).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        updateDeliveryStatus(selectedDelivery.id, status);
                        setSelectedDelivery(null);
                      }}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        status === 'CANCELLED' 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Mark as {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;
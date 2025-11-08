// src/components/delivery/AvailableDeliveries.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AvailableDeliveries = () => {
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchAvailableDeliveries();
  }, []);

  useEffect(()=>{
    console.log("Available deliveries : ", availableDeliveries)
  }, [availableDeliveries])

  // Note: You might need to create an endpoint for available deliveries
  // For now, we'll use a mock implementation
  const fetchAvailableDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // This endpoint might not exist - you'll need to create it
      // For demo, we'll use assigned deliveries and filter for available ones
      const response = await axios.get(`${API_BASE}/deliveries/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      
      
      // Filter for deliveries that are not yet accepted
      const available = (response.data || []).filter(delivery => 
        delivery.status === 'ASSIGNED' || delivery.status === 'PENDING'
      );
      
      setAvailableDeliveries(available);
    } catch (error) {
      console.error('Error fetching available deliveries:', error);
      // Mock data for demonstration
      setAvailableDeliveries([
        {
          id: 1,
          order_id: 1001,
          order_number: 'ORD-001',
          restaurant_name: 'Pizza Palace',
          restaurant_address: { street: '123 Main St', city: 'Cityville' },
          delivery_address: { street: '456 Oak Ave', city: 'Cityville', instructions: 'Ring bell twice' },
          delivery_fee: 4.99,
          total_distance_km: 2.5,
          estimated_delivery_time: '30-40 min'
        },
        {
          id: 2,
          order_id: 1002,
          order_number: 'ORD-002',
          restaurant_name: 'Burger Corner',
          restaurant_address: { street: '789 Center Rd', city: 'Cityville' },
          delivery_address: { street: '321 Pine St', city: 'Cityville', instructions: 'Leave at door' },
          delivery_fee: 3.99,
          total_distance_km: 1.8,
          estimated_delivery_time: '20-30 min'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (deliveryId) => {
    setAcceptingId(deliveryId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/deliveries/${deliveryId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Delivery accepted successfully!');
      // Remove from available list
      setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    } catch (error) {
      console.error('Error accepting delivery:', error);
      alert('Failed to accept delivery');
    } finally {
      setAcceptingId(null);
    }
  };

  const getDistanceColor = (distance) => {
    if (distance < 2) return 'text-green-600';
    if (distance < 5) return 'text-yellow-600';
    return 'text-red-600';
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
        <h1 className="text-3xl font-bold text-gray-900">Available Deliveries</h1>
        <p className="text-gray-600">Accept new delivery assignments in your area</p>
      </div>

      {availableDeliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No available deliveries</h3>
          <p className="text-gray-600">Check back later for new delivery opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableDeliveries.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-lg shadow-md p-6">
              {/* Delivery Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{delivery.order_number}
                  </h3>
                  <p className="text-gray-600">{delivery.restaurant_name}</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Available
                </span>
              </div>

              {/* Delivery Details */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-semibold text-green-600">
                    ${delivery.delivery_fee?.toFixed(2) || '5.00'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Distance:</span>
                  <span className={`font-semibold ${getDistanceColor(delivery.total_distance_km)}`}>
                    {delivery.total_distance_km || 'N/A'} km
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Time:</span>
                  <span className="font-semibold">{delivery.estimated_delivery_time}</span>
                </div>
              </div>

              {/* Address Information */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Pickup:</p>
                  <p className="text-sm text-gray-600">
                    {delivery.restaurant_address?.street}, {delivery.restaurant_address?.city}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Delivery:</p>
                  <p className="text-sm text-gray-600">
                    {delivery.delivery_address?.street}, {delivery.delivery_address?.city}
                  </p>
                  {delivery.delivery_address?.instructions && (
                    <p className="text-xs text-blue-600 mt-1">
                      📝 {delivery.delivery_address.instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => acceptDelivery(delivery.id)}
                disabled={acceptingId === delivery.id}
                className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  acceptingId === delivery.id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {acceptingId === delivery.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Accepting...
                  </div>
                ) : (
                  `Accept Delivery - $${delivery.delivery_fee?.toFixed(2) || '5.00'}`
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Delivery Acceptance Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">✅</span>
            <p className="text-blue-800">
              <strong>Check distance</strong> - Consider travel time and route efficiency
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">✅</span>
            <p className="text-blue-800">
              <strong>Review instructions</strong> - Note any special delivery requirements
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">✅</span>
            <p className="text-blue-800">
              <strong>Consider location</strong> - Familiar areas are often easier to navigate
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">✅</span>
            <p className="text-blue-800">
              <strong>Check delivery fee</strong> - Higher fees may indicate longer distances
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailableDeliveries;
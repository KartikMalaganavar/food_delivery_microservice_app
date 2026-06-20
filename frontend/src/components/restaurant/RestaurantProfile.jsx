// src/components/restaurant/RestaurantProfile.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RestaurantProfile = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      coordinates: { lat: '', lng: '' }
    },
    phone: '',
    email: '',
    cuisine_type: '',
    opening_hours: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      wednesday: { open: '09:00', close: '22:00' },
      thursday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    delivery_time: '30-40 min',
    min_order_amount: 0,
    delivery_fee: 2.99,
    image_url: '',
    is_active: true
  });

  const API_BASE = 'http://localhost:8000/restaurants';

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/my-restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.length > 0) {
        const restaurantData = response.data[0];
        setRestaurant(restaurantData);
        setFormData(restaurantData);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (restaurant) {
        // Update existing restaurant
        await axios.put(`${API_BASE}/restaurants/${restaurant.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Restaurant updated successfully!');
      } else {
        // Create new restaurant
        await axios.post(`${API_BASE}/restaurants`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Restaurant created successfully!');
      }
      
      setIsEditing(false);
      fetchRestaurant();
    } catch (error) {
      console.error('Error saving restaurant:', error);
      alert('Failed to save restaurant');
    }
  };

  const updateOpeningHours = (day, field, value) => {
    setFormData({
      ...formData,
      opening_hours: {
        ...formData.opening_hours,
        [day]: {
          ...formData.opening_hours[day],
          [field]: value
        }
      }
    });
  };

  const updateAddress = (field, value) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {restaurant ? 'Restaurant Profile' : 'Create Restaurant'}
            </h1>
            <p className="text-gray-600">
              {restaurant ? 'Manage your restaurant information' : 'Set up your restaurant profile'}
            </p>
          </div>
          
          {restaurant && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {(!restaurant || isEditing) ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cuisine_type}
                  onChange={(e) => setFormData({...formData, cuisine_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Italian, Chinese, Indian"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) => updateAddress('street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) => updateAddress('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.state}
                    onChange={(e) => updateAddress('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.zip_code}
                    onChange={(e) => updateAddress('zip_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time
                </label>
                <input
                  type="text"
                  value={formData.delivery_time}
                  onChange={(e) => setFormData({...formData, delivery_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30-40 min"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Order Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({...formData, min_order_amount: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({...formData, delivery_fee: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Opening Hours</h3>
              <div className="space-y-3">
                {Object.entries(formData.opening_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <span className="w-24 text-sm font-medium text-gray-700 capitalize">
                      {day}
                    </span>
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/restaurant-image.jpg"
              />
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Restaurant is active and accepting orders</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {restaurant ? 'Update Restaurant' : 'Create Restaurant'}
              </button>
              {restaurant && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(restaurant);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Restaurant Header */}
            <div className="flex bg-gray-50 items-start space-x-6 shadow-md py-4 px-4 rounded-lg">
              {restaurant.image_url && (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-32 h-32 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    restaurant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {restaurant.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {restaurant.is_verified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Verified ✓
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{restaurant.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Cuisine:</span>
                    <p className="text-gray-600">{restaurant.cuisine_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-600">{restaurant.phone}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-600">{restaurant.email}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery:</span>
                    <p className="text-gray-600">{restaurant.delivery_time}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Address</h3>
              <div className="bg-gray-50 rounded-lg p-4 shadow-md">
                <p className="text-gray-900">{restaurant.address.street}</p>
                <p className="text-gray-900">
                  {restaurant.address.city}, {restaurant.address.state} {restaurant.address.zip_code}
                </p>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 shadow-md">
                <h4 className="font-medium text-gray-700 mb-1">Minimum Order</h4>
                <p className="text-lg font-semibold text-gray-900">
                  ${restaurant.min_order_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 shadow-md">
                <h4 className="font-medium text-gray-700 mb-1">Delivery Fee</h4>
                <p className="text-lg font-semibold text-gray-900">
                  ${restaurant.delivery_fee?.toFixed(2) || '2.99'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 shadow-md">
                <h4 className="font-medium text-gray-700 mb-1">Rating</h4>
                <p className="text-lg font-semibold text-gray-900">
                  {restaurant.rating || 'No ratings yet'}
                </p>
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Opening Hours</h3>
              <div className="bg-gray-50 rounded-lg p-4 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-40 gap-y-4">
                  {Object.entries(restaurant.opening_hours || {}).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="font-medium text-gray-700 capitalize">{day}:</span>
                      <span className="text-gray-600">
                        {hours.open} - {hours.close}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantProfile;
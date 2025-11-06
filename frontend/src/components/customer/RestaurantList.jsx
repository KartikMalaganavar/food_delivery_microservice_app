// src/components/customer/RestaurantList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const API_BASE = 'http://localhost:8000/restaurants';

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    filterAndSortRestaurants();
  }, [restaurants, searchTerm, cuisineFilter, sortBy]);
    
    useEffect(() => {
    console.log("restaurants :", restaurants);
  }, [restaurants]);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/restaurants`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRestaurants(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch restaurants');
      setLoading(false);
      console.error('Error fetching restaurants:', err);
    }
  };

  const filterAndSortRestaurants = () => {
    let filtered = restaurants.filter(restaurant => 
      restaurant.is_active !== false
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply cuisine filter
    if (cuisineFilter) {
      filtered = filtered.filter(restaurant =>
        restaurant.cuisine_type === cuisineFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'delivery_time':
          return a.delivery_time.localeCompare(b.delivery_time);
        default:
          return 0;
      }
    });

    setFilteredRestaurants(filtered);
  };

  const getCuisineTypes = () => {
    const cuisines = [...new Set(restaurants.map(r => r.cuisine_type).filter(Boolean))];
    return cuisines.sort();
  };

  const getRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        {halfStar && <span className="text-yellow-400">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button
          onClick={fetchRestaurants}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header and Filters */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurants</h1>
        <p className="text-gray-600 mb-6">Discover amazing places to eat</p>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Restaurants
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name, cuisine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cuisine Filter */}
            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type
              </label>
              <select
                id="cuisine"
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cuisines</option>
                {getCuisineTypes().map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="delivery_time">Delivery Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredRestaurants.length} of {restaurants.length} restaurants
        </p>
      </div>

      {/* Restaurant Grid */}
      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="text-6xl mb-4">🍕</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Restaurant Image */}
              <div className="h-48 bg-gray-200 relative">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <span className="text-4xl">🏪</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {restaurant.is_verified && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Verified ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Restaurant Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-1">⭐</span>
                    {restaurant.rating || 'New'}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {restaurant.description || 'No description available'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🍽️</span>
                    <span>{restaurant.cuisine_type || 'Various'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">⏱️</span>
                    <span>{restaurant.delivery_time || '30-40 min'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🚚</span>
                    <span>${restaurant.delivery_fee || '2.99'} delivery</span>
                  </div>
                </div>

                {/* Rating */}
                {restaurant.rating > 0 && (
                  <div className="mb-4">
                    {getRatingStars(restaurant.rating)}
                    <span className="text-xs text-gray-500">
                      {restaurant.total_ratings || 0} reviews
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <Link
                  to={`/customer/restaurants/${restaurant.id}/menu`}
                  state={{ restaurant }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors text-center block"
                >
                  View Menu
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantList;
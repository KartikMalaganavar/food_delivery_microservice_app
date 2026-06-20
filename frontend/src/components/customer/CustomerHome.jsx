// // src/components/customer/CustomerHome.js
// import React from 'react';
// import { Link } from 'react-router-dom';

// const CustomerHome = () => {
//   const quickActions = [
//     {
//       path: '/customer/restaurants',
//       icon: '🍕',
//       title: 'Browse Restaurants',
//       description: 'Explore various cuisines and menus',
//       color: 'blue'
//     },
//     {
//       path: '/customer/orders',
//       icon: '📦',
//       title: 'My Orders',
//       description: 'Track your previous orders',
//       color: 'green'
//     },
//     {
//       path: '/customer/cart',
//       icon: '🛒',
//       title: 'Shopping Cart',
//       description: 'Review your current order',
//       color: 'purple'
//     },
//     {
//       path: '/customer/profile',
//       icon: '👤',
//       title: 'Profile',
//       description: 'Manage your account settings',
//       color: 'indigo'
//     }
//   ];

//   const colorClasses = {
//     blue: 'bg-blue-600 hover:bg-blue-700',
//     green: 'bg-green-600 hover:bg-green-700',
//     purple: 'bg-purple-600 hover:bg-purple-700',
//     indigo: 'bg-indigo-600 hover:bg-indigo-700'
//   };

//   return (
//     <div>
//       <div className='min-h-[50vh]'>
//         test
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         {quickActions.map((action) => (
//           <Link
//             key={action.path}
//             to={action.path}
//             className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-center"
//           >
//             <div className="text-4xl mb-3">{action.icon}</div>
//             <h3 className="text-lg font-semibold text-gray-900 mb-2">
//               {action.title}
//             </h3>
//             <p className="text-sm text-gray-600">
//               {action.description}
//             </p>
//           </Link>
//         ))}
//       </div>

//       {/* Recent Activity Section */}
//       <div className="mt-12 bg-white rounded-lg shadow-md p-6">
//         <h2 className="text-xl font-semibold text-gray-900 mb-4">
//           Recent Activity
//         </h2>
//         <div className="text-center text-gray-500 py-8">
//           <p>No recent activity to display</p>
//           <p className="text-sm mt-2">Your orders and activities will appear here</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CustomerHome;



// src/components/customer/CustomerHome.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const CustomerHome = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch restaurants on component mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8000/restaurants/restaurants', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRestaurants(response.data || []);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        setError('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Slick carousel settings
  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  const quickActions = [
    {
      path: '/customer/restaurants',
      icon: '🍕',
      title: 'Browse Restaurants',
      description: 'Explore various cuisines and menus',
      color: 'blue'
    },
    {
      path: '/customer/orders',
      icon: '📦',
      title: 'My Orders',
      description: 'Track your previous orders',
      color: 'green'
    },
    {
      path: '/customer/cart',
      icon: '🛒',
      title: 'Shopping Cart',
      description: 'Review your current order',
      color: 'purple'
    },
    {
      path: '/customer/profile',
      icon: '👤',
      title: 'Profile',
      description: 'Manage your account settings',
      color: 'indigo'
    }
  ];

  // Fallback image in case restaurant has no image
  const getRestaurantImage = (restaurant) => {
    if (restaurant.image_url) {
      return restaurant.image_url;
    }
    
    // Default images based on cuisine type
    const cuisineImages = {
      'Italian': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      'Chinese': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w-400&h=300&fit=crop',
      'Indian': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
      'Mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      'American': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      'Japanese': 'https://images.unsplash.com/photo-1563612116629-8395c6d5efc0?w=400&h=300&fit=crop',
    };
    
    return cuisineImages[restaurant.cuisine_type] || 
           'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section with Restaurant Carousel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Discover Amazing Restaurants
            </h1>
            <p className="text-gray-600 mt-2">
              Order from your favorite local restaurants
            </p>
          </div>
          <Link
            to="/customer/restaurants"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View All Restaurants
          </Link>
        </div>

        {/* Restaurant Carousel */}

        {restaurants.length > 0 ? (
          <div className="relative w-full my-2 flex justify-center">

            <div className='w-[98%]'>

            <Slider {...carouselSettings} className='my-4'>
              {restaurants.map((restaurant) => (
                <div key={restaurant.id} className="px-2 w-full">
                  <Link to={`/customer/restaurants/${restaurant.id}/menu`}>
                    <div className="flex flex-row w-full bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                      <div className="relative h-60 overflow-hidden">
                        <img
                          src={getRestaurantImage(restaurant)}
                          alt={restaurant.name}
                          className="w-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            restaurant.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {restaurant.is_active ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 min-w-[25vw] min-h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 truncate">
                              {restaurant.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {restaurant.cuisine_type}
                            </p>
                          </div>
                          <div className="flex items-center text-amber-500">
                            <span className="text-sm font-medium">{restaurant.rating}</span>
                            <span className="ml-1">★</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center text-gray-500 text-sm">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {restaurant.delivery_time || '30-40'}
                          </span>
                          <span className="mx-2">|</span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            ${restaurant.min_order_amount || '10'} min
                          </span>
                          <span className="mx-2">|</span>
                          <span>
                          🚚{' $'}{restaurant.delivery_fee}
                          </span>

                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </Slider>
            </div>

          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Restaurants Available
            </h3>
            <p className="text-gray-500">
              Check back later for amazing dining options
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600">
                {action.description}
              </p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                <span>Get Started</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Cuisines Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Popular Cuisines
            </h2>
            <p className="text-gray-600 mt-1">
              Explore food by category
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {['Italian', 'Chinese', 'Indian', 'Mexican', 'American', 'Japanese'].map((cuisine) => (
            <Link
              key={cuisine}
              to={`/customer/restaurants?cuisine=${cuisine.toLowerCase()}`}
              className="bg-gray-50 hover:bg-blue-50 rounded-xl p-4 text-center transition-colors group"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {cuisine === 'Italian' && '🍝'}
                {cuisine === 'Chinese' && '🥢'}
                {cuisine === 'Indian' && '🍛'}
                {cuisine === 'Mexican' && '🌮'}
                {cuisine === 'American' && '🍔'}
                {cuisine === 'Japanese' && '🍣'}
              </div>
              <p className="font-medium text-gray-900 group-hover:text-blue-600">
                {cuisine}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Recent Activity
        </h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4 text-gray-300">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No recent activity
          </h3>
          <p className="text-gray-500 mb-6">
            Your orders and activities will appear here
          </p>
          <Link
            to="/customer/restaurants"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
          >
            <span>Start Ordering Now</span>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
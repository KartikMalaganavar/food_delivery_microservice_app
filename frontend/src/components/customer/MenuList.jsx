// src/components/customer/MenuList.js
import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const MenuList = () => {
  const { restaurantId } = useParams();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState(
    location.state?.restaurant || null,
  );
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { cart, setCart } = useAuth();

  const API_BASE = "http://localhost:8000/restaurants";

  useEffect(() => {
    if (!restaurant) {
      fetchRestaurantDetails();
    }
    fetchMenuItems();
  }, [restaurantId]);

  const fetchRestaurantDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/restaurants/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setRestaurant(response.data);
    } catch (err) {
      console.error("Error fetching restaurant details:", err);
    }
  };

  useEffect(() => {
    console.log("Menu Items :", menuItems);
  }, [menuItems]);

  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/menu-items/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const items = response.data.filter((item) => item.available !== false);
      setMenuItems(items);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(items.map((item) => item.category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);

      setLoading(false);
    } catch (err) {
      setError("Failed to fetch menu items");
      setLoading(false);
      console.error("Error fetching menu items:", err);
    }
  };

  const getItemsByCategory = () => {
    if (selectedCategory === "all") {
      return menuItems;
    }
    return menuItems.filter((item) => item.category === selectedCategory);
  };



  // const addToCart = (item) => {
  //   const existingItem = cart.find((cartItem) => cartItem.id === item.id);

  //   if (existingItem) {
  //     setCart(
  //       cart.map((cartItem) =>
  //         cartItem.id === item.id
  //           ? { ...cartItem, quantity: cartItem.quantity + 1 }
  //           : cartItem,
  //       ),
  //     );
  //   } else {
  //     setCart([...cart, { ...item, quantity: 1 }]);
  //   }

  //   console.log("cart : ", cart);
  // };

  // const getCartTotal = () => {
  //   return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  // };

  
  // Cart helper functions
  const increaseQuantity = (itemId) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  };

  const decreaseQuantity = (itemId) => {
    setCart(cart.map(item =>
      item.id === itemId && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getOrderTotal = () => {
    const subtotal = getCartTotal();
    const deliveryFee = restaurant?.delivery_fee || 2.99;
    const tax = subtotal * 0.08;
    return subtotal + deliveryFee + tax;
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      increaseQuantity(item.id);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };
  
  // const getCartItemCount = () => {
  //   return cart.reduce((count, item) => count + item.quantity, 0);
  // };

  const getDietaryInfo = (item) => {
    if (!item.dietary_info) return null;

    const badges = [];
    if (item.dietary_info.vegetarian) badges.push("🌱 Vegetarian");
    if (item.dietary_info.vegan) badges.push("🌿 Vegan");
    if (item.dietary_info.gluten_free) badges.push("🌾 Gluten Free");
    if (item.dietary_info.spicy) badges.push("🌶️ Spicy");

    return badges;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-lg text-red-600">{error}</div>
        <button
          onClick={fetchMenuItems}
          className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Restaurant Header */}
      {restaurant && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center">
                <h1 className="mr-3 text-2xl font-bold text-gray-900">
                  {restaurant.name}
                </h1>
                {restaurant.is_verified && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                    Verified ✓
                  </span>
                )}
              </div>

              <p className="mb-3 text-gray-600">{restaurant.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="mr-1">🍽️</span>
                  <span>{restaurant.cuisine_type}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">⏱️</span>
                  <span>{restaurant.delivery_time}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">⭐</span>
                  <span>
                    {restaurant.rating || "New"} (
                    {restaurant.total_ratings || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">💰</span>
                  <span>Min. order: ${restaurant.min_order_amount || 0}</span>
                </div>
              </div>
            </div>

            {restaurant.image_url && (
              <div className="mt-4 md:ml-6 md:mt-0">
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="h-32 w-32 rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories and Cart */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Menu Content */}
        <div className="flex-1">
          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
              <div className="flex space-x-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                    selectedCategory === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                      selectedCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="space-y-4">
            {getItemsByCategory().length === 0 ? (
              <div className="rounded-lg bg-white py-12 text-center shadow-sm">
                <div className="mb-4 text-6xl">🍽️</div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  No menu items found
                </h3>
                <p className="text-gray-600">
                  This restaurant hasn't added any items to this category yet.
                </p>
              </div>
            ) : (
              getItemsByCategory().map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <span className="ml-4 text-lg font-bold text-gray-900">
                          ${item.price}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mb-3 text-gray-600">{item.description}</p>
                      )}

                      {/* Dietary Information */}
                      {getDietaryInfo(item) && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {getDietaryInfo(item).map((badge, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {item.calories && <span>🔥 {item.calories} cal</span>}
                        {item.preparation_time && (
                          <span>⏱️ {item.preparation_time} min</span>
                        )}
                        {item.ingredients && item.ingredients.length > 0 && (
                          <span>📝 {item.ingredients.length} ingredients</span>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => addToCart(item)}
                      className="ml-4 whitespace-nowrap rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Sidebar */}
        {/* <div className="lg:w-80">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">  
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Order </h3>
            
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🛒</div>
                <p>Your cart is empty</p>
                <p className="text-sm">Add items from the menu</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">${getCartTotal().toFixed(2)}</span>
                  </div>
                  
                  <Link
                    to="/customer/cart"
                    state={{ cart, restaurant }}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 transition-colors text-center block font-semibold"
                  >
                    Proceed to Checkout ({getCartItemCount()} items)
                  </Link>
                </div>
              </>
            )}
          </div>
        </div> */}

        {/* Cart Sidebar */}
        {/* Categories and Cart */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu Content */}
        <div className="flex-1">
          {/* ... category tabs and menu items ... */}
        </div>

        {/* Updated Cart Sidebar */}
        <div className="lg:w-80">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Order</h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                  title="Empty Cart"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🛒</div>
                <p>Your cart is empty</p>
                <p className="text-sm">Add items from the menu</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                      {/* Item Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{item.name}</p>
                          <p className="text-gray-600 text-sm">${item.price.toFixed(2)} each</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="Remove Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                            disabled={item.quantity <= 1}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                              item.quantity <= 1
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            -
                          </button>
                          
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => increaseQuantity(item.id)}
                            className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                        
                        <p className="font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${getCartTotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Delivery Fee:</span>
                    <span className="font-medium">
                      {restaurant ? `$${restaurant.delivery_fee?.toFixed(2) || '2.99'}` : '$2.99'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax (8%):</span>
                    <span className="font-medium">
                      ${(getCartTotal() * 0.08).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-gray-900">
                      ${getOrderTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  <Link
                    to="/customer/cart"
                    state={{ cart, restaurant }}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 transition-colors text-center block font-semibold"
                  >
                    Proceed to Checkout ({getCartItemCount()} items)
                  </Link>
                  
                  <button
                    onClick={() => setCart([])}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors text-center font-medium"
                  >
                    Empty Cart
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
        
      </div>
    </div>
  );
};

export default MenuList;



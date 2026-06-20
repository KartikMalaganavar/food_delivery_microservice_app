// src/components/customer/Cart.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const Cart = () => {
  const location = useLocation();
  const navigate = useNavigate();
//   const [cart, setCart] = useState(location.state?.cart || []);
  const {cart, setCart} = useAuth(); 
  const [restaurant, setRestaurant] = useState(location.state?.restaurant || null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('cart'); // 'cart', 'checkout', 'success'
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [orderDetails, setOrderDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    zip_code: '',
    instructions: ''
  });
  const [specialInstructions, setSpecialInstructions] = useState('');

  const API_BASE = 'http://localhost:8000';

  // Fetch restaurant details if not passed via state
  useEffect(() => {
    if (cart.length > 0 && !restaurant) {
      fetchRestaurantDetails();
    }
  }, [cart, restaurant]);

  const fetchRestaurantDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      // Assuming all items in cart are from the same restaurant
      const restaurantId = cart[0]?.restaurant_id;
      if (restaurantId) {
        const response = await axios.get(`${API_BASE}/restaurants/restaurants/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRestaurant(response.data);
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
    }
  };

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

  const proceedToCheckout = () => {
    setStep('checkout');
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(atob(token.split('.')[1]));

      // 1. Create Order
      const orderPayload = {
        restaurant_id: restaurant.id,
        items: cart.map(item => ({
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          special_instructions: item.special_instructions || ''
        })),
        delivery_address: deliveryAddress,
        special_instructions: specialInstructions
      };

      console.log('Creating order:', orderPayload);

      const orderResponse = await axios.post(`${API_BASE}/orders/orders`, orderPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orderData = orderResponse.data;
      setOrderDetails(orderData);
      console.log('Order created:', orderData);

      // 2. Initiate Payment
      if (paymentMethod === 'online') {
        const paymentPayload = {
          order_id: orderData.id,
          order_number: orderData.order_number,
          amount: getOrderTotal(),
          method: 'card', // Default for online payment
          customer_id: user.sub,
          currency: 'USD'
        };

        console.log('Initiating payment:', paymentPayload);

        const paymentResponse = await axios.post(`${API_BASE}/payments/payments/initiate`, paymentPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const paymentData = paymentResponse.data;
        setPaymentDetails(paymentData);
        console.log('Payment initiated:', paymentData);
      }

      // 3. Success
      setStep('success');
      setCart([]); // Clear cart
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/customer/orders');
      }, 20000);

    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Failed to place order: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = () => {
    setStep('cart');
  };

  if (cart.length === 0 && step !== 'success') {
    return (
      <div className="min-h-fit py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center min-h-fit">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some delicious items from our restaurants!</p>
          <button
          
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold w-fit"
          >
<Link
            to="/customer/restaurants"
          >
            Browse Restaurants
          </Link>
          </button>
          
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4 text-green-500">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-2">
            Your order <strong>{orderDetails?.order_number}</strong> has been placed.
          </p>
          {paymentDetails && (
            <p className="text-gray-600 mb-4">
              Payment status: <strong>{paymentDetails.status}</strong>
            </p>
          )}
          <p className="text-blue-600 font-semibold mb-6">
            Please check your order status in "My Orders"
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirecting to orders page...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Restaurant Header */}
      {restaurant && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4">
            {restaurant.image_url && (
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.cuisine_type}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span>⭐ {restaurant.rating || 'New'}</span>
                <span>⏱️ {restaurant.delivery_time}</span>
                <span>🚚 ${restaurant.delivery_fee || '2.99'} delivery</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Order ({getCartItemCount()} items)
            </h2>
            
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center space-x-4 border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-gray-600 text-sm">${item.price.toFixed(2)} each</p>
                    {item.description && (
                      <p className="text-gray-500 text-sm mt-1">{item.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        disabled={item.quantity <= 1}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.quantity <= 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        -
                      </button>
                      
                      <span className="font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => increaseQuantity(item.id)}
                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    
                    <p className="font-semibold text-gray-900 w-20 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove Item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {step === 'cart' && (
              <div className="mt-6 flex justify-between items-center">
                <Link
                  to="/customer/restaurants"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Continue Shopping
                </Link>
                
                <button
                  onClick={proceedToCheckout}
                  disabled={cart.length === 0}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    cart.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>

          {/* Checkout Form */}
          {step === 'checkout' && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.zip_code}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, zip_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  value={deliveryAddress.instructions}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, instructions: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Gate code, floor, etc."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions for Restaurant (Optional)
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No onions, extra sauce, etc."
                />
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>💳 Online Payment (Credit/Debit Card)</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>💰 Cash on Delivery (COD)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:w-96">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal ({getCartItemCount()} items):</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee:</span>
                <span>${(restaurant?.delivery_fee || 2.99).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8%):</span>
                <span>${(getCartTotal() * 0.08).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-lg text-gray-900">
                  ${getOrderTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {step === 'checkout' && (
              <div className="space-y-3">
                <button
                  onClick={placeOrder}
                  disabled={loading || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip_code}
                  className={`w-full py-3 px-4 rounded-lg font-semibold ${
                    loading || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip_code
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : paymentMethod === 'online' ? (
                    `Pay $${getOrderTotal().toFixed(2)} Now`
                  ) : (
                    `Place Order (COD)`
                  )}
                </button>
                
                <button
                  onClick={cancelOrder}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
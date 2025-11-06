// src/components/customer/OrderHistory.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const API_BASE = 'http://localhost:8000/orders';

  useEffect(() => {
    fetchOrders();
  }, []);



  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/users/me/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOrders(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch orders');
      setLoading(false);
      console.error('Error fetching orders:', err);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSelectedOrder(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to fetch order details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'PLACED':
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-orange-100 text-orange-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentOrders = () => {
    return orders.filter(order => 
      order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
    );
  };

  const getDeliveredOrders = () => {
    let delivered = orders.filter(order => 
      order.status === 'DELIVERED' || order.status === 'CANCELLED'
    );

    // Apply month filter
    if (selectedMonth && selectedYear) {
      delivered = delivered.filter(order => {
        const orderDate = new Date(order.created_at);
        return (
          orderDate.getMonth() === parseInt(selectedMonth) &&
          orderDate.getFullYear() === parseInt(selectedYear)
        );
      });
    }

    return delivered;
  };

  const getAvailableMonthsYears = () => {
    const monthsYears = new Set();
    orders
      .filter(order => order.status === 'DELIVERED' || order.status === 'CANCELLED')
      .forEach(order => {
        const date = new Date(order.created_at);
        const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
        monthsYears.add(monthYear);
      });
    
    return Array.from(monthsYears).map(monthYear => {
      const [month, year] = monthYear.split('-');
      return { month: parseInt(month), year: parseInt(year) };
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getOrderTimeline = (order) => {
    const timeline = [
      { status: 'PLACED', label: 'Order Placed', time: order.created_at }
    ];

    // You can extend this based on your order status flow
    if (order.status === 'DELIVERED' && order.estimated_delivery_time) {
      timeline.push({
        status: 'DELIVERED',
        label: 'Delivered',
        time: order.estimated_delivery_time
      });
    }

    return timeline;
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
          onClick={fetchOrders}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentOrders = getCurrentOrders();
  const deliveredOrders = getDeliveredOrders();
  const availableMonthsYears = getAvailableMonthsYears();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
      <p className="text-gray-600 mb-8">Track your current and past orders</p>

      {/* Current Orders Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Current Orders</h2>
        
        {currentOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No active orders</h3>
            <p className="text-gray-600">Your current orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentOrders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => fetchOrderDetails(order.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Placed on {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ${order.total.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      Payment: {order.payment_status}
                    </span>
                    <span>Items: {order.items.length}</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delivered Orders Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Order History</h2>
          
          {availableMonthsYears.length > 0 && (
            <div className="flex space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Months</option>
                {Array.from(new Set(availableMonthsYears.map(my => my.month))).map(month => (
                  <option key={month} value={month}>
                    {monthNames[month]}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                {Array.from(new Set(availableMonthsYears.map(my => my.year))).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {deliveredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No past orders</h3>
            <p className="text-gray-600">
              {selectedMonth || selectedYear ? 'No orders found for selected filter' : 'Your past orders will appear here'}
            </p>
            {(selectedMonth || selectedYear) && (
              <button
                onClick={() => {
                  setSelectedMonth('');
                  setSelectedYear('');
                }}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {deliveredOrders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => fetchOrderDetails(order.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {order.status === 'DELIVERED' ? 'Delivered' : 'Cancelled'} on{' '}
                      {order.estimated_delivery_time 
                        ? formatDate(order.estimated_delivery_time)
                        : formatDate(order.created_at)
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ${order.total.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      Payment: {order.payment_status}
                    </span>
                    <span>Items: {order.items.length}</span>
                    <span>Placed: {formatDate(order.created_at)}</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order #{selectedOrder.order_number}
                  </h2>
                  <p className="text-gray-600">
                    Placed on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order Status and Payment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                    {selectedOrder.payment_status}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × ${item.price.toFixed(2)}
                          {item.special_instructions && (
                            <span className="ml-2 text-blue-600">({item.special_instructions})</span>
                          )}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee:</span>
                    <span>$2.99</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>${(selectedOrder.total * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-gray-900">
                      ${(selectedOrder.total + 2.99 + (selectedOrder.total * 0.08)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Address</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{selectedOrder.delivery_address.street}</p>
                  <p className="text-gray-900">
                    {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.zip_code}
                  </p>
                  {selectedOrder.delivery_address.instructions && (
                    <p className="text-gray-600 text-sm mt-1">
                      <strong>Instructions:</strong> {selectedOrder.delivery_address.instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Timeline</h3>
                <div className="space-y-3">
                  {getOrderTimeline(selectedOrder).map((timeline, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">{timeline.label}</p>
                        <p className="text-sm text-gray-600">{formatDate(timeline.time)}</p>
                      </div>
                    </div>
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

export default OrderHistory;
// src/components/admin/PaymentManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const API_BASE = 'http://localhost:8000/payments';

  useEffect(() => {
    fetchPayments();
  }, []);

  // const fetchPayments = async () => {
  //   try {
  //     // Since we don't have a direct endpoint to list all payments,
  //     // we'll need to get payments through orders or implement a new endpoint
  //     const token = localStorage.getItem('token');
  //     const ordersResponse = await axios.get(`${API_BASE}/orders/orders`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
      
  //     // Extract payment information from orders
  //     const paymentsData = [];
  //     for (const order of ordersResponse.data || []) {
  //       try {
  //         const paymentResponse = await axios.get(
  //           `${API_BASE}/payments/payments/`,
  //           { headers: { Authorization: `Bearer ${token}` } }
  //         );
  //         if (paymentResponse.data) {
  //           paymentsData.push({
  //             ...paymentResponse.data,
  //             order_id: order.id,
  //             order_total: order.total_amount
  //           });
  //         }
  //       } catch (error) {
  //         console.error(`Error fetching payment for order ${order.id}:`, error);
  //       }
  //     }
      
  //     setPayments(paymentsData);
  //   } catch (error) {
  //     console.error('Error fetching payments:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // Update the fetchPayments function:
  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          // limit: 50, // Get 50 payments per page
          // sort_by: 'created_at',
          // sort_order: 'desc'
        }
      });
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Fallback to old method if new endpoint doesn't exist
      await fetchPaymentsFallback();
    } finally {
      setLoading(false);
    }
  };

  const refundPayment = async (paymentId) => {
    if (!confirm('Are you sure you want to process a refund for this payment?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/payment/${paymentId}/refund`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Refund processed successfully!');
      fetchPayments();
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund');
    }
  };

  // const fetchPaymentDetails = async (orderId) => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await axios.get(`${API_BASE}/payments/order/${orderId}`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     console.log("Response for payment details - ", response)
  //     setSelectedPayment(response.data);
  //   } catch (error) {
  //     console.error('Error fetching payment details:', error);
  //   }
  // };
  // Add a new state for loading
  // const [selectedPayment, setSelectedPayment] = useState(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  // Updated fetch function
  const fetchPaymentDetails = async (orderId) => {
    try {
      setIsLoadingPayment(true); // Show loading
      setSelectedPayment(null);  // Optional: clear previous data

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/payments/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Payment details response:", response.data);
      setSelectedPayment(response.data[0]);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      // Optional: show error toast/notification
    } finally {
      setIsLoadingPayment(false); // Hide loading regardless of success/failure
    }
  };


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">View and manage payment transactions</p>
        </div>
        <button
          onClick={fetchPayments}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Total Payments</h3>
          <p className="text-3xl font-bold text-blue-600">{payments.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {payments.filter(p => p.status?.toLowerCase() === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {payments.filter(p => p.status?.toLowerCase() === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Refunded</h3>
          <p className="text-3xl font-bold text-purple-600">
            {payments.filter(p => p.status?.toLowerCase() === 'refunded').length}
          </p>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{payment.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{payment.order_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $ {payment.amount.toFixed(2) || payment.order_total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}
                    >
                      {payment.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.payment_method || 'Credit Card'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => fetchPaymentDetails(payment.order_id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {payment.status?.toLowerCase() === 'completed' && (
                      <button
                        onClick={() => refundPayment(payment.id)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {/* {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Payment Details #{selectedPayment.id}
                </h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Order ID</h4>
                    <p className="text-gray-600">#{selectedPayment.order_id}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Amount</h4>
                    <p className="text-gray-600">${selectedPayment.amount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Status</h4>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}
                    >
                      {selectedPayment.status}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Payment Method</h4>
                    <p className="text-gray-600">{selectedPayment.payment_method}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">Transaction Details</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Transaction ID: {selectedPayment.transaction_id || 'N/A'}</p>
                    <p>Created: {new Date(selectedPayment.created_at).toLocaleString()}</p>
                    {selectedPayment.updated_at && (
                      <p>Updated: {new Date(selectedPayment.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}


       {/* Updated Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Payment Details #{selectedPayment.payment_id || selectedPayment.id}
                </h3>
                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setIsLoadingPayment(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {isLoadingPayment ? (
                <div className="py-10 text-center text-gray-500">
                  Loading payment details...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Order Number</h4>
                      <p className="text-gray-600">{selectedPayment.order_number}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Amount</h4>
                      <p className="text-gray-600">
                        {selectedPayment.currency} {selectedPayment.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Status</h4>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          selectedPayment.status
                        )}`}
                      >
                        {selectedPayment.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Payment Method</h4>
                      <p className="text-gray-600">{selectedPayment.payment_method}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900">Transaction Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Payment ID: {selectedPayment.payment_id || 'N/A'}</p>
                      <p>Transaction ID: {selectedPayment.gateway_transaction_id || 'N/A'}</p>
                      <p>Created: {new Date(selectedPayment.created_at).toLocaleString()}</p>
                      {selectedPayment.updated_at && (
                        <p>Updated: {new Date(selectedPayment.updated_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
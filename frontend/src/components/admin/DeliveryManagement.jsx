// src/components/admin/DeliveryManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const API_BASE = 'http://localhost:8000/delivery';

  useEffect(() => {
    fetchDeliveries();
    fetchAvailablePartners();
  }, []);

  // const fetchDeliveries = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     const [assignedResponse, availableResponse] = await Promise.all([
  //       axios.get(`${API_BASE}/deliveries/assigned`, {
  //         headers: { Authorization: `Bearer ${token}` }
  //       }),
  //       axios.get(`${API_BASE}/deliveries/available`, {
  //         headers: { Authorization: `Bearer ${token}` }
  //       })
  //     ]);

  //     const allDeliveries = [
  //       ...(assignedResponse.data || []),
  //       ...(availableResponse.data || [])
  //     ];
  //     setDeliveries(allDeliveries);
  //   } catch (error) {
  //     console.error('Error fetching deliveries:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchDeliveries = async () => {
  try {
    const token = localStorage.getItem("token");
    const [assignedResponse, availableResponse] = await Promise.all([
      axios.get(`${API_BASE}/deliveries/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // axios.get(`${API_BASE}/deliveries/available`, {
      axios.get(`${API_BASE}/deliveries/all-deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const assigned = assignedResponse.data || [];
    const available = availableResponse.data || [];

    // 🧩 Step 1: Collect IDs or unique keys of assigned deliveries
    const assignedIds = new Set(
      assigned
        .filter((d) => d.status === "ASSIGNED")
        .map((d) => d.id) // or whichever unique field represents the delivery
    );

    // 🧩 Step 2: Filter out from available if already assigned
    const filteredAvailable = available.filter(
      (d) => !assignedIds.has(d.id)
    );

    // 🧩 Step 3: Combine both lists
    const allDeliveries = [...assigned, ...filteredAvailable];

    console.log("All deliveries - ", assigned)

    setDeliveries(allDeliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
  } finally {
    setLoading(false);
  }
};


  const fetchAvailablePartners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/delivery-partners/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePartners(response.data || []);
    } catch (error) {
      console.error('Error fetching available partners:', error);
    }
  };

  const assignDeliveryPartner = async (deliveryId, partnerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/deliveries/${deliveryId}/assign`,
        { delivery_partner_id: partnerId, 
          delivery_partner_name: partnerId,
          delivery_partner_phone: "" 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Delivery partner assigned successfully!');
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      alert('Failed to assign delivery partner');
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = localStorage.getItem('token');

      if(status === "ACCEPTED"){
        await axios.post(
          `${API_BASE}/deliveries/${deliveryId}/accept`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      else{

        await axios.post(
          `${API_BASE}/deliveries/${deliveryId}/status`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert('Delivery status updated successfully!');
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert('Failed to update delivery status');
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
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800';
      case 'in_transit':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-gray-600">Manage deliveries and assign delivery partners</p>
        </div>
        <button
          onClick={fetchDeliveries}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Delivery Partners Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">All Deliveries</h3>
          <p className="text-3xl font-bold text-blue-600">{deliveries.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Active Deliveries</h3>
          <p className="text-3xl font-bold text-orange-600">
            {deliveries.filter(d => 
              ['assigned', 'picked_up', 'on_the_way', 'accepted'].includes(d.status?.toLowerCase())
            ).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Pending Assignments</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {deliveries.filter(d => d.status?.toLowerCase() === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">Available Partners</h3>
          <p className="text-3xl font-bold text-blue-600">{availablePartners.length}</p>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Deliveries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{delivery.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{delivery.order_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}
                    >
                      {delivery.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.delivery_partner_name ? (
                      `Partner #${delivery.delivery_partner_name}`
                    ) : (
                      <span className="text-yellow-600">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    
                    {delivery.status !== "DELIVERED" && !delivery.delivery_partner && availablePartners.length > 0 && (
                      <select
                        onChange={(e) => assignDeliveryPartner(delivery.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        defaultValue=""
                      >
                        <option value="">Assign Partner</option>
                        {availablePartners.map(partner => (
                          <option key={partner.partner_id} value={partner.partner_id}>
                            Partner - {partner.partner_id}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => fetchDeliveryDetails(delivery.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {/* {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
                      <select
                        onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        defaultValue={delivery.status}
                      >
                        <option value="">Update Status</option>
                        <option value="ACCEPTED">Accept</option>
                        <option value="PICKED_UP">Picked Up</option>
                        <option value="ON_THE_WAY">On the way</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    )} */}
                    {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
  <select
    onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value)}
    className="text-sm border border-gray-300 rounded px-2 py-1"
    defaultValue={delivery.status}
  >
    <option value=""
      disabled={delivery.status === 'ACCEPTED' ||
                delivery.status === 'PICKED_UP' || 
                delivery.status === 'ON_THE_WAY' || 
                delivery.status === 'DELIVERED'}

      className={delivery.status === 'ACCEPTED' ||
                 delivery.status === 'PICKED_UP' || 
                 delivery.status === 'ON_THE_WAY' || 
                 delivery.status === 'DELIVERED' ? 
                 'text-gray-400' : ''}
    >Update Status</option>
    
    {/* ACCEPTED - only enabled if current status is before ACCEPTED */}
    <option 
      value="ACCEPTED" 
      disabled={delivery.status === 'PICKED_UP' || 
                delivery.status === 'ON_THE_WAY' || 
                delivery.status === 'DELIVERED'}
      className={delivery.status === 'PICKED_UP' || 
                 delivery.status === 'ON_THE_WAY' || 
                 delivery.status === 'DELIVERED' ? 
                 'text-gray-400' : ''}
    >
      Accept
    </option>
    
    {/* PICKED_UP - enabled if current status is ACCEPTED or before */}
    <option 
      value="PICKED_UP" 
      disabled={delivery.status === 'ON_THE_WAY' || 
                delivery.status === 'DELIVERED'}
      className={delivery.status === 'ON_THE_WAY' || 
                 delivery.status === 'DELIVERED' ? 
                 'text-gray-400' : ''}
    >
      Picked Up
    </option>
    
    {/* ON_THE_WAY - enabled if current status is PICKED_UP or before */}
    <option 
      value="ON_THE_WAY" 
      disabled={delivery.status === 'DELIVERED'}
      className={delivery.status === 'DELIVERED' ? 'text-gray-400' : ''}
    >
      On the way
    </option>
    
    {/* DELIVERED - always enabled until delivered */}
    <option value="DELIVERED">Delivered</option>
    
    {/* CANCELLED - always enabled until delivered */}
    <option value="CANCELLED">Cancelled</option>
  </select>
)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Delivery Details #{selectedDelivery.id}
                </h3>
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Order ID</h4>
                    <p className="text-gray-600">#{selectedDelivery.order_id}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Status</h4>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDelivery.status)}`}
                    >
                      {selectedDelivery.status}
                    </span>
                  </div>
                </div>

                {selectedDelivery.delivery_partner_name && (
                  <div>
                    <h4 className="font-semibold text-gray-900">Delivery Partner</h4>
                    <p className="text-gray-600">
                      {selectedDelivery.delivery_partner_name}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900">Timeline</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Created: {new Date(selectedDelivery.created_at).toLocaleString()}</p>
                    {selectedDelivery.assigned_at && (
                      <p>Assigned: {new Date(selectedDelivery.assigned_at).toLocaleString()}</p>
                    )}
                    {selectedDelivery.picked_up_at && (
                      <p>Picked Up: {new Date(selectedDelivery.picked_up_at).toLocaleString()}</p>
                    )}
                    {selectedDelivery.delivered_at && (
                      <p>Delivered: {new Date(selectedDelivery.delivered_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
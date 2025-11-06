// src/pages/CustomerDashboard.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerHome from './CustomerHome';
import RestaurantList from './RestaurantList';
import MenuList from './MenuList';
import OrderHistory from './OrderHistory';
import Cart from './Cart';
// import Profile from '../components/customer/Profile';

const CustomerDashboard = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerHome />} />
      <Route path="/restaurants" element={<RestaurantList />} />
      <Route path="/restaurants/:restaurantId/menu" element={<MenuList />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/orders" element={<OrderHistory />} />
      {/* <Route path="/profile" element={<Profile />} /> */}
    </Routes>
  );
};

export default CustomerDashboard;
// src/pages/RestaurantDashboard.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RestaurantDashboard from '../components/restaurant/RestaurantDashboard';
import OrderManagement from '../components/restaurant/OrderManagement';
import MenuManagement from '../components/restaurant/MenuManagement';
import RestaurantProfile from '../components/restaurant/RestaurantProfile';
import Analytics from '../components/restaurant/Analytics';

const RestaurantDashboardRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<RestaurantDashboard />} />
      <Route path="/orders" element={<OrderManagement />} />
      <Route path="/menu" element={<MenuManagement />} />
      <Route path="/profile" element={<RestaurantProfile />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  );
};

export default RestaurantDashboardRouter;
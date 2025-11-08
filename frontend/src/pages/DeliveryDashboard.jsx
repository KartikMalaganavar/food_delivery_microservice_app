// src/pages/DeliveryDashboard.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DeliveryDashboard from '../components/delivery/DeliveryDashboard';
import AvailableDeliveries from '../components/delivery/AvailableDeliveries';
import MyDeliveries from '../components/delivery/MyDeliveries';
import DeliveryHistory from '../components/delivery/DeliveryHistory';
import Earnings from '../components/delivery/Earnings';

const DeliveryDashboardRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<DeliveryDashboard />} />
      <Route path="/available" element={<AvailableDeliveries />} />
      <Route path="/active" element={<MyDeliveries />} />
      <Route path="/history" element={<DeliveryHistory />} />
      <Route path="/earnings" element={<Earnings />} />
    </Routes>
  );
};

export default DeliveryDashboardRouter;
// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './components/customer/CustomerDashboard';
import RestaurantDashboardRouter from './pages/RestaurantLayout';
import DeliveryDashboardRouter from './pages/DeliveryDashboard';
import AdminDashboard from './pages/AdminDashboard';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Customer routes */}
          <Route 
            path="/customer/*" 
            element={
              <ProtectedRoute requiredRole="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Restaurant routes */}
          <Route 
            path="/restaurant/*" 
            element={
              <ProtectedRoute requiredRole="restaurant">
                <RestaurantDashboardRouter />
              </ProtectedRoute>
            } 
          />
          
          {/* Delivery routes */}
          <Route 
            path="/delivery/*" 
            element={
              <ProtectedRoute requiredRole="delivery">
                <DeliveryDashboardRouter />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes (if needed) */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default route - redirect based on user role */}
          <Route 
            path="/" 
            element={<RoleBasedRedirect />} 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Component to redirect users based on their role
const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on user role
  switch (user.role) {
    case 'customer':
      return <Navigate to="/customer" replace />;
    case 'restaurant':
      return <Navigate to="/restaurant" replace />;
    case 'delivery':
      return <Navigate to="/delivery" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;
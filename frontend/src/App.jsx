// import React, { useContext, useEffect, useState } from "react";
// import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Home from "./pages/Home";
// import AuthContext from "./context/AuthContext";
// import EditTodoModal from "./components/EditTodoModal";

// function App() {
//   const { authToken, authType } = useContext(AuthContext);
//   const isAuthenticated = authToken && authType;

//   return (
//     <Router>
//       <div className="gradient-bg flex min-h-screen justify-center from-blue-500 to-purple-600 p-8 max-h-screen">
//         {/* <div className="transform rounded-lg bg-white p-8 shadow-lg transition duration-500 hover:scale-105"> */}

//           <Routes>
//             {/* Protected route for Home */}
//             <Route
//               path="/"
//               element={
//                 isAuthenticated ? (
//                   <Home />
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             {/* Login Route */}
//             <Route
//               path="/login"
//               element={
//                 isAuthenticated ? (
//                   <Navigate to="/" replace />
//                 ) : (
//                   <>
//                     <Login />
//                   </>
//                 )
//               }
//             />

//             {/* Register Route */}
//             <Route
//               path="/register"
//               element={
//                 isAuthenticated ? (
//                   <Navigate to="/" replace />
//                 ) : (
//                   <>
//                     <Register />
//                   </>
//                 )
//               }
//             />
//           </Routes>

//         {/* </div> */}
//       </div>
//     </Router>
//   );
// }

// export default App;


// import React from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Home from "./components/Home";
// import Restaurant from "./components/Restaurant";
// import Cart from "./components/Cart";
// import Checkout from "./components/Checkout";
// import OrderTracker from "./components/OrderTracker";

// export default function App() {
//   return (
//     <BrowserRouter>
//       <div>
//         <nav className="p-4 bg-white shadow">
//           <a href="/" className="mr-4">Home</a>
//           <a href="/cart">Cart</a>
//         </nav>
//         <Routes>
//           <Route path="/" element={<Home/>} />
//           <Route path="/restaurant/:id" element={<Restaurant/>} />
//           <Route path="/cart" element={<Cart/>} />
//           <Route path="/checkout" element={<Checkout/>} />
//           <Route path="/order/:id" element={<OrderTracker/>} />
//         </Routes>
//       </div>
//     </BrowserRouter>
//   );
// }



// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './components/customer/CustomerDashboard';
// import Home from './components/Home';
// import Navbar from './components/Navbar';
// import CustomerDashboard from './pages/CustomerDashboard';
// import RestaurantDashboard from './pages/RestaurantDashboard';
// import DeliveryDashboard from './pages/DeliveryDashboard';
// import Unauthorized from './pages/Unauthorized';

// Simple Home component (you can expand this)
const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Food Delivery App
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Hello, {user?.username}! You are logged in as {user?.role}.
          </p>
          <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Browse Restaurants
              </button>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                View My Orders
              </button>
              {user?.role === 'restaurant' && (
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                  Manage Restaurant
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}
          
          {/* Customer routes */}
          <Route 
            path="/customer/*" 
            element={
              <ProtectedRoute requiredRole="customer">
                <CustomerDashboard />
                {/* <Home /> */}
                {/* <div>Customer</div> */}
              </ProtectedRoute>
            } 
          />
          
          {/* Restaurant routes */}
          <Route 
            path="/restaurant/*" 
            element={
              <ProtectedRoute requiredRole="restaurant">
                {/* <RestaurantDashboard /> */}
                <div>Restaurant</div>
              </ProtectedRoute>
            } 
          />
          
          {/* Delivery routes */}
          <Route 
            path="/delivery/*" 
            element={
              <ProtectedRoute requiredRole="delivery">
                {/* <DeliveryDashboard /> */}
                <div>Delivery</div>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes (if needed) */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <div>Admin Dashboard</div>
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

// export default App;

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <Routes>
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
//           <Route 
//             path="/" 
//             element={
//               <ProtectedRoute>
//                 <Home />
//               </ProtectedRoute>
//             } 
//           />
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
//       </Router>
//     </AuthProvider>
//   );
// }

export default App;
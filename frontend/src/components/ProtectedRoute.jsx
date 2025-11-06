// // src/components/ProtectedRoute.js
// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// const ProtectedRoute = ({ children, requiredRole }) => {
//   const { isAuthenticated, user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   if (requiredRole && user?.role !== requiredRole) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return children;
// };

// export default ProtectedRoute;


// // src/components/ProtectedRoute.js
// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// const ProtectedRoute = ({ children, requiredRole }) => {
//   const { isAuthenticated, user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   if (requiredRole && user?.role !== requiredRole) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return (

//   <div className="min-h-screen bg-gray-50">
//       <Navbar />
//       <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
//         <div className="text-center">
//           <h1 className="text-4xl font-bold text-gray-900 mb-4">
//             Welcome to Food Delivery App
//           </h1>
//           <p className="text-lg text-gray-600 mb-8">
//             Hello, {user?.username}! You are logged in as {user?.role}.
//           </p>
//           {/* <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
//             <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
//             <div className="space-y-3">
//               <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
//                 Browse Restaurants
//               </button>
//               <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
//                 View My Orders
//               </button>
//               {user?.role === 'restaurant' && (
//                 <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
//                   Manage Restaurant
//                 </button>
//               )}
//             </div>
//           </div> */}
//           {children}
//         </div>
//       </div>
//     </div>

    
//   );
// };

// export default ProtectedRoute;


// // src/components/ProtectedRoute.js
// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import Navbar from './Navbar'; // Make sure to import Navbar

// const ProtectedRoute = ({ children, requiredRole }) => {
//   const { isAuthenticated, user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   if (requiredRole && user?.role !== requiredRole) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar user={null} />
//       <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
//         <div className="text-center">
//           <h1 className="text-4xl font-bold text-gray-900 mb-4">
//             Welcome to Food Delivery App
//           </h1>
//           <p className="text-lg text-gray-600 mb-8">
//             Hello, {user?.username}! You are logged in as {user?.role}.
//           </p>
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ProtectedRoute;


// src/components/ProtectedRoute.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Page Title - You can make this dynamic based on current route */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-xl font-semibold text-gray-900">
                  Food Delivery App
                </h1>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 hidden sm:block">
                  Welcome, <strong>{user?.username}</strong>
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Welcome Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Food Delivery App
                </h1>
                <p className="text-lg text-gray-600">
                  Hello, {user?.username}! You are logged in as {user?.role}.
                </p>
              </div>
              
              {/* Page Content */}
              {/* <CustomerDashboard /> */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoute;
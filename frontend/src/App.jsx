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


import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Restaurant from "./components/Restaurant";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import OrderTracker from "./components/OrderTracker";

export default function App() {
  return (
    <BrowserRouter>
      <div>
        <nav className="p-4 bg-white shadow">
          <a href="/" className="mr-4">Home</a>
          <a href="/cart">Cart</a>
        </nav>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/restaurant/:id" element={<Restaurant/>} />
          <Route path="/cart" element={<Cart/>} />
          <Route path="/checkout" element={<Checkout/>} />
          <Route path="/order/:id" element={<OrderTracker/>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

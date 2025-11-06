// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const [cart, setCart] = useState([]);


  // API base URL - adjust according to your backend
  // const API_BASE = 'http://localhost:8000';
  // const API_BASE = 'http://localhost:8000';
  

  // useEffect(() => {
  //   if (token) {
  //     // Verify token on app start
  //     verifyToken();
  //   } else {
  //     setLoading(false);
  //   }
  // }, [token]);

  // const verifyToken = async () => {
  //   try {
  //     const response = await axios.get(`${API_BASE}/auth/verify`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     console.log(response.data.user)
  //     setUser(response.data.user);
  //   } catch (error) {
  //     console.error('Token verification failed:', error);
  //     logout();
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const verificationInProgress = useRef(false); // Add this ref

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    // Skip if verification is already in progress or no token
    if (verificationInProgress.current || !token) {
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      verificationInProgress.current = true; // Set flag
      
      try {
        const response = await axios.get(`${API_BASE}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Token verification response:', response.data.user);
        setUser(response.data.user);
      } catch (error) {
        console.error('Token verification failed:', error);
        logout();
      } finally {
        setLoading(false);
        verificationInProgress.current = false; // Reset flag
      }
    };

    verifyToken();
  }, [token]); // Only depend on token

  const login = async (username, password) => {
    try {
      console.log(username, password)
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username,
        password
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Decode token to get user info (you might want to add a /me endpoint)
      const userData = decodeToken(access_token);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (username, password, role = 'customer') => {
    try {
      console.log(username, password, role)
      const response = await axios.post(`${API_BASE}/auth/signup`, {
        username,
        password,
        role
      });

      return { success: true, message: response.data.msg };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const decodeToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        username: payload.sub,
        role: payload.role
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!token,
    cart,
    setCart
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
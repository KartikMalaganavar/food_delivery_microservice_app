// src/api.js
import axios from "axios";
const API = axios.create({ baseURL: "http://localhost:8000" }); // gateway

export const signup = (payload) => API.post("/auth/signup", payload);
export const login = (payload) => API.post("/auth/login", payload);

export const listRestaurants = () => API.get("/restaurants/restaurants");
export const getMenu = (restaurantId) => API.get(`/restaurants/menu/${restaurantId}`);

export const placeOrder = (payload) => API.post("/orders/orders", payload);
export const getOrder = (orderId) => API.get(`/orders/orders/${orderId}`);
export const updateStatus = (orderId, status) => API.patch(`/orders/orders/${orderId}/status`, null, { params: { status } });
export const pay = (payload) => API.post("/payments/pay", payload);

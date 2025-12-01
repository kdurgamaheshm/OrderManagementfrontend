import axios from 'axios';

const api = axios.create({
  baseURL: 'https://delivery-management-backend-ssl7.onrender.com/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

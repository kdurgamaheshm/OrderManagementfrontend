// frontend: src/services/api.ts
import axios from "axios";

const base = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const api = axios.create({
  baseURL: base,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

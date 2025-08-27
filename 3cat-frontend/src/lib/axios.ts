import axios from "axios";

console.log("API Base URL:", import.meta.env.VITE_API_URL);

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000", // Use Vite env variable or fallback to localhost
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;

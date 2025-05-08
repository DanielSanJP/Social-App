// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Remove trailing slash if present
const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

export { baseUrl };
// API base URL configuration
// In local development, defaults to http://localhost:8080
// In production (Vercel/Render/Netlify), set VITE_API_URL in environment variables
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

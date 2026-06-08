import axios from "axios";

// api.js
function getBackendURL() {
  return window.backendURL || "http://localhost:8000";
}

export const api = axios.create({
  withCredentials: true,
  timeout: 300000, // 5 minutes
});

api.interceptors.request.use((request) => {
  request.baseURL = getBackendURL();

  console.log("API request:", {
    method: request.method,
    baseURL: request.baseURL,
    url: request.url,
    timeout: request.timeout,
  });

  return request;
});

api.interceptors.response.use(
  (response) => {
    console.log("API response:", {
      status: response.status,
      url: response.config?.url,
      data: response.data,
    });

    return response;
  },
  (error) => {
    console.error("API error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      timeout: error.config?.timeout,
    });

    return Promise.reject(error);
  }
);
import axios from "axios";


function getBackendURL() {
  return window.backendURL || "http://localhost:8000";
}

export const api = axios.create({
  withCredentials: true,
});

api.interceptors.request.use((request) => {
  request.baseURL = getBackendURL();
  return request;
});

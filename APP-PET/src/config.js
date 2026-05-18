const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiPort = import.meta.env.VITE_API_PORT || "3000";

export const API = apiBaseUrl && apiBaseUrl.trim()
  ? apiBaseUrl.replace(/\/+$/, "")
  : `${window.location.protocol}//${window.location.hostname}:${apiPort}`;

window.BUSCAPET_API_BASE_URL = API;
localStorage.setItem("BUSCAPET_API_BASE_URL", API);

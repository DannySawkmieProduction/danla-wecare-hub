// env-config.js — deprecated runtime configuration helper
// This file is no longer required. Client config is loaded dynamically from /api/client-config.
window.__WECARE_CONFIG = window.__WECARE_CONFIG || {};

if (window.__WECARE_CONFIG.UPLOAD_API_KEY && window.__UPLOAD_API_KEY === undefined) {
  window.__UPLOAD_API_KEY = window.__WECARE_CONFIG.UPLOAD_API_KEY;
}

const ADMIN_AUTH_KEY = 'danlaWeCare.adminAuthenticated';
let ADMIN_USERNAME = 'admin';

async function fetchClientConfig(){
  if(window.__WECARE_CONFIG) return window.__WECARE_CONFIG;
  try{
    const response = await fetch('/api/client-config');
    if(response.ok){
      const config = await response.json();
      window.__WECARE_CONFIG = config;
      if(config.UPLOAD_API_KEY){ window.__UPLOAD_API_KEY = config.UPLOAD_API_KEY; }
      if(config.ADMIN_USERNAME){ ADMIN_USERNAME = config.ADMIN_USERNAME; }
      return config;
    }
  }catch(e){}
  window.__WECARE_CONFIG = {};
  return window.__WECARE_CONFIG;
}

async function authenticateAdmin(username, password){
  try{
    const response = await fetch('/api/auth/admin', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    return response.ok;
  }catch(e){
    return false;
  }
}

function loadScriptOnce(src) {
  const existing = Array.from(document.querySelectorAll('script[src]')).find(script => script.src.endsWith(src));
  if (existing) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function loadIntegrationHelpers(role) {
  await Promise.all([
    loadScriptOnce('js/perf.js'),
    loadScriptOnce('js/d1-sync.js'),
    loadScriptOnce('js/institution.js')
  ]);
  if (typeof applyInstitutionToDocument === 'function') {
    applyInstitutionToDocument();
  }
  if (typeof ensureRoleNavigation === 'function' && role) {
    ensureRoleNavigation(role);
  }
}

function hexEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isAdminAuthenticated() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

function setAdminAuthenticated(authenticated) {
  sessionStorage.setItem(ADMIN_AUTH_KEY, authenticated ? 'true' : 'false');
}

function getCurrentPage() {
  // Cloudflare Pages serves static HTML with the .html extension stripped
  // from the URL by default (e.g. /admin-login.html -> /admin-login). This
  // normalizes the current path back to a canonical "<name>.html" form so
  // page-matching below works the same whether the browser shows
  // "/admin-login" or "/admin-login.html".
  let page = window.location.pathname.split('/').pop();
  if (!page) {
    page = 'index.html';
  }
  if (!page.endsWith('.html')) {
    page += '.html';
  }
  return page;
}

function redirectToLogin() {
  window.location.replace('admin-login.html');
}

function redirectToDashboard() {
  window.location.replace('admin-dashboard.html');
}

function displayStatus(message, isError = false) {
  const statusText = document.getElementById('admin-login-status');
  if (!statusText) {
    return;
  }

  statusText.textContent = message;
  statusText.style.color = isError ? '#F87171' : '#c8d4e2';
}

function clearStatus() {
  const statusText = document.getElementById('admin-login-status');
  if (statusText) {
    statusText.textContent = '';
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchClientConfig();
  const page = getCurrentPage();
  const authenticated = isAdminAuthenticated();

  if (page === 'admin-login.html') {
    if (authenticated) {
      redirectToDashboard();
      return;
    }

    const loginForm = document.getElementById('admin-login-form');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');

    if (loginForm) {
      loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearStatus();
        displayStatus('Verifying credentials…');

        const username = usernameInput?.value.trim() || '';
        const password = passwordInput?.value || '';

        if (!username || !password) {
          displayStatus('Enter both username and password.', true);
          return;
        }

        const valid = await authenticateAdmin(username, password);
        if (valid) {
          setAdminAuthenticated(true);
          redirectToDashboard();
          return;
        }

        displayStatus('Invalid username or password.', true);
      });
    }
  }

  if (page === 'admin-dashboard.html') {
    if (!authenticated) {
      redirectToLogin();
      return;
    }

    const logoutButton = document.getElementById('admin-logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        setAdminAuthenticated(false);
        redirectToLogin();
      });
    }
  }

  loadIntegrationHelpers('admin').catch(() => {});
});

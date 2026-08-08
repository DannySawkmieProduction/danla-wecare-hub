let ADMIN_USERNAME = 'admin';

async function fetchClientConfig(){
  if(window.__WECARE_CONFIG) return window.__WECARE_CONFIG;
  try{
    const response = await fetch('/api/client-config');
    if(response.ok){
      const config = await response.json();
      window.__WECARE_CONFIG = config;
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
      credentials:'same-origin',
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

// Asks the server whether the current request carries a valid, unexpired
// admin session (the signed, HttpOnly session cookie issued by
// POST /api/auth/admin - see workers/auth.js / workers/d1-api.js). This
// replaces the old sessionStorage.getItem('...adminAuthenticated') === 'true'
// check, which was only ever a client-set flag with nothing behind it: any
// visitor could set it themselves from the browser console. There is no
// client-readable/settable "authenticated" flag left anywhere in this file -
// the only source of truth is the server's verification of the signed
// cookie, which JavaScript cannot read or forge because the cookie is
// HttpOnly.
async function isAdminAuthenticated() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data && data.role === 'admin');
  } catch (e) {
    return false;
  }
}

// Destroys the session on the server (clears the cookie) and returns to the
// login page. This is a real logout, not just a local flag reset: the
// session token itself is invalidated by the server-side cookie clear, so
// it can no longer be used even if it had been copied elsewhere.
async function logoutAdmin() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (e) {
    // Even if the network call fails, still send the user back to login;
    // the cookie will simply expire on its own (max 8 hours) if it
    // couldn't be cleared immediately.
  }
  redirectToLogin();
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
  const authenticated = await isAdminAuthenticated();

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
          // The server has already set the signed session cookie in its
          // response (Set-Cookie), so there is nothing further to store
          // client-side before moving on.
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
      logoutButton.addEventListener('click', async () => {
        await logoutAdmin();
      });
    }
  }

  loadIntegrationHelpers('admin').catch(() => {});
});

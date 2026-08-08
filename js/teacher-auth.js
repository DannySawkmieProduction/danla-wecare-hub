async function fetchClientConfig(){
  if(window.__WECARE_CONFIG) return window.__WECARE_CONFIG;
  try{
    const response = await fetch('/api/client-config');
    if(response.ok){
      const config = await response.json();
      window.__WECARE_CONFIG = config;
      return config;
    }
  }catch(e){}
  window.__WECARE_CONFIG = {};
  return window.__WECARE_CONFIG;
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
// teacher session (the signed, HttpOnly cookie issued by
// POST /api/auth/teacher after it verifies the Google ID token AND confirms
// the signed-in email exists in the D1 faculty table - see workers/d1-api.js
// and workers/auth.js). There is no client-readable "registered teacher"
// list or "authenticated" flag left in this file: the server is the only
// source of truth, and the cookie itself cannot be read or forged from
// JavaScript because it is HttpOnly.
async function isTeacherAuthenticated() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data && data.role === 'teacher');
  } catch (e) {
    return false;
  }
}

// Destroys the session on the server (clears the cookie) and returns to the
// login page.
async function logoutTeacher() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (e) {
    // Fall through to the redirect regardless; the cookie expires on its
    // own (max 8 hours) even if the clear request failed.
  }
  redirectToLogin();
}

function getCurrentPage() {
  // Cloudflare Pages serves static HTML with the .html extension stripped
  // from the URL by default (e.g. /teacher-login.html -> /teacher-login).
  // This normalizes the current path back to a canonical "<name>.html"
  // form so page-matching below works the same whether the browser shows
  // "/teacher-login" or "/teacher-login.html".
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
  window.location.replace('teacher-login.html');
}

function redirectToDashboard() {
  window.location.replace('teacher-dashboard.html');
}

function displayStatus(message, isError = false) {
  const statusText = document.getElementById('teacher-signin-status');
  if (!statusText) return;
  statusText.textContent = message;
  statusText.style.color = isError ? '#F87171' : '#c8d4e2';
}

function loadGoogleIdentityServices() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// Sends the Google ID token to the server for REAL verification
// (signature, issuer, audience, expiry - via workers/auth.js's
// verifyGoogleIdToken, which calls Google's tokeninfo endpoint) and checks
// against the D1 faculty table. The client never decides on its own whether
// a sign-in is valid or "registered" - it only ever reports what the server
// decided, via the response status:
//   200 -> session cookie issued, go to the dashboard
//   401 -> Google credential itself was invalid/expired
//   403 -> credential was valid but the email isn't a registered faculty member
//   5xx -> server-side misconfiguration
async function handleCredentialResponse(response) {
  try {
    const res = await fetch('/api/auth/teacher', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });

    if (res.status === 401) {
      displayStatus('Your Google sign-in could not be verified. Please try again.', true);
      return;
    }
    if (res.status === 403) {
      displayStatus('Your account has not yet been registered. Please contact the Administrator.', true);
      return;
    }
    if (!res.ok) {
      displayStatus('Sign-in is not available right now. Please try again later.', true);
      return;
    }

    redirectToDashboard();
  } catch (error) {
    displayStatus('Google sign-in failed. Please try again.', true);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchClientConfig();
  const page = getCurrentPage();
  const authenticated = await isTeacherAuthenticated();

  if (page === 'teacher-login.html') {
    if (authenticated) {
      redirectToDashboard();
      return;
    }

    const signinButton = document.getElementById('teacher-signin-button');
    if (!signinButton) {
      return;
    }

    const appConfig = await fetchClientConfig();
    const googleClientId = appConfig.TEACHER_GOOGLE_CLIENT_ID || '';
    if (!googleClientId) {
      displayStatus('Teacher Google sign-in is not configured.', true);
      return;
    }

    try {
      await loadGoogleIdentityServices();
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        ux_mode: 'popup'
      });
    } catch (error) {
      displayStatus('Unable to initialize Google sign-in.', true);
      return;
    }

    signinButton.addEventListener('click', () => {
      window.google.accounts.id.prompt();
    });
  }

  if (page === 'teacher-dashboard.html') {
    if (!authenticated) {
      redirectToLogin();
      return;
    }

    const logoutButton = document.getElementById('teacher-logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        await logoutTeacher();
      });
    }
  }

  loadIntegrationHelpers('teacher').catch(() => {});
});

const STUDENT_AUTH_KEY = 'danlaWeCare.studentAuthenticated';
const STUDENT_REGISTRATION_KEY = 'danlaWeCare.registeredStudents';

async function fetchClientConfig(){
  if(window.__WECARE_CONFIG) return window.__WECARE_CONFIG;
  try{
    const response = await fetch('/api/client-config');
    if(response.ok){
      const config = await response.json();
      window.__WECARE_CONFIG = config;
      if(config.UPLOAD_API_KEY){ window.__UPLOAD_API_KEY = config.UPLOAD_API_KEY; }
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

function setStudentAuthenticated(authenticated) {
  sessionStorage.setItem(STUDENT_AUTH_KEY, authenticated ? 'true' : 'false');
}

function isStudentAuthenticated() {
  return sessionStorage.getItem(STUDENT_AUTH_KEY) === 'true';
}

function getCurrentPage() {
  // Cloudflare Pages serves static HTML with the .html extension stripped
  // from the URL by default (e.g. /student-login.html -> /student-login).
  // This normalizes the current path back to a canonical "<name>.html"
  // form so page-matching below works the same whether the browser shows
  // "/student-login" or "/student-login.html".
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
  window.location.replace('student-login.html');
}

function redirectToDashboard() {
  window.location.replace('student-dashboard.html');
}

function displayStatus(message, isError = false) {
  const statusText = document.getElementById('student-signin-status');
  if (!statusText) return;
  statusText.textContent = message;
  statusText.style.color = isError ? '#F87171' : '#c8d4e2';
}

function getRegisteredStudents() {
  const raw = localStorage.getItem(STUDENT_REGISTRATION_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function isStudentRegistered(email) {
  const registered = getRegisteredStudents();
  return registered.includes(email.toLowerCase());
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

function handleCredentialResponse(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload?.email?.toLowerCase();
    if (!email) {
      displayStatus('Unable to read Google account details.', true);
      return;
    }

    if (!isStudentRegistered(email)) {
      setStudentAuthenticated(false);
      displayStatus('Your account has not yet been registered. Please contact the Administrator.', true);
      return;
    }

    setStudentAuthenticated(true);
    redirectToDashboard();
  } catch (error) {
    displayStatus('Google sign-in failed. Please try again.', true);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchClientConfig();
  const page = getCurrentPage();
  const authenticated = isStudentAuthenticated();

  if (page === 'student-login.html') {
    if (authenticated) {
      redirectToDashboard();
      return;
    }

    const signinButton = document.getElementById('student-signin-button');
    if (!signinButton) {
      return;
    }

    const appConfig = await fetchClientConfig();
    const googleClientId = appConfig.STUDENT_GOOGLE_CLIENT_ID || '';
    if (!googleClientId) {
      displayStatus('Student Google sign-in is not configured.', true);
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

  if (page === 'student-dashboard.html') {
    if (!authenticated) {
      redirectToLogin();
      return;
    }

    const logoutButton = document.getElementById('student-logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        setStudentAuthenticated(false);
        redirectToLogin();
      });
    }
  }

  loadIntegrationHelpers('student').catch(() => {});
});

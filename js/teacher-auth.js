const TEACHER_AUTH_KEY = 'danlaWeCare.teacherAuthenticated';
const TEACHER_REGISTRATION_KEY = 'danlaWeCare.registeredTeachers';

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

function setTeacherAuthenticated(authenticated) {
  sessionStorage.setItem(TEACHER_AUTH_KEY, authenticated ? 'true' : 'false');
}

function isTeacherAuthenticated() {
  return sessionStorage.getItem(TEACHER_AUTH_KEY) === 'true';
}

function getCurrentPage() {
  return window.location.pathname.split('/').pop();
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

function getRegisteredTeachers() {
  const raw = localStorage.getItem(TEACHER_REGISTRATION_KEY);
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

function isTeacherRegistered(email) {
  const registered = getRegisteredTeachers();
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

    if (!isTeacherRegistered(email)) {
      setTeacherAuthenticated(false);
      displayStatus('Your account has not yet been registered. Please contact the Administrator.', true);
      return;
    }

    setTeacherAuthenticated(true);
    redirectToDashboard();
  } catch (error) {
    displayStatus('Google sign-in failed. Please try again.', true);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchClientConfig();
  const page = getCurrentPage();
  const authenticated = isTeacherAuthenticated();

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
      logoutButton.addEventListener('click', () => {
        setTeacherAuthenticated(false);
        redirectToLogin();
      });
    }
  }

  loadIntegrationHelpers('teacher').catch(() => {});
});

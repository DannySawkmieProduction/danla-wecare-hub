// upload.js — client-side R2 upload helper with progress and preview
//
// Loaded as a plain (non-module) script via perf.js's lazy-loader, so these
// are ordinary global functions rather than ES module exports - matching
// every other browser-loaded script in this project. (workers/*.js are the
// only files in this project that use ES module import/export, because
// those run in the Workers runtime, which supports it natively; this file
// runs in the browser via a classic <script> tag.)
//
// Authorization: every request below relies on the browser automatically
// attaching the real, HttpOnly session cookie (see Phase 2/3) to same-origin
// requests. There is no client-supplied API key anymore - the old shared
// X-Api-Key model was removed because it was handed to every visitor,
// authenticated or not, via /api/client-config (see the Phase 0 and Phase 4
// audits). The server decides who may upload/download/delete a given file
// from the session alone.

function previewFile(file, onPreview) {
  const type = file.type;
  if (type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => onPreview({ type: 'image', src: reader.result, name: file.name });
    reader.readAsDataURL(file);
  } else if (type === 'application/pdf') {
    const url = URL.createObjectURL(file);
    onPreview({ type: 'pdf', src: url, name: file.name });
  } else {
    onPreview({ type: 'file', name: file.name });
  }
}

function uploadFile({ file, purpose = 'generic', onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/r2/upload', true);
    xhr.withCredentials = true; // send the session cookie on this cross-XHR request
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch (e) { resolve(xhr.responseText); }
      } else {
        reject({ status: xhr.status, body: xhr.responseText });
      }
    };
    xhr.onerror = () => reject({ status: xhr.status, body: xhr.responseText });
    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) onProgress((ev.loaded / ev.total) * 100); };
    }
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('purpose', purpose);
    xhr.send(fd);
  });
}

async function deleteFile(id) {
  const res = await fetch(`/api/r2/delete/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
  return res.json();
}

function replaceFile(id, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/r2/replace/${encodeURIComponent(id)}`, true);
    xhr.withCredentials = true;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(xhr);
    };
    xhr.onerror = () => reject(xhr);
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) onProgress((ev.loaded / ev.total) * 100); };
    }
    const fd = new FormData();
    fd.append('file', file, file.name);
    xhr.send(fd);
  });
}

async function getMetadata(id) {
  const res = await fetch(`/api/r2/meta/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
  return res.ok ? res.json() : null;
}

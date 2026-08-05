// upload.js — client-side R2 upload helper with progress and preview
export function previewFile(file, onPreview){ const type = file.type;
  if(type.startsWith('image/')){ const reader = new FileReader(); reader.onload = ()=> onPreview({ type:'image', src: reader.result, name: file.name }); reader.readAsDataURL(file); }
  else if(type === 'application/pdf'){ const url = URL.createObjectURL(file); onPreview({ type:'pdf', src: url, name: file.name }); }
  else { onPreview({ type:'file', name: file.name }); }
}

export function uploadFile({ file, purpose='generic', uploaderId='', onProgress }){
  return new Promise((resolve,reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open('POST','/api/r2/upload', true);
    const apiKey = window.__UPLOAD_API_KEY || null; if(apiKey) xhr.setRequestHeader('x-api-key', apiKey);
    xhr.onload = ()=>{
      if(xhr.status >=200 && xhr.status < 300){ try{ const json = JSON.parse(xhr.responseText); resolve(json); }catch(e){ resolve(xhr.responseText); } }
      else { reject({ status: xhr.status, body: xhr.responseText }); }
    };
    xhr.onerror = ()=> reject({ status: xhr.status, body: xhr.responseText });
    if(xhr.upload && typeof onProgress === 'function') xhr.upload.onprogress = (ev)=>{ if(ev.lengthComputable) onProgress( (ev.loaded/ev.total)*100 ); };
    const fd = new FormData(); fd.append('file', file, file.name); fd.append('purpose', purpose); if(uploaderId) fd.append('uploader_id', uploaderId);
    xhr.send(fd);
  });
}

export async function deleteFile(id){ const apiKey = window.__UPLOAD_API_KEY || null; const res = await fetch(`/api/r2/delete/${encodeURIComponent(id)}`, { method:'DELETE', headers: apiKey? { 'x-api-key': apiKey } : {} }); return res.json(); }

export async function replaceFile(id, file, onProgress){ const apiKey = window.__UPLOAD_API_KEY || null; return new Promise((resolve,reject)=>{ const xhr = new XMLHttpRequest(); xhr.open('POST', `/api/r2/replace/${encodeURIComponent(id)}`, true); if(apiKey) xhr.setRequestHeader('x-api-key', apiKey); xhr.onload = ()=>{ if(xhr.status>=200 && xhr.status<300) resolve(JSON.parse(xhr.responseText)); else reject(xhr); }; xhr.onerror=()=>reject(xhr); if(xhr.upload && onProgress) xhr.upload.onprogress = (ev)=>{ if(ev.lengthComputable) onProgress((ev.loaded/ev.total)*100); }; const fd = new FormData(); fd.append('file', file, file.name); xhr.send(fd); }); }

export async function getMetadata(id){ const res = await fetch(`/api/r2/meta/${encodeURIComponent(id)}`); return res.ok ? res.json() : null; }

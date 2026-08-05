const NOTICE_STORAGE_KEY = 'danlaWeCare.notices';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';

function getNotices(){ const raw = localStorage.getItem(NOTICE_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveNotices(arr){ localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(arr)); }
function getDepartments(){ const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDate(ts){ return ts? new Date(ts).toLocaleString() : '-'; }

function computeStatus(item){ const now = Date.now(); if(item.status==='Published' && item.expiryDate){ const exp = new Date(item.expiryDate).setHours(23,59,59,999); if(now > exp) return 'Expired'; }
  return item.status || 'Draft'; }

function createNoticeCard(n){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = n.id; const st = computeStatus(n); const statusClass = st==='Published'? 'status-active' : (st==='Expired'? 'status-inactive' : 'status-inactive'); const pinClass = n.pinned? 'pin-active' : '';
  card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${n.category || 'General'} • ${n.audience || 'All'}</p>
      <h3>${n.title}</h3>
    </div>
    <span class="status-pill ${statusClass}">${st}</span>
  </div>
  <p class="class-description">Priority: ${n.priority || 'Normal'} • Dept: ${n.department || '-'} • Publish: ${n.publishDate || '-'}</p>
  <div class="class-details">
    <span>Expiry: ${n.expiryDate || '-'}</span>
    <span>Attachment: ${n.attachment || '-'}</span>
    <span>Pinned: ${n.pinned? 'Yes':'No'}</span>
    <span>Created: ${formatDate(n.createdAt)}</span>
  </div>
  <div class="department-actions">
    <button class="button button-secondary view-notice">View</button>
    <button class="button button-secondary edit-notice">Edit</button>
    <button class="button button-secondary delete-notice">Delete</button>
    <button class="button button-secondary pin-notice ${pinClass}">${n.pinned? 'Unpin':'Pin'}</button>
  </div>
`;
  return card; }

function renderNoticeList(items){ const list = document.getElementById('notice-list'); list.innerHTML=''; if(items.length===0){ list.innerHTML = '<p class="empty-state">No notices found.</p>'; return; } items.forEach(i=> list.appendChild(createNoticeCard(i))); }

function buildFilterOptions(){ const deps = getDepartments(); const depSel = document.getElementById('notice-filter-dept'); if(depSel) depSel.innerHTML = '<option value="">All Departments</option>' + deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''); }

function getSearchQuery(){ return document.getElementById('notice-search')?.value.trim().toLowerCase() || ''; }

function filterNotices(all){ const category = document.getElementById('notice-filter-category')?.value || ''; const audience = document.getElementById('notice-filter-audience')?.value || ''; const dept = document.getElementById('notice-filter-dept')?.value || ''; const priority = document.getElementById('notice-filter-priority')?.value || ''; const status = document.getElementById('notice-filter-status')?.value || ''; const q = getSearchQuery(); let res = all.slice(); if(category) res = res.filter(r=> r.category===category); if(audience) res = res.filter(r=> r.audience===audience); if(dept) res = res.filter(r=> r.department===dept); if(priority) res = res.filter(r=> r.priority===priority); if(status) res = res.filter(r=> computeStatus(r)===status); if(q) res = res.filter(r=> [r.title,r.description,r.category].some(v=> (v||'').toString().toLowerCase().includes(q))); res.sort((a,b)=>{ if(a.pinned && !b.pinned) return -1; if(!a.pinned && b.pinned) return 1; return b.createdAt - a.createdAt; }); return res; }

function openNoticeForm(item=null){ const deps = getDepartments(); const depOptions = deps.length? deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join('') : '<option value="">No departments</option>';
  const html = `
    <form id="notice-form" class="modal-form">
      <h2>${item? 'Edit Notice':'New Notice'}</h2>

      <label for="notice-title">Title</label>
      <input id="notice-title" type="text" value="${item?.title||''}" required>

      <label for="notice-category">Category</label>
      <input id="notice-category" type="text" value="${item?.category||''}">

      <label for="notice-audience">Audience</label>
      <select id="notice-audience"><option value="All">All</option><option value="Teachers">Teachers</option><option value="Students">Students</option><option value="Department">Department</option></select>

      <label for="notice-dept">Department (if Audience=Department)</label>
      <select id="notice-dept"><option value="">Select department</option>${depOptions}</select>

      <label for="notice-priority">Priority</label>
      <select id="notice-priority"><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></select>

      <label for="notice-desc">Description</label>
      <textarea id="notice-desc">${item?.description||''}</textarea>

      <label for="notice-attachment">Attachment (placeholder filename)</label>
      <input id="notice-attachment" type="text" placeholder="filename.pdf" value="${item?.attachment||''}">

      <label for="notice-publish">Publish Date</label>
      <input id="notice-publish" type="date" value="${item?.publishDate||''}">

      <label for="notice-expiry">Expiry Date</label>
      <input id="notice-expiry" type="date" value="${item?.expiryDate||''}">

      <label for="notice-status">Status</label>
      <select id="notice-status"><option value="Draft" ${item?.status==='Draft'?'selected':''}>Draft</option><option value="Published" ${item?.status==='Published'?'selected':''}>Published</option></select>

      <label for="notice-pin">Pin Notice</label>
      <select id="notice-pin"><option value="false">No</option><option value="true">Yes</option></select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-notice">Cancel</button>
        <button class="button button-primary" type="submit">${item? 'Save changes':'Create notice'}</button>
      </div>
    </form>
  `;
  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card">${html}</div>`; document.body.appendChild(modal);
  if(item){ document.getElementById('notice-audience').value = item.audience || 'All'; document.getElementById('notice-dept').value = item.department || ''; document.getElementById('notice-priority').value = item.priority || 'Normal'; document.getElementById('notice-pin').value = item.pinned? 'true':'false'; }
  document.getElementById('cancel-notice')?.addEventListener('click', ()=> document.body.removeChild(modal));
  document.getElementById('notice-form')?.addEventListener('submit', (ev)=>{ ev.preventDefault(); saveNotice(item?.id); document.body.removeChild(modal); });
}

function saveNotice(existingId=null){ const items = getNotices(); const title = document.getElementById('notice-title').value.trim(); const category = document.getElementById('notice-category').value.trim() || 'General'; const audience = document.getElementById('notice-audience').value; const department = document.getElementById('notice-dept').value; const priority = document.getElementById('notice-priority').value; const description = document.getElementById('notice-desc').value.trim(); const attachment = document.getElementById('notice-attachment').value.trim(); const publishDate = document.getElementById('notice-publish').value; const expiryDate = document.getElementById('notice-expiry').value; const status = document.getElementById('notice-status').value; const pinned = document.getElementById('notice-pin').value === 'true'; const timestamp = Date.now();
  if(!title){ alert('Please provide a title.'); return; }
  // prevent duplicate title for same department & audience
  const duplicate = items.find(i=> i.title===title && i.department===department && i.audience===audience && i.id !== existingId);
  if(duplicate){ alert('A notice with the same title, audience and department already exists.'); return; }
  const base = { title, category, audience, department, priority, description, attachment, publishDate, expiryDate, status, pinned };
  if(existingId){ const updated = items.map(i=> i.id===existingId? { ...i, ...base, updatedAt: timestamp } : i); saveNotices(updated); renderNoticeList(filterNotices(updated)); buildStats(updated); return; }
  const newItem = { id:`notice-${timestamp}-${Math.random().toString(36).slice(2,6)}`, ...base, downloads:0, createdAt: timestamp, updatedAt: timestamp };
  items.unshift(newItem); saveNotices(items); renderNoticeList(filterNotices(items)); buildStats(items);
}

function removeNotice(id){ if(!confirm('Delete this notice? This cannot be undone.')) return; const items = getNotices(); const updated = items.filter(i=> i.id !== id); saveNotices(updated); renderNoticeList(filterNotices(updated)); buildStats(updated); }

function viewNotice(id){ const item = getNotices().find(i=> i.id===id); if(!item) return; const st = computeStatus(item); let html = `<div class="modal-overlay"><div class="modal-card"><h2>${item.title}</h2><p><strong>Category:</strong> ${item.category} • <strong>Audience:</strong> ${item.audience}</p><p>${item.description||''}</p><ul><li><strong>Department:</strong> ${item.department||'-'}</li><li><strong>Priority:</strong> ${item.priority||'Normal'}</li><li><strong>Publish:</strong> ${item.publishDate||'-'}</li><li><strong>Expiry:</strong> ${item.expiryDate||'-'}</li><li><strong>Status:</strong> ${st}</li><li><strong>Pinned:</strong> ${item.pinned? 'Yes':'No'}</li></ul><div style="margin-top:0.5rem">`;
  if(item.attachment) html += `<button class="button button-secondary" id="download-notice">Download Attachment (placeholder)</button>`;
  html += `</div><div class="modal-actions"><button class="button button-secondary" id="close-notice-view">Close</button></div></div></div>`;
  const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild);
  document.getElementById('close-notice-view')?.addEventListener('click', ()=> document.querySelector('.modal-overlay')?.remove());
  document.getElementById('download-notice')?.addEventListener('click', ()=>{ const items = getNotices(); const it = items.find(x=> x.id===id); if(it){ it.downloads = (it.downloads||0) + 1; saveNotices(items); buildStats(items); alert('Download placeholder: attachment would be served from Cloudflare R2 in production.'); } });
}

function pinNotice(id){ const items = getNotices(); const it = items.find(i=> i.id===id); if(!it) return; it.pinned = !it.pinned; saveNotices(items); renderNoticeList(filterNotices(items)); }

function bindNoticeActions(){ const list = document.getElementById('notice-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-notice')){ const it = getNotices().find(x=> x.id===id); openNoticeForm(it); } if(target.classList.contains('delete-notice')){ removeNotice(id); } if(target.classList.contains('view-notice')){ viewNotice(id); } if(target.classList.contains('pin-notice')){ pinNotice(id); } }); }

function buildStats(items){ const wrap = document.getElementById('notices-stats'); wrap.innerHTML = ''; const total = items.length; const published = items.filter(i=> computeStatus(i)==='Published').length; const draft = items.filter(i=> i.status==='Draft').length; const expired = items.filter(i=> computeStatus(i)==='Expired').length; const pinned = items.filter(i=> i.pinned).length;
  const cards = [];
  cards.push(`<div class="dashboard-card"><h4>Total Notices</h4><p>${total}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Published</h4><p>${published}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Draft</h4><p>${draft}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Expired</h4><p>${expired}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Pinned</h4><p>${pinned}</p></div>`);
  wrap.innerHTML = cards.join(''); }

function initializeNotices(){ const newBtn = document.getElementById('new-notice-button'); const search = document.getElementById('notice-search'); const filterCat = document.getElementById('notice-filter-category'); const filterAud = document.getElementById('notice-filter-audience'); const filterDept = document.getElementById('notice-filter-dept'); const filterPri = document.getElementById('notice-filter-priority'); const filterStatus = document.getElementById('notice-filter-status'); const logout = document.getElementById('admin-logout-button');
  newBtn?.addEventListener('click', ()=> openNoticeForm()); search?.addEventListener('input', ()=> renderNoticeList(filterNotices(getNotices()))); filterCat?.addEventListener('change', ()=> renderNoticeList(filterNotices(getNotices()))); filterAud?.addEventListener('change', ()=> renderNoticeList(filterNotices(getNotices()))); filterDept?.addEventListener('change', ()=> renderNoticeList(filterNotices(getNotices()))); filterPri?.addEventListener('change', ()=> renderNoticeList(filterNotices(getNotices()))); filterStatus?.addEventListener('change', ()=> renderNoticeList(filterNotices(getNotices())));
  logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); });

  buildFilterOptions(); const items = getNotices(); renderNoticeList(filterNotices(items)); bindNoticeActions(); buildStats(items);
}

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeNotices(); });

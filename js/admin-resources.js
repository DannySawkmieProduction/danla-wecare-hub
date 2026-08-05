const RES_STORAGE_KEY = 'danlaWeCare.resources';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';

function getResources(){ const raw = localStorage.getItem(RES_STORAGE_KEY); if(!raw) return []; try{ const p = JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveResources(arr){ localStorage.setItem(RES_STORAGE_KEY, JSON.stringify(arr)); }
function getDepartments(){ const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ const raw = localStorage.getItem(CLASS_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ const raw = localStorage.getItem(SUBJECT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ const raw = localStorage.getItem(FACULTY_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDate(ts){ return ts? new Date(ts).toLocaleString() : '-'; }

function createResourceCard(r){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = r.id; const statusClass = r.status==='Published'? 'status-active' : 'status-inactive'; card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${r.type} • ${r.academicYear || ''} ${r.semester? '• '+r.semester : ''}</p>
      <h3>${r.topic || r.title}</h3>
    </div>
    <span class="status-pill ${statusClass}">${r.status}</span>
  </div>
  <p class="class-description">Subject: ${r.subject || '-'} • Dept: ${r.department || '-'} • Faculty: ${r.facultyName || '-'}</p>
  <div class="class-details">
    <span>Type: ${r.type}</span>
    <span>Published: ${r.publishedDate || '-'}</span>
    <span>Downloads: ${r.downloads || 0}</span>
    <span>Created: ${formatDate(r.createdAt)}</span>
  </div>
  <div class="department-actions">
    <button class="button button-secondary view-resource">View</button>
    <button class="button button-secondary edit-resource">Edit</button>
    <button class="button button-secondary delete-resource">Delete</button>
  </div>
`;
  return card; }

function renderResourceList(items){ const list = document.getElementById('resource-list'); list.innerHTML=''; if(items.length===0){ list.innerHTML = '<p class="empty-state">No resources found.</p>'; return; } items.forEach(i=> list.appendChild(createResourceCard(i))); }

function buildFilterOptions(){ const deps = getDepartments(); const classes = getClasses(); const depSel = document.getElementById('resource-filter-dept'); const classSel = document.getElementById('resource-filter-class'); if(depSel) depSel.innerHTML = '<option value="">All Departments</option>' + deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''); if(classSel) classSel.innerHTML = '<option value="">All Classes</option>' + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join(''); }

function getSearchQuery(){ return document.getElementById('resource-search')?.value.trim().toLowerCase() || ''; }

function filterResources(all){ const type = document.getElementById('resource-filter-type')?.value || ''; const dept = document.getElementById('resource-filter-dept')?.value || ''; const cls = document.getElementById('resource-filter-class')?.value || ''; const status = document.getElementById('resource-filter-status')?.value || ''; const q = getSearchQuery(); let res = all.slice(); if(type) res = res.filter(r=> r.type===type); if(dept) res = res.filter(r=> r.department===dept); if(cls) res = res.filter(r=> r.className===cls); if(status) res = res.filter(r=> r.status===status); if(q) res = res.filter(r=> [r.title,r.topic,r.description,r.subject,r.facultyName].some(v=> (v||'').toString().toLowerCase().includes(q))); res.sort((a,b)=> b.createdAt - a.createdAt); return res; }

function openResourceForm(item=null){ const deps = getDepartments(); const classes = getClasses(); const subjects = getSubjects(); const faculty = getFaculty(); const depOptions = deps.length? deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join('') : '<option value="">No departments</option>'; const classOptions = classes.length? classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('') : '<option value="">No classes</option>'; const subjectOptions = subjects.length? subjects.map(s=>`<option value="${s.name}">${s.name}</option>`).join('') : '<option value="">No subjects</option>'; const facultyOptions = faculty.length? faculty.map(f=>`<option value="${f.id}">${f.name}</option>`).join('') : '<option value="">No faculty</option>';

  const html = `
    <form id="resource-form" class="modal-form">
      <h2>${item? 'Edit Resource':'New Resource'}</h2>

      <label for="res-type">Type</label>
      <select id="res-type"><option value="Notes">Notes</option><option value="PDF">PDF</option><option value="PPT">PPT</option><option value="DOC">DOC/DOCX</option><option value="Video">Video Link</option><option value="External">External Link</option></select>

      <label for="res-acad">Academic Year</label>
      <input id="res-acad" type="text" value="${item?.academicYear||''}">

      <label for="res-sem">Semester</label>
      <input id="res-sem" type="text" value="${item?.semester||''}">

      <label for="res-dept">Department</label>
      <select id="res-dept"><option value="">Select department</option>${depOptions}</select>

      <label for="res-class">Class</label>
      <select id="res-class"><option value="">Select class</option>${classOptions}</select>

      <label for="res-subject">Subject</label>
      <select id="res-subject"><option value="">Select subject</option>${subjectOptions}</select>

      <label for="res-faculty">Faculty</label>
      <select id="res-faculty"><option value="">Select faculty</option>${facultyOptions}</select>

      <label for="res-topic">Topic / Title</label>
      <input id="res-topic" type="text" value="${item?.topic||''}" required>

      <label for="res-desc">Description</label>
      <textarea id="res-desc">${item?.description||''}</textarea>

      <label for="res-link">Video / External Link (for Video or External types)</label>
      <input id="res-link" type="url" placeholder="https://..." value="${item?.link||''}">

      <label for="res-file">File (placeholder filename for future upload)</label>
      <input id="res-file" type="text" placeholder="filename.pdf" value="${item?.file||''}">

      <label for="res-pub">Published Date</label>
      <input id="res-pub" type="date" value="${item?.publishedDate||''}">

      <label for="res-status">Status</label>
      <select id="res-status"><option value="Draft" ${item?.status==='Draft'?'selected':''}>Draft</option><option value="Published" ${item?.status==='Published'?'selected':''}>Published</option></select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-resource">Cancel</button>
        <button class="button button-primary" type="submit">${item? 'Save changes':'Create resource'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card">${html}</div>`; document.body.appendChild(modal);
  if(item){ document.getElementById('res-type').value = item.type || 'Notes'; document.getElementById('res-dept').value = item.department || ''; document.getElementById('res-class').value = item.className || ''; document.getElementById('res-subject').value = item.subject || ''; document.getElementById('res-faculty').value = item.facultyId || ''; }
  document.getElementById('cancel-resource')?.addEventListener('click', ()=> document.body.removeChild(modal));
  document.getElementById('resource-form')?.addEventListener('submit', (ev)=>{ ev.preventDefault(); saveResource(item?.id); document.body.removeChild(modal); });
}

function saveResource(existingId=null){ const items = getResources(); const type = document.getElementById('res-type').value; const academicYear = document.getElementById('res-acad').value.trim(); const semester = document.getElementById('res-sem').value.trim(); const department = document.getElementById('res-dept').value; const className = document.getElementById('res-class').value; const subject = document.getElementById('res-subject').value; const facultyId = document.getElementById('res-faculty').value; const faculty = getFaculty().find(f=> f.id===facultyId); const topic = document.getElementById('res-topic').value.trim(); const description = document.getElementById('res-desc').value.trim(); const link = document.getElementById('res-link').value.trim(); const file = document.getElementById('res-file').value.trim(); const publishedDate = document.getElementById('res-pub').value; const status = document.getElementById('res-status').value; const timestamp = Date.now();
  if(!topic){ alert('Please provide a topic/title for the resource.'); return; }

  // prevent duplicates: same topic+class+subject+type
  const duplicate = items.find(i=> i.topic===topic && i.className===className && i.subject===subject && i.type===type && i.id !== existingId);
  if(duplicate){ alert('A resource with the same topic, class, subject and type already exists.'); return; }

  const base = { type, academicYear, semester, department, className, subject, facultyId, facultyName: faculty? faculty.name:'', topic, title: topic, description, link, file, publishedDate, status };

  if(existingId){ const updated = items.map(i=> i.id===existingId? { ...i, ...base, updatedAt: timestamp } : i); saveResources(updated); renderResourceList(filterResources(updated)); buildStats(updated); return; }

  const newItem = { id:`res-${timestamp}-${Math.random().toString(36).slice(2,6)}`, downloads:0, ...base, createdAt: timestamp, updatedAt: timestamp };
  items.unshift(newItem); saveResources(items); renderResourceList(filterResources(items)); buildStats(items);
}

function removeResource(id){ if(!confirm('Delete this resource? This cannot be undone.')) return; const items = getResources(); const updated = items.filter(i=> i.id !== id); saveResources(updated); renderResourceList(filterResources(updated)); buildStats(updated); }

function viewResource(id){ const item = getResources().find(i=> i.id===id); if(!item) return; let html = `<div class="modal-overlay"><div class="modal-card"><h2>${item.topic}</h2><p><strong>Type:</strong> ${item.type} • <strong>Status:</strong> ${item.status}</p><p>${item.description||''}</p><ul><li><strong>Department:</strong> ${item.department||'-'}</li><li><strong>Class:</strong> ${item.className||'-'}</li><li><strong>Subject:</strong> ${item.subject||'-'}</li><li><strong>Faculty:</strong> ${item.facultyName||'-'}</li><li><strong>Published:</strong> ${item.publishedDate||'-'}</li><li><strong>Academic Year:</strong> ${item.academicYear||'-'}</li><li><strong>Semester:</strong> ${item.semester||'-'}</li></ul><div style="margin-top:0.5rem">`;
  if(item.type==='Video' || item.type==='External'){ if(item.link) html += `<a class="button button-primary" href="${item.link}" target="_blank">Open Link</a>`; }
  if(item.file) html += `<button class="button button-secondary" id="download-resource">Download (placeholder)</button>`;
  html += `</div><div class="modal-actions"><button class="button button-secondary" id="close-resource-view">Close</button></div></div></div>`;
  const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild);
  document.getElementById('close-resource-view')?.addEventListener('click', ()=> document.querySelector('.modal-overlay')?.remove());
  document.getElementById('download-resource')?.addEventListener('click', ()=>{ // increment downloads and show placeholder
    const items = getResources(); const it = items.find(x=> x.id===id); if(it){ it.downloads = (it.downloads||0) + 1; saveResources(items); buildStats(items); alert('Download placeholder: file would be served from Cloudflare R2 in production.'); }
  });
}

function bindResourceActions(){ const list = document.getElementById('resource-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-resource')){ const it = getResources().find(x=> x.id===id); openResourceForm(it); } if(target.classList.contains('delete-resource')){ removeResource(id); } if(target.classList.contains('view-resource')){ viewResource(id); } }); }

function buildStats(items){ const wrap = document.getElementById('resources-stats'); wrap.innerHTML = ''; const total = items.length; const published = items.filter(i=> i.status==='Published').length; const types = {}; const byDept = {};
  items.forEach(i=>{ types[i.type] = (types[i.type]||0)+1; byDept[i.department||'Unassigned'] = (byDept[i.department||'Unassigned']||0)+1; });
  const cards = [];
  cards.push(`<div class="dashboard-card"><h4>Total Resources</h4><p>${total}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Published</h4><p>${published}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>Types</h4><p>${Object.entries(types).map(t=>`${t[0]}: ${t[1]}`).join('<br>')||'-'}</p></div>`);
  cards.push(`<div class="dashboard-card"><h4>By Department</h4><p>${Object.entries(byDept).map(d=>`${d[0]}: ${d[1]}`).join('<br>')||'-'}</p></div>`);
  wrap.innerHTML = cards.join(''); }

// CSV helper (simple) — reuse assignment header escaping style
const RES_HEADER = ['id','type','academicYear','semester','department','className','subject','facultyId','facultyName','topic','title','description','link','file','publishedDate','status','downloads','createdAt','updatedAt'];
function escapeCsv(val){ return `"${(val===undefined||val===null?'':String(val)).replace(/"/g,'""')}"`; }

function exportResourcesCSV(){ const rows = filterResources(getResources()); if(rows.length===0){ alert('No resources to export.'); return; } const lines=[RES_HEADER.join(',')]; rows.forEach(r=>{ const vals = RES_HEADER.map(h=> escapeCsv(r[h])); lines.push(vals.join(',')); }); const blob=new Blob([lines.join('\n')], {type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`resources-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function importResourcesCSVFile(file){ if(!file) return; const reader=new FileReader(); reader.onload = e=>{ const text = e.target.result; const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<2){ alert('CSV has no data rows.'); return; } const header = parseCSVLine(lines[0]).map(h=>h.trim()); const missing = RES_HEADER.filter(h=> !header.includes(h)); if(missing.length>0){ alert('CSV missing required columns: ' + missing.join(', ')); return; } const validRows=[]; const errors=[]; const existing = getResources(); for(let i=1;i<lines.length;i++){ const cols = parseCSVLine(lines[i]); if(cols.length===0) continue; const obj={}; header.forEach((h,idx)=> obj[h]= (cols[idx]||'').trim() ); if(!obj.topic) errors.push(`Row ${i+1}: Missing topic`); else { const dup = existing.find(x=> x.topic===obj.topic && x.className===obj.className && x.subject===obj.subject && x.type===obj.type); if(dup) errors.push(`Row ${i+1}: Duplicate existing resource`); else validRows.push(obj); } }
  if(validRows.length===0){ alert('No valid rows to import.'); return; }
  validRows.forEach(r=>{ const ts = Date.now(); const base = { id: r.id || `res-${ts}-${Math.random().toString(36).slice(2,6)}`, type: r.type||'Notes', academicYear: r.academicYear||'', semester: r.semester||'', department: r.department||'', className: r.className||'', subject: r.subject||'', facultyId: r.facultyId||'', facultyName: r.facultyName||'', topic: r.topic||r.title||'', title: r.title||r.topic||'', description: r.description||'', link: r.link||'', file: r.file||'', publishedDate: r.publishedDate||'', status: r.status||'Draft', downloads: Number(r.downloads)||0, createdAt: r.createdAt?Number(r.createdAt):ts, updatedAt: r.updatedAt?Number(r.updatedAt):ts }; const items = getResources(); items.unshift(base); saveResources(items); }); renderResourceList(filterResources(getResources())); buildStats(getResources()); alert('Imported ' + validRows.length + ' resources.'); };
  reader.readAsText(file);
}

function parseCSVLine(line){ const out=[]; let cur=''; let inQuotes=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(inQuotes && line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes = !inQuotes; } } else if(ch===',' && !inQuotes){ out.push(cur); cur=''; } else { cur+=ch; } } out.push(cur); return out; }

function initializeResources(){ const newBtn = document.getElementById('new-resource-button'); const search = document.getElementById('resource-search'); const filterType = document.getElementById('resource-filter-type'); const filterDept = document.getElementById('resource-filter-dept'); const filterClass = document.getElementById('resource-filter-class'); const filterStatus = document.getElementById('resource-filter-status'); const exportBtn = document.getElementById('export-resources'); const importInput = document.getElementById('import-resources-input'); const logout = document.getElementById('admin-logout-button');
  newBtn?.addEventListener('click', ()=> openResourceForm()); search?.addEventListener('input', ()=> renderResourceList(filterResources(getResources()))); filterType?.addEventListener('change', ()=> renderResourceList(filterResources(getResources()))); filterDept?.addEventListener('change', ()=> renderResourceList(filterResources(getResources()))); filterClass?.addEventListener('change', ()=> renderResourceList(filterResources(getResources()))); filterStatus?.addEventListener('change', ()=> renderResourceList(filterResources(getResources())));
  exportBtn?.addEventListener('click', exportResourcesCSV); importInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(f) importResourcesCSVFile(f); importInput.value=''; });
  logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); });

  buildFilterOptions(); const items = getResources(); renderResourceList(filterResources(items)); bindResourceActions(); buildStats(items);
}

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeResources(); });

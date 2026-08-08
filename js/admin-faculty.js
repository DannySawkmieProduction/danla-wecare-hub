const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';

function getFaculty() {
  const raw = localStorage.getItem(FACULTY_STORAGE_KEY);
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
}

function saveFaculty(list) { localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(list)); }

function getDepartments() { const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY); if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; } }
function getSubjects() { const raw = localStorage.getItem(SUBJECT_STORAGE_KEY); if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; } }

function formatDateTime(timestamp){ return new Date(timestamp).toLocaleString([], { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }

function createFacultyCard(f){
  const card = document.createElement('article');
  card.className = 'subject-card';
  card.dataset.id = f.id;

  const assigned = Array.isArray(f.assignedSubjects) ? f.assignedSubjects.join(', ') : (f.assignedSubjects || 'None');

  card.innerHTML = `
    <div class="subject-card-header">
      <div>
        <p class="eyebrow">${f.employeeId || ''}</p>
        <h3>${f.name}</h3>
      </div>
      <span class="status-pill ${f.status === 'Active' ? 'status-active' : 'status-inactive'}">${f.status}</span>
    </div>
    <p class="subject-description">${f.email || 'No email provided.'}</p>
    <div class="subject-details">
      <span>Department: ${f.department || 'Unassigned'}</span>
      <span>Designation: ${f.designation || 'N/A'}</span>
      <span>Phone: ${f.phone || 'N/A'}</span>
      <span>Qualification: ${f.qualification || 'N/A'}</span>
      <span>Joining: ${f.joiningDate || 'N/A'}</span>
      <span>Subjects: ${assigned}</span>
      <span>Created: ${formatDateTime(f.createdAt)}</span>
      <span>Updated: ${formatDateTime(f.updatedAt)}</span>
    </div>
    <div class="subject-actions">
      <button class="button button-secondary edit-faculty">Edit</button>
      <button class="button button-secondary delete-faculty">Delete</button>
    </div>
  `;

  return card;
}

function renderFacultyList(list){ const el = document.getElementById('faculty-list'); el.innerHTML=''; if(list.length===0){ el.innerHTML='<p class="empty-state">No faculty records yet.</p>'; return; } list.forEach(i=>el.appendChild(createFacultyCard(i))); }

function getSearchQuery(){ const input = document.getElementById('faculty-search-input'); return input?.value.trim().toLowerCase() || ''; }

function filterFaculty(list){ const q = getSearchQuery(); if(!q) return list; return list.filter(f=>{ return [f.name,f.employeeId,f.email,f.department,f.designation,f.phone,f.qualification,f.joiningDate,f.status].some(v=>v?.toString().toLowerCase().includes(q)); }); }

function buildDepartmentOptions(depts){ if(depts.length===0) return '<option value="">No departments available</option>'; return depts.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''); }
function buildSubjectCheckboxes(subjects, selected=[]){ if(subjects.length===0) return '<p>No subjects available</p>'; return subjects.map(s=>`<label style="display:block"><input type="checkbox" value="${s.name}" ${selected.includes(s.name)?'checked':''}> ${s.name}</label>`).join(''); }

function openFacultyForm(f=null){ const depts = getDepartments(); const subjects = getSubjects(); const deptOptions = buildDepartmentOptions(depts); const selected = f?.assignedSubjects || [];

  const formHtml = `
    <form id="faculty-form" class="modal-form">
      <h2>${f? 'Edit Faculty':'New Faculty'}</h2>

      <label for="faculty-name">Full name</label>
      <input id="faculty-name" name="faculty-name" type="text" value="${f?.name||''}" required>

      <label for="faculty-employee">Employee ID</label>
      <input id="faculty-employee" name="faculty-employee" type="text" value="${f?.employeeId||''}" required>

      <label for="faculty-email">Email</label>
      <input id="faculty-email" name="faculty-email" type="email" value="${f?.email||''}">

      <label for="faculty-phone">Phone</label>
      <input id="faculty-phone" name="faculty-phone" type="tel" value="${f?.phone||''}">

      <label for="faculty-department">Department</label>
      <select id="faculty-department" name="faculty-department">
        <option value="">Select a department</option>
        ${deptOptions}
      </select>

      <label for="faculty-designation">Designation</label>
      <input id="faculty-designation" name="faculty-designation" type="text" value="${f?.designation||''}">

      <label for="faculty-qualification">Qualification</label>
      <input id="faculty-qualification" name="faculty-qualification" type="text" value="${f?.qualification||''}">

      <label for="faculty-joining">Joining Date</label>
      <input id="faculty-joining" name="faculty-joining" type="date" value="${f?.joiningDate||''}">

      <label>Assigned Subjects</label>
      <div id="faculty-subjects-list" style="max-height:10rem;overflow:auto;padding:0.5rem;border-radius:0.5rem;background:rgba(255,255,255,0.02);">${buildSubjectCheckboxes(subjects, selected)}</div>

      <label for="faculty-status">Status</label>
      <select id="faculty-status" name="faculty-status">
        <option value="Active" ${f?.status==='Active'?'selected':''}>Active</option>
        <option value="Inactive" ${f?.status==='Inactive'?'selected':''}>Inactive</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-faculty">Cancel</button>
        <button class="button button-primary" type="submit">${f? 'Save changes':'Create faculty'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML=`<div class="modal-card">${formHtml}</div>`; document.body.appendChild(modal);

  if(f?.department) document.getElementById('faculty-department').value = f.department;

  document.getElementById('cancel-faculty')?.addEventListener('click', ()=>{ document.body.removeChild(modal); });

  const form = document.getElementById('faculty-form');
  form.addEventListener('submit', e=>{ e.preventDefault(); saveFacultyRecord(f?.id); document.body.removeChild(modal); });
}

function saveFacultyRecord(existingId=null){ const list = getFaculty(); const name = document.getElementById('faculty-name').value.trim(); const employeeId = document.getElementById('faculty-employee').value.trim(); const email = document.getElementById('faculty-email').value.trim(); const phone = document.getElementById('faculty-phone').value.trim(); const department = document.getElementById('faculty-department').value; const designation = document.getElementById('faculty-designation').value.trim(); const qualification = document.getElementById('faculty-qualification').value.trim(); const joiningDate = document.getElementById('faculty-joining').value; const status = document.getElementById('faculty-status').value; const ts = Date.now();

  const subjectNodes = Array.from(document.querySelectorAll('#faculty-subjects-list input[type="checkbox"]:checked'));
  const assigned = subjectNodes.map(n=>n.value);

  if(!name || !employeeId) return;

  if(existingId){ const updated = list.map(rec=>{ if(rec.id!==existingId) return rec; return {...rec, name, employeeId, email, phone, department, designation, qualification, joiningDate, status, assignedSubjects: assigned, updatedAt: ts}; }); saveFaculty(updated); renderFacultyList(filterFaculty(updated)); return; }

  const newRec = { id:`fac-${ts}`, name, employeeId, email, phone, department, designation, qualification, joiningDate, status, assignedSubjects: assigned, createdAt: ts, updatedAt: ts };
  list.unshift(newRec); saveFaculty(list); renderFacultyList(filterFaculty(list)); }

function removeFaculty(id){ const list = getFaculty(); const updated = list.filter(i=>i.id!==id); saveFaculty(updated); renderFacultyList(filterFaculty(updated)); }
function confirmDelete(id){ if(confirm('Delete this faculty record? This action cannot be undone.')) removeFaculty(id); }

function bindFacultyActions(){ const list = document.getElementById('faculty-list'); list.addEventListener('click', e=>{ const target=e.target; const card = target.closest('.subject-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-faculty')){ const rec = getFaculty().find(r=>r.id===id); openFacultyForm(rec); } if(target.classList.contains('delete-faculty')){ confirmDelete(id); } }); }

function initializeFaculty(){ const newBtn=document.getElementById('new-faculty-button'); const search=document.getElementById('faculty-search-input'); const logout=document.getElementById('admin-logout-button'); newBtn?.addEventListener('click', ()=>openFacultyForm()); search?.addEventListener('input', ()=>renderFacultyList(filterFaculty(getFaculty()))); logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); }); bindFacultyActions(); renderFacultyList(filterFaculty(getFaculty())); }

window.addEventListener('DOMContentLoaded', async ()=>{ if(typeof isAdminAuthenticated==='function' && !(await isAdminAuthenticated())){ if(typeof redirectToLogin==='function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeFaculty(); });

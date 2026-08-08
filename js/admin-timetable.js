const TIMETABLE_STORAGE_KEY = 'danlaWeCare.timetables';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';

function getTimetables(){ const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY); if(!raw) return []; try{ const p = JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveTimetables(list){ localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(list)); }
function getDepartments(){ try{ const p=JSON.parse(localStorage.getItem(DEPARTMENT_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ try{ const p=JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ try{ const p=JSON.parse(localStorage.getItem(SUBJECT_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ try{ const p=JSON.parse(localStorage.getItem(FACULTY_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDateTime(ts){ return new Date(ts).toLocaleString(); }

function createTimetableCard(entry){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = entry.id; card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${entry.academicYear} • ${entry.semester}</p>
      <h3>${entry.department} — ${entry.className} — ${entry.subject}</h3>
    </div>
    <span class="status-pill ${entry.status==='Active'?'status-active':'status-inactive'}">${entry.status}</span>
  </div>
  <p class="class-description">${entry.day} ${entry.timeSlot} • Room ${entry.room} • ${entry.faculty || 'Unassigned'}</p>
  <div class="class-details">
    <span>Year: ${entry.academicYear}</span>
    <span>Semester: ${entry.semester}</span>
    <span>Department: ${entry.department}</span>
    <span>Class: ${entry.className}</span>
    <span>Subject: ${entry.subject}</span>
    <span>Faculty: ${entry.faculty || 'Unassigned'}</span>
    <span>Day: ${entry.day}</span>
    <span>Time: ${entry.timeSlot}</span>
    <span>Room: ${entry.room}</span>
    <span>Created: ${formatDateTime(entry.createdAt)}</span>
    <span>Updated: ${formatDateTime(entry.updatedAt)}</span>
  </div>
  <div class="class-actions">
    <button class="button button-secondary edit-timetable">Edit</button>
    <button class="button button-secondary delete-timetable">Delete</button>
  </div>
`;
  return card; }

function renderTimetableList(list){ const el = document.getElementById('timetable-list'); el.innerHTML=''; if(list.length===0){ el.innerHTML='<p class="empty-state">No timetable entries yet.</p>'; return; } list.forEach(i=>el.appendChild(createTimetableCard(i))); }

function getSearchQuery(){ const input=document.getElementById('timetable-search-input'); return input?.value.trim().toLowerCase()||''; }

function filterTimetables(list){ const q=getSearchQuery(); if(!q) return list; return list.filter(e=>{ return [e.academicYear,e.semester,e.department,e.className,e.subject,e.faculty,e.day,e.timeSlot,e.room,e.status].some(v=>v?.toString().toLowerCase().includes(q)); }); }

function buildOptions(items, key='name'){ if(!items||items.length===0) return '<option value="">None</option>'; return items.map(it=>`<option value="${it[key]||it.name||it}">${it[key]||it.name||it}</option>`).join(''); }

function openTimetableForm(entry=null){ const departments=getDepartments(); const classes=getClasses(); const subjects=getSubjects(); const faculty=getFaculty(); const deptOptions=buildOptions(departments,'name'); const classOptions=buildOptions(classes,'name'); const subjectOptions=buildOptions(subjects,'name'); const facultyOptions=buildOptions(faculty,'name');

  const formHtml = `
    <form id="timetable-form" class="modal-form">
      <h2>${entry? 'Edit Entry':'New Timetable Entry'}</h2>

      <label for="tt-year">Academic Year</label>
      <input id="tt-year" name="tt-year" type="text" value="${entry?.academicYear||''}" required>

      <label for="tt-semester">Semester</label>
      <input id="tt-semester" name="tt-semester" type="text" value="${entry?.semester||''}" required>

      <label for="tt-department">Department</label>
      <select id="tt-department" name="tt-department">
        <option value="">Select a department</option>
        ${deptOptions}
      </select>

      <label for="tt-class">Class</label>
      <select id="tt-class" name="tt-class">
        <option value="">Select a class</option>
        ${classOptions}
      </select>

      <label for="tt-subject">Subject</label>
      <select id="tt-subject" name="tt-subject">
        <option value="">Select a subject</option>
        ${subjectOptions}
      </select>

      <label for="tt-faculty">Faculty</label>
      <select id="tt-faculty" name="tt-faculty">
        <option value="">Select a faculty</option>
        ${facultyOptions}
      </select>

      <label for="tt-day">Day</label>
      <select id="tt-day" name="tt-day">
        <option value="Monday" ${entry?.day==='Monday'?'selected':''}>Monday</option>
        <option value="Tuesday" ${entry?.day==='Tuesday'?'selected':''}>Tuesday</option>
        <option value="Wednesday" ${entry?.day==='Wednesday'?'selected':''}>Wednesday</option>
        <option value="Thursday" ${entry?.day==='Thursday'?'selected':''}>Thursday</option>
        <option value="Friday" ${entry?.day==='Friday'?'selected':''}>Friday</option>
        <option value="Saturday" ${entry?.day==='Saturday'?'selected':''}>Saturday</option>
      </select>

      <label for="tt-timeslot">Time Slot (e.g. 09:00-10:30)</label>
      <input id="tt-timeslot" name="tt-timeslot" type="text" value="${entry?.timeSlot||''}" required>

      <label for="tt-room">Room</label>
      <input id="tt-room" name="tt-room" type="text" value="${entry?.room||''}">

      <label for="tt-status">Status</label>
      <select id="tt-status" name="tt-status">
        <option value="Active" ${entry?.status==='Active'?'selected':''}>Active</option>
        <option value="Inactive" ${entry?.status==='Inactive'?'selected':''}>Inactive</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-timetable">Cancel</button>
        <button class="button button-primary" type="submit">${entry? 'Save changes':'Create entry'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML=`<div class="modal-card">${formHtml}</div>`; document.body.appendChild(modal);

  if(entry){ document.getElementById('tt-department').value = entry.department || ''; document.getElementById('tt-class').value = entry.className || ''; document.getElementById('tt-subject').value = entry.subject || ''; document.getElementById('tt-faculty').value = entry.faculty || ''; }

  document.getElementById('cancel-timetable')?.addEventListener('click', ()=>{ document.body.removeChild(modal); });

  const form = document.getElementById('timetable-form'); form.addEventListener('submit', e=>{ e.preventDefault(); saveTimetable(entry?.id); document.body.removeChild(modal); });
}

function parseTimeRange(range){ const parts = (range||'').split('-').map(s=>s.trim()); if(parts.length!==2) return null; const toMinutes = t=>{ const [h,m]=t.split(':').map(Number); return h*60+(m||0); }; const a=toMinutes(parts[0]); const b=toMinutes(parts[1]); if(Number.isNaN(a)||Number.isNaN(b)) return null; return {start:a,end:b}; }

function timesOverlap(a,b){ if(!a||!b) return false; return Math.max(a.start,b.start) < Math.min(a.end,b.end); }

function hasConflict(newEntry, existingList){ // check same day and overlapping time and (same class OR same faculty OR same room)
  const newRange = parseTimeRange(newEntry.timeSlot);
  for(const e of existingList){ if(e.id === newEntry.id) continue; if(e.day !== newEntry.day) continue; const range = parseTimeRange(e.timeSlot); if(!range||!newRange) continue; if(!timesOverlap(range,newRange)) continue; if(e.className === newEntry.className || (e.faculty && e.faculty === newEntry.faculty) || (e.room && e.room === newEntry.room)){
      return e; // return conflicting entry
    }
  }
  return null;
}

function saveTimetable(existingId=null){ const list = getTimetables(); const year = document.getElementById('tt-year').value.trim(); const semester = document.getElementById('tt-semester').value.trim(); const department = document.getElementById('tt-department').value; const className = document.getElementById('tt-class').value; const subject = document.getElementById('tt-subject').value; const faculty = document.getElementById('tt-faculty').value; const day = document.getElementById('tt-day').value; const timeSlot = document.getElementById('tt-timeslot').value.trim(); const room = document.getElementById('tt-room').value.trim(); const status = document.getElementById('tt-status').value; const ts = Date.now();

  if(!year||!semester||!department||!className||!subject||!day||!timeSlot) return;

  const newEntry = { id: existingId || `tt-${ts}`, academicYear: year, semester, department, className, subject, faculty, day, timeSlot, room, status, createdAt: existingId? undefined: ts, updatedAt: ts };

  const conflict = hasConflict(newEntry, list);
  if(conflict){ alert(`Scheduling conflict with entry: ${conflict.academicYear} ${conflict.semester} ${conflict.className} ${conflict.subject} at ${conflict.day} ${conflict.timeSlot} (room ${conflict.room})`); return; }

  if(existingId){ const updated = list.map(e=> e.id===existingId? {...e, academicYear:year, semester, department, className, subject, faculty, day, timeSlot, room, status, updatedAt:ts} : e); saveTimetables(updated); renderTimetableList(filterTimetables(updated)); return; }

  list.unshift(newEntry); saveTimetables(list); renderTimetableList(filterTimetables(list)); }

function removeTimetable(id){ const list=getTimetables(); const updated=list.filter(i=>i.id!==id); saveTimetables(updated); renderTimetableList(filterTimetables(updated)); }
function confirmDelete(id){ if(confirm('Delete this timetable entry?')) removeTimetable(id); }

function bindTimetableActions(){ const el=document.getElementById('timetable-list'); el.addEventListener('click', e=>{ const t=e.target; const card = t.closest('.class-card'); if(!card) return; const id=card.dataset.id; if(t.classList.contains('edit-timetable')){ const rec=getTimetables().find(r=>r.id===id); openTimetableForm(rec); } if(t.classList.contains('delete-timetable')){ confirmDelete(id); } }); }

function initializeTimetable(){ const newBtn=document.getElementById('new-timetable-button'); const search=document.getElementById('timetable-search-input'); const logout=document.getElementById('admin-logout-button'); newBtn?.addEventListener('click', ()=>openTimetableForm()); search?.addEventListener('input', ()=>renderTimetableList(filterTimetables(getTimetables()))); logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); }); bindTimetableActions(); renderTimetableList(filterTimetables(getTimetables())); }

window.addEventListener('DOMContentLoaded', async ()=>{ if(typeof isAdminAuthenticated==='function' && !(await isAdminAuthenticated())){ if(typeof redirectToLogin==='function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeTimetable(); });

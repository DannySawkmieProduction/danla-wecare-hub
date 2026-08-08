const EXAM_STORAGE_KEY = 'danlaWeCare.exams';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';

function getExams(){
  const raw = localStorage.getItem(EXAM_STORAGE_KEY);
  if(!raw) return [];
  try{ const parsed = JSON.parse(raw); return Array.isArray(parsed)? parsed: []; }catch(e){ return []; }
}

function saveExams(exams){ localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(exams)); }

function getDepartments(){ const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ const raw = localStorage.getItem(CLASS_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ const raw = localStorage.getItem(SUBJECT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ const raw = localStorage.getItem(FACULTY_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDateTime(timestamp){ return new Date(timestamp).toLocaleString([], { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }

function createExamCard(exam){
  const card = document.createElement('article');
  card.className = 'class-card';
  card.dataset.id = exam.id;
  card.innerHTML = `
    <div class="class-card-header">
      <div>
        <p class="eyebrow">${exam.examType} • ${exam.academicYear}</p>
        <h3>${exam.subject} — ${exam.className}</h3>
      </div>
      <span class="status-pill ${exam.status === 'Scheduled' ? 'status-active' : 'status-inactive'}">${exam.status}</span>
    </div>
    <p class="class-description">Date: ${exam.date} • ${exam.startTime} - ${exam.endTime} • Venue: ${exam.venue || 'TBD'}</p>
    <div class="class-details">
      <span>Department: ${exam.department || 'Unassigned'}</span>
      <span>Invigilator: ${exam.invigilator || 'Unassigned'}</span>
      <span>Max Marks: ${exam.maxMarks ?? '-'}</span>
      <span>Passing Marks: ${exam.passingMarks ?? '-'}</span>
      <span>Duration: ${exam.duration || '-'}</span>
      <span>Created: ${formatDateTime(exam.createdAt)}</span>
    </div>
    <div class="department-actions">
      <button class="button button-secondary edit-exam">Edit</button>
      <button class="button button-secondary delete-exam">Delete</button>
    </div>
  `;
  return card;
}

function renderExamList(exams){ const list = document.getElementById('exam-list'); list.innerHTML = ''; if(exams.length===0){ list.innerHTML = '<p class="empty-state">No examinations scheduled.</p>'; return; } exams.forEach(e=> list.appendChild(createExamCard(e))); }

function getSearchQuery(){ const input = document.getElementById('exam-search-input'); return input?.value.trim().toLowerCase() || ''; }

function filterExams(all){
  const query = getSearchQuery();
  const dept = document.getElementById('exam-filter-dept')?.value || '';
  const status = document.getElementById('exam-filter-status')?.value || '';
  let res = all.slice();
  if(dept) res = res.filter(r=> (r.department||'').toString()===dept);
  if(status) res = res.filter(r=> (r.status||'').toString()===status);
  if(query){ res = res.filter(r=> [r.examType,r.academicYear,r.semester,r.department,r.className,r.subject,r.invigilator,r.venue,r.status].some(v=> (v||'').toString().toLowerCase().includes(query))); }
  const sort = document.getElementById('exam-sort-select')?.value || 'date_desc';
  res.sort((a,b)=>{ const da = new Date(a.date + ' ' + (a.startTime||'00:00')); const db = new Date(b.date + ' ' + (b.startTime||'00:00')); return sort==='date_asc' ? da-db : db-da; });
  return res;
}

function buildDepartmentOptions(){ const deps = getDepartments(); const sel = document.getElementById('exam-filter-dept'); if(!sel) return; sel.innerHTML = '<option value="">All</option>' + deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''); }

function buildFormOptions(){ const deps = getDepartments(); const classes = getClasses(); const subjects = getSubjects(); const faculty = getFaculty();
  return {
    departments: deps,
    classes: classes,
    subjects: subjects,
    faculty: faculty
  };
}

function parseTimeToMinutes(t){ const [h,m]= (t||'00:00').split(':').map(Number); return h*60 + m; }
function timesOverlap(startA,endA,startB,endB){ return startA < endB && endA > startB; }

function hasConflict(candidate, existingExams, ignoreId=null){ // same class and subject on same date and overlapping time
  const cStart = parseTimeToMinutes(candidate.startTime); const cEnd = parseTimeToMinutes(candidate.endTime);
  return existingExams.some(e=>{
    if(ignoreId && e.id===ignoreId) return false;
    if(e.className !== candidate.className) return false;
    if(e.subject !== candidate.subject) return false;
    if(e.date !== candidate.date) return false;
    const s = parseTimeToMinutes(e.startTime); const en = parseTimeToMinutes(e.endTime);
    return timesOverlap(cStart,cEnd,s,en);
  });
}

function openExamForm(exam=null){
  const opts = buildFormOptions();
  const deptOptions = opts.departments.length? opts.departments.map(d=>`<option value="${d.name}">${d.name}</option>`).join('') : '<option value="">No departments</option>';
  const classOptions = opts.classes.length? opts.classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('') : '<option value="">No classes</option>';
  const subjectOptions = opts.subjects.length? opts.subjects.map(s=>`<option value="${s.name}">${s.name}</option>`).join('') : '<option value="">No subjects</option>';
  const facultyOptions = opts.faculty.length? opts.faculty.map(f=>`<option value="${f.name}">${f.name}</option>`).join('') : '<option value="">No faculty</option>';

  const html = `
    <form id="exam-form" class="modal-form">
      <h2>${exam? 'Edit Exam':'New Exam'}</h2>

      <label for="exam-type">Exam Type</label>
      <input id="exam-type" type="text" value="${exam?.examType||''}" required>

      <label for="exam-year">Academic Year</label>
      <input id="exam-year" type="text" value="${exam?.academicYear||''}" required>

      <label for="exam-semester">Semester</label>
      <input id="exam-semester" type="text" value="${exam?.semester||''}" required>

      <label for="exam-department">Department</label>
      <select id="exam-department"> <option value="">Select department</option> ${deptOptions}</select>

      <label for="exam-class">Class</label>
      <select id="exam-class"> <option value="">Select class</option> ${classOptions}</select>

      <label for="exam-subject">Subject</label>
      <select id="exam-subject"> <option value="">Select subject</option> ${subjectOptions}</select>

      <label for="exam-date">Date</label>
      <input id="exam-date" type="date" value="${exam?.date||''}" required>

      <label for="exam-start">Start Time</label>
      <input id="exam-start" type="time" value="${exam?.startTime||''}" required>

      <label for="exam-end">End Time</label>
      <input id="exam-end" type="time" value="${exam?.endTime||''}" required>

      <label for="exam-duration">Duration (minutes)</label>
      <input id="exam-duration" type="number" min="0" value="${exam?.duration||''}">

      <label for="exam-venue">Venue</label>
      <input id="exam-venue" type="text" value="${exam?.venue||''}">

      <label for="exam-invigilator">Invigilator</label>
      <select id="exam-invigilator"> <option value="">Select invigilator</option> ${facultyOptions}</select>

      <label for="exam-max">Maximum Marks</label>
      <input id="exam-max" type="number" min="0" value="${exam?.maxMarks||''}">

      <label for="exam-pass">Passing Marks</label>
      <input id="exam-pass" type="number" min="0" value="${exam?.passingMarks||''}">

      <label for="exam-status">Status</label>
      <select id="exam-status">
        <option value="Scheduled" ${exam?.status==='Scheduled'?'selected':''}>Scheduled</option>
        <option value="Completed" ${exam?.status==='Completed'?'selected':''}>Completed</option>
        <option value="Cancelled" ${exam?.status==='Cancelled'?'selected':''}>Cancelled</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-exam">Cancel</button>
        <button class="button button-primary" type="submit">${exam? 'Save changes':'Create exam'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card">${html}</div>`; document.body.appendChild(modal);

  if(exam){ document.getElementById('exam-department').value = exam.department || ''; document.getElementById('exam-class').value = exam.className || ''; document.getElementById('exam-subject').value = exam.subject || ''; document.getElementById('exam-invigilator').value = exam.invigilator || ''; }

  document.getElementById('cancel-exam')?.addEventListener('click', ()=>{ document.body.removeChild(modal); });

  const form = document.getElementById('exam-form'); form.addEventListener('submit', (ev)=>{ ev.preventDefault(); saveExam(exam?.id); document.body.removeChild(modal); });
}

function saveExam(existingId=null){
  const exams = getExams();
  const examType = document.getElementById('exam-type').value.trim();
  const academicYear = document.getElementById('exam-year').value.trim();
  const semester = document.getElementById('exam-semester').value.trim();
  const department = document.getElementById('exam-department').value;
  const className = document.getElementById('exam-class').value;
  const subject = document.getElementById('exam-subject').value;
  const date = document.getElementById('exam-date').value;
  const startTime = document.getElementById('exam-start').value;
  const endTime = document.getElementById('exam-end').value;
  const duration = document.getElementById('exam-duration').value;
  const venue = document.getElementById('exam-venue').value.trim();
  const invigilator = document.getElementById('exam-invigilator').value;
  const maxMarks = document.getElementById('exam-max').value;
  const passingMarks = document.getElementById('exam-pass').value;
  const status = document.getElementById('exam-status').value;
  const timestamp = Date.now();

  if(!examType || !academicYear || !semester || !className || !subject || !date || !startTime || !endTime){ alert('Please fill in the required fields.'); return; }

  const candidate = { examType, academicYear, semester, department, className, subject, date, startTime, endTime };
  if(hasConflict(candidate, exams, existingId)){ alert('Exam conflict: another exam for this class and subject is scheduled at overlapping time.'); return; }

  if(existingId){
    const updated = exams.map(x=> x.id===existingId? { ...x, examType, academicYear, semester, department, className, subject, date, startTime, endTime, duration, venue, invigilator, maxMarks: maxMarks? Number(maxMarks): undefined, passingMarks: passingMarks? Number(passingMarks): undefined, status, updatedAt: timestamp } : x);
    saveExams(updated); renderExamList(filterExams(updated)); return;
  }

  const newExam = { id:`exam-${timestamp}`, examType, academicYear, semester, department, className, subject, date, startTime, endTime, duration, venue, invigilator, maxMarks: maxMarks? Number(maxMarks):undefined, passingMarks: passingMarks? Number(passingMarks):undefined, status, createdAt: timestamp, updatedAt: timestamp };
  exams.unshift(newExam); saveExams(exams); renderExamList(filterExams(exams));
}

function removeExam(id){ const exams = getExams(); const updated = exams.filter(e=> e.id!==id); saveExams(updated); renderExamList(filterExams(updated)); }
function confirmDelete(id){ if(confirm('Delete this examination? This cannot be undone.')) removeExam(id); }

function bindExamActions(){ const list = document.getElementById('exam-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-exam')){ const exam = getExams().find(x=>x.id===id); openExamForm(exam); } if(target.classList.contains('delete-exam')){ confirmDelete(id); } }); }

function initializeExamManagement(){
  const newBtn = document.getElementById('new-exam-button'); const search = document.getElementById('exam-search-input'); const filterDept = document.getElementById('exam-filter-dept'); const filterStatus = document.getElementById('exam-filter-status'); const sortSelect = document.getElementById('exam-sort-select'); const logoutButton = document.getElementById('admin-logout-button');

  buildDepartmentOptions();
  newBtn?.addEventListener('click', ()=> openExamForm());
  search?.addEventListener('input', ()=> renderExamList(filterExams(getExams())));
  filterDept?.addEventListener('change', ()=> renderExamList(filterExams(getExams())));
  filterStatus?.addEventListener('change', ()=> renderExamList(filterExams(getExams())));
  sortSelect?.addEventListener('change', ()=> renderExamList(filterExams(getExams())));
  logoutButton?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); });

  bindExamActions(); renderExamList(filterExams(getExams()));
}

window.addEventListener('DOMContentLoaded', async ()=>{
  if(typeof isAdminAuthenticated === 'function' && !(await isAdminAuthenticated())){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; }
  initializeExamManagement();
});

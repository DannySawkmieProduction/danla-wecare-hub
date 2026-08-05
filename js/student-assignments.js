const ASSIGN_STORAGE_KEY = 'danlaWeCare.assignments';
const STUDENT_STORAGE_KEY = 'danlaWeCare.students';

function getAssignments(){ const raw = localStorage.getItem(ASSIGN_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getStudents(){ const raw = localStorage.getItem(STUDENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function createStudentCard(a, studentId){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = a.id; const submissions = a.submissions || []; const sub = submissions.find(s=> s.studentId===studentId); const status = sub? sub.status : 'Not Submitted'; const statusClass = status==='Submitted'? 'status-active' : 'status-inactive'; card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${a.type} • ${a.academicYear} ${a.semester? '• '+a.semester : ''}</p>
      <h3>${a.title}</h3>
    </div>
    <span class="status-pill ${statusClass}">${status}</span>
  </div>
  <p class="class-description">Subject: ${a.subject || '-'} • Due: ${a.dueDate || '-'} ${a.presentationSchedule? '• Presentation: '+a.presentationSchedule : ''}</p>
  <div class="class-details">
    <span>Class: ${a.className || '-'}</span>
    <span>Max Marks: ${a.maxMarks ?? '-'}</span>
    <span>Instructor: ${a.facultyName || '-'}</span>
    <span>Submissions: ${submissions.filter(s=> s.status==='Submitted').length}/${submissions.length || 0}</span>
  </div>
  <div class="department-actions">
    <button class="button button-secondary view-assign">View</button>
    <button class="button button-secondary submit-assign">Submit</button>
  </div>
`;
  return card; }

function renderStudentList(studentId, filterType, filterClass, query){ const list = document.getElementById('student-assign-list'); list.innerHTML=''; let items = getAssignments().filter(a=> a.status==='Published'); if(filterType) items = items.filter(i=> i.type===filterType); if(filterClass) items = items.filter(i=> i.className===filterClass); if(query) items = items.filter(i=> (i.title||'').toLowerCase().includes(query) || (i.subject||'').toLowerCase().includes(query)); // if studentId provided, show items for their class
  if(studentId){ const student = getStudents().find(s=> s.id===studentId); if(student?.className) items = items.filter(i=> i.className === student.className); }
  if(items.length===0){ list.innerHTML = '<p class="empty-state">No published items found.</p>'; return; } items.forEach(i=> list.appendChild(createStudentCard(i, studentId))); }

function buildStudentOptions(){ const students = getStudents(); const sel = document.getElementById('student-select'); const classes = Array.from(new Set(getStudents().map(s=> s.className).filter(Boolean))); const classSel = document.getElementById('student-filter-class'); if(sel) sel.innerHTML = '<option value="">Select student</option>' + students.map(s=>`<option value="${s.id}">${s.name} (${s.id})</option>`).join(''); if(classSel) classSel.innerHTML = '<option value="">All</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join(''); }

function viewAssignmentStudent(a, studentId){ let html = `<div class="modal-overlay"><div class="modal-card"><h2>${a.title}</h2><p>${a.description||''}</p><h3>Instructions</h3><p>${a.instructions||''}</p><p>Due: ${a.dueDate||'-'}</p><h3>Submissions</h3><div style="max-height:40vh;overflow:auto;padding:0.5rem">`;
  const submissions = a.submissions || []; const sub = submissions.find(s=> s.studentId===studentId);
  if(!sub) html += '<p class="empty-state">You have not submitted yet.</p>'; else html += `<div><strong>Status:</strong> ${sub.status} • Submitted: ${sub.submissionDate||'-'} • Remarks: ${sub.remarks||''} • File: ${sub.file||'-'} ${sub.fileData? '<a class="button button-secondary" href="#" id="download-sub-file">Download</a>' : ''}</div>`;
  html += `</div><div class="modal-actions"><button class="button button-secondary" id="close-student-view">Close</button></div></div></div>`;
  const wrap=document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild);
  document.getElementById('close-student-view')?.addEventListener('click', ()=> document.querySelector('.modal-overlay')?.remove());
  // wire download if available
  if(sub && sub.fileData){ document.getElementById('download-sub-file')?.addEventListener('click', (ev)=>{ ev.preventDefault(); const dataUrl = sub.fileData; const fileName = sub.file || 'download.bin'; fetch(dataUrl).then(r=> r.blob()).then(blob=>{ const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }); }); }
}

function openSubmitModal(a, studentId){ const modal = document.createElement('div'); modal.className='modal-overlay'; const html = `<div class="modal-card"><h2>Submit: ${a.title}</h2><form id="submit-form" class="modal-form"><label for="submit-file-input">Choose file</label><input id="submit-file-input" type="file" accept="*/*"><label for="submit-remarks">Remarks</label><input id="submit-remarks" type="text"><div class="modal-actions"><button class="button button-secondary" type="button" id="cancel-submit">Cancel</button><button class="button button-primary" type="submit">Submit</button></div></form></div>`; modal.innerHTML = html; document.body.appendChild(modal); document.getElementById('cancel-submit')?.addEventListener('click', ()=> document.body.removeChild(modal)); document.getElementById('submit-form')?.addEventListener('submit', (ev)=>{ ev.preventDefault(); const fileInput = document.getElementById('submit-file-input'); const remarks = document.getElementById('submit-remarks').value.trim(); const file = fileInput.files[0]; if(file){ const reader = new FileReader(); reader.onload = (e)=>{ const data = e.target.result; performSubmission(a.id, studentId, file.name, remarks, data); document.body.removeChild(modal); }; reader.readAsDataURL(file); } else { performSubmission(a.id, studentId, '', remarks, ''); document.body.removeChild(modal); } }); }

function performSubmission(assignId, studentId, fileName, remarks, fileData=''){ const items = getAssignments(); const item = items.find(i=> i.id===assignId); if(!item) return; item.submissions = item.submissions || []; const sub = item.submissions.find(s=> s.studentId===studentId); const ts = new Date().toISOString(); if(sub){ sub.status='Submitted'; sub.submissionDate = ts; sub.remarks = remarks; sub.file = fileName; sub.fileData = fileData; } else { item.submissions.push({ studentId, status:'Submitted', submissionDate: ts, remarks, file: fileName, fileData }); } saveAssignments(items); renderForCurrentSelection(); }

function bindStudentActions(studentId){ const list = document.getElementById('student-assign-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; const item = getAssignments().find(i=> i.id===id); if(target.classList.contains('view-assign')){ viewAssignmentStudent(item, studentId); } if(target.classList.contains('submit-assign')){ openSubmitModal(item, studentId); } }); }

function renderForCurrentSelection(){ const studentId = document.getElementById('student-select')?.value || ''; const type = document.getElementById('student-filter-type')?.value || ''; const cls = document.getElementById('student-filter-class')?.value || ''; const q = document.getElementById('student-assign-search')?.value.trim().toLowerCase() || ''; renderStudentList(studentId, type, cls, q); }

function initializeStudentAssignments(){ const logout = document.getElementById('student-logout-button'); const studentSel = document.getElementById('student-select'); const typeSel = document.getElementById('student-filter-type'); const classSel = document.getElementById('student-filter-class'); const search = document.getElementById('student-assign-search'); if(!isStudentAuthenticated()){ redirectToLogin(); return; }
  buildStudentOptions(); studentSel?.addEventListener('change', ()=> renderForCurrentSelection()); typeSel?.addEventListener('change', ()=> renderForCurrentSelection()); classSel?.addEventListener('change', ()=> renderForCurrentSelection()); search?.addEventListener('input', ()=> renderForCurrentSelection()); logout?.addEventListener('click', ()=>{ setStudentAuthenticated(false); redirectToLogin(); }); renderForCurrentSelection(); bindStudentActions(studentSel?.value || ''); }

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isStudentAuthenticated === 'function' && !isStudentAuthenticated()){ redirectToLogin(); return; } initializeStudentAssignments(); });
